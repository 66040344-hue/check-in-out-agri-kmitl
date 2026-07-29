import { initAuth } from './auth.js';
import { getQueryParam, calculateDistance, compressImage } from './utils.js';
import { db, doc, getDoc, collection, addDoc, serverTimestamp } from './firebase-config.js';

const STATUS_LOCATING = 'locating';
const STATUS_READY = 'ready';
const STATUS_WARNING = 'warning'; 
const STATUS_BLOCKED = 'blocked'; 
const STATUS_ERROR = 'error';

const DEFAULT_COORDS = { lat: 13.7298, lng: 100.7782 }; 

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  
  const roomId = getQueryParam('room') || 'Unknown';
  document.getElementById('room-id-display').textContent = roomId;
  
  let currentUser = null;
  let currentStatus = STATUS_LOCATING;
  let currentDistance = null;
  let photoFile = null;

  const phoneInput = document.getElementById('phone-input');
  const photoInput = document.getElementById('photo-input');
  const uploadArea = document.getElementById('upload-area');
  const uploadIconContainer = document.getElementById('upload-icon-container');
  const btnSubmit = document.getElementById('btn-submit');
  const statusContainer = document.getElementById('status-container');
  
  initAuth((user) => {
    if (!user) {
      window.location.href = `index.html?room=${roomId}`;
    } else {
      currentUser = user;
      document.getElementById('user-name').textContent = user.displayName.split(' ')[0];
      fetchLocationAndCompare();
    }
  });

  function renderStatus(status, dist = null, errorMsg = '') {
    currentStatus = status;
    statusContainer.innerHTML = ''; // clear

    let div = document.createElement('div');
    div.className = `status-banner status-${status}`;
    
    let iconHTML = '';
    let textHTML = '';

    if (status === STATUS_LOCATING) {
      iconHTML = `<i data-lucide="map-pin" style="animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></i>`;
      textHTML = `<span style="font-size:0.875rem; font-weight:500;">กำลังตรวจสอบพิกัด...</span>`;
    } else if (status === STATUS_READY) {
      iconHTML = `<i data-lucide="check-circle-2"></i>`;
      textHTML = `<span style="font-size:0.875rem; font-weight:500;">คุณอยู่ในบริเวณห้องเรียน (ห่าง ${dist} เมตร)</span>`;
    } else if (status === STATUS_WARNING) {
      iconHTML = `<i data-lucide="alert-circle"></i>`;
      textHTML = `<span style="font-size:0.875rem; font-weight:500;">คำเตือน: ตำแหน่งของคุณอยู่ห่างจากห้องเรียนมากเกินไป (ห่าง ${dist} เมตร)</span>`;
    } else if (status === STATUS_BLOCKED) {
      iconHTML = `<i data-lucide="alert-circle"></i>`;
      textHTML = `<span style="font-size:0.875rem; font-weight:500;">คุณไม่ได้อยู่ในบริเวณของห้องเรียน (ห่าง ${dist} เมตร)<br/>*โปรดลองอีกครั้งเมื่ออยู่ในห้องเรียน</span>`;
    } else if (status === STATUS_ERROR) {
      iconHTML = `<i data-lucide="alert-circle"></i>`;
      textHTML = `<span style="font-size:0.875rem; font-weight:500;">${errorMsg}</span>`;
    }

    div.innerHTML = `
      <div style="flex-shrink:0;">${iconHTML}</div>
      <div>${textHTML}</div>
    `;
    statusContainer.appendChild(div);
    lucide.createIcons();

    updateFormState();
  }

  function updateFormState() {
    const isBlocked = (currentStatus === STATUS_BLOCKED || currentStatus === STATUS_ERROR || currentStatus === STATUS_LOCATING);
    
    phoneInput.disabled = isBlocked;
    
    if (isBlocked) {
      uploadArea.classList.add('disabled');
    } else {
      uploadArea.classList.remove('disabled');
    }

    const phone = phoneInput.value.trim();
    btnSubmit.disabled = isBlocked || !phone || !photoFile;
  }

  async function fetchLocationAndCompare() {
    renderStatus(STATUS_LOCATING);
    try {
      let targetCoords = DEFAULT_COORDS;
      const roomDoc = await getDoc(doc(db, 'rooms', roomId));
      if (roomDoc.exists()) {
        const roomData = roomDoc.data();
        if (roomData.lat && roomData.lng) {
          targetCoords = { lat: roomData.lat, lng: roomData.lng };
        }
      }

      if (!navigator.geolocation) {
        renderStatus(STATUS_ERROR, null, 'เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const dist = Math.round(calculateDistance(
            position.coords.latitude,
            position.coords.longitude,
            targetCoords.lat,
            targetCoords.lng
          ));
          currentDistance = dist;

          if (dist <= 15) {
            renderStatus(STATUS_READY, dist);
          } else if (dist <= 24) {
            renderStatus(STATUS_WARNING, dist);
          } else {
            renderStatus(STATUS_BLOCKED, dist);
          }
        },
        (error) => {
          console.error(error);
          renderStatus(STATUS_ERROR, null, 'โปรดอนุญาตการเข้าถึงตำแหน่งของคุณเพื่อใช้งาน');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } catch (err) {
      console.error(err);
      renderStatus(STATUS_ERROR, null, 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้');
    }
  }

  phoneInput.addEventListener('input', updateFormState);

  photoInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      photoFile = e.target.files[0];
      
      uploadArea.classList.add('has-file');
      uploadIconContainer.innerHTML = `
        <i data-lucide="image" style="width: 32px; height: 32px; margin-bottom: 0.5rem; display: inline-block;"></i>
        <span style="display:block; font-weight:500;">แนบรูปภาพแล้ว</span>
        <span style="font-size:0.75rem; margin-top:0.25rem; display:block;">แตะเพื่อถ่ายใหม่</span>
      `;
      lucide.createIcons();
    }
    updateFormState();
  });

  btnSubmit.addEventListener('click', async () => {
    if (!currentUser || !phoneInput.value || !photoFile) return;
    
    btnSubmit.disabled = true;
    const oldText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = 'กำลังบันทึก...';

    try {
      const base64Photo = await compressImage(photoFile);
      
      await addDoc(collection(db, 'sessions'), {
        roomId,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: currentUser.displayName,
        phone: phoneInput.value,
        distance: currentDistance,
        photoBase64: base64Photo,
        checkInTime: serverTimestamp(),
        checkOutTime: null,
        status: 'checked_in'
      });
      
      document.getElementById('form-screen').classList.add('hidden');
      document.getElementById('success-screen').classList.remove('hidden');
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่');
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = oldText;
    }
  });
});
