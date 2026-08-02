import { initAuth } from './auth.js';
import { getQueryParam, calculateDistance, compressImage, loadCurrentSubject, isClassEnded, checkAndBlockLineBrowser } from './utils.js';
import { db, doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc } from './firebase-config.js';

const STATUS_LOCATING = 'locating';
const STATUS_READY = 'ready';
const STATUS_WARNING = 'warning';
const STATUS_BLOCKED = 'blocked';
const STATUS_ERROR = 'error';

const DEFAULT_COORDS = { lat: 13.7298, lng: 100.7782 };

document.addEventListener('DOMContentLoaded', () => {
  if (checkAndBlockLineBrowser()) return;
  lucide.createIcons();

  const roomId = getQueryParam('room') || 'Unknown';
  document.getElementById('room-id-display').textContent = roomId;
  
  let activeSchedule = null;
  loadCurrentSubject(roomId, 'subject-display', 'time-display', 'time-container').then(sched => {
    activeSchedule = sched;
  });

  let currentUser = null;
  let currentStatus = STATUS_LOCATING;
  let currentDistance = null;
  let photoFile = null;

  const phoneInput = document.getElementById('phone-input');
  const phoneBoxes = document.querySelectorAll('.phone-box');
  const photoInput = document.getElementById('photo-input');
  const uploadArea = document.getElementById('upload-area');
  const uploadIconContainer = document.getElementById('upload-icon-container');
  const btnSubmit = document.getElementById('btn-submit');
  const statusContainer = document.getElementById('status-container');

  initAuth(async (user) => {
    if (!user) {
      window.location.href = `index.html?room=${roomId}`;
    } else {
      currentUser = user;
      document.getElementById('user-name').textContent = user.displayName;
      document.getElementById('user-email').textContent = user.email;
      
      const hasOngoing = await checkActiveSessions(user.uid);
      if (!hasOngoing) {
        fetchLocationAndCompare();
      }
    }
  });

  async function checkActiveSessions(uid) {
    const q = query(collection(db, 'sessions'), where('userId', '==', uid), where('status', '==', 'checked_in'));
    const snap = await getDocs(q);
    
    let hasOngoingClass = false;
    let ongoingSubject = '';

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const checkInDate = data.checkInTime ? data.checkInTime.toDate() : new Date();
      if (isClassEnded(data.endTime, checkInDate)) {
        // หมดเวลาแล้ว ให้ทำ Auto check-out
        await updateDoc(docSnap.ref, {
          status: 'auto_checked_out',
          checkOutTime: serverTimestamp()
        });
      } else {
        hasOngoingClass = true;
        ongoingSubject = data.subject || 'วิชาอื่น';
      }
    }

    if (hasOngoingClass) {
      renderStatus(STATUS_BLOCKED, null, `คุณยังไม่ได้ลงชื่อออกจากวิชา ${ongoingSubject}`);
      btnSubmit.disabled = true;
      phoneInput.disabled = true;
      uploadArea.classList.add('disabled');
    }
    return hasOngoingClass;
  }

  let locatingInterval = null;

  function stopLocatingProgress() {
    if (locatingInterval) {
      clearInterval(locatingInterval);
      locatingInterval = null;
    }
  }

  function startLocatingProgress() {
    stopLocatingProgress();
    let percent = 5;
    const progressBar = document.getElementById('locating-progress-bar');
    const percentText = document.getElementById('locating-percent');
    
    if (progressBar) progressBar.style.width = '5%';
    if (percentText) percentText.textContent = '5%';

    locatingInterval = setInterval(() => {
      if (percent < 90) {
        percent += Math.floor(Math.random() * 6) + 3;
        if (percent > 90) percent = 90;
        const bar = document.getElementById('locating-progress-bar');
        const text = document.getElementById('locating-percent');
        if (bar) bar.style.width = `${percent}%`;
        if (text) text.textContent = `${percent}%`;
      }
    }, 350);
  }

  function renderStatus(status, dist = null, errorMsg = '') {
    stopLocatingProgress();
    currentStatus = status;
    statusContainer.innerHTML = ''; // clear

    let div = document.createElement('div');
    div.className = `status-banner status-${status}`;
    if (status === STATUS_LOCATING) {
      div.style.width = '100%';
    }

    let iconHTML = '';
    let textHTML = '';

    if (status === STATUS_LOCATING) {
      iconHTML = `<i data-lucide="map-pin" style="animation: pulse 1.5s infinite; color: var(--primary-600); width: 22px; height: 22px;"></i>`;
      textHTML = `
        <div style="width: 100%;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
            <span style="font-size:0.875rem; font-weight:600; color: var(--primary-900);">กำลังรับพิกัดตำแหน่งของคุณ...</span>
            <span id="locating-percent" style="font-size:0.75rem; font-weight:700; color: var(--primary-600);">5%</span>
          </div>
          <div style="width: 100%; height: 8px; background-color: var(--primary-100); border-radius: 99px; overflow: hidden; position: relative;">
            <div id="locating-progress-bar" style="width: 5%; height: 100%; background: var(--grad-primary); border-radius: 99px; transition: width 0.3s ease;"></div>
          </div>
        </div>
      `;
    } else if (status === STATUS_READY) {
      iconHTML = `<i data-lucide="check-circle-2"></i>`;
      textHTML = `<span style="font-size:0.875rem; font-weight:bold; color: var(--emerald-700);">คุณอยู่ในบริเวณห้องเรียน</span>`;
    } else if (status === STATUS_WARNING) {
      iconHTML = `<i data-lucide="alert-circle"></i>`;
      textHTML = `<span style="font-size:0.875rem; font-weight:300; color: var(--slate-800);">
                    <span style="font-weight:bold; color: var(--amber-600);">คำเตือน:</span> ตำแหน่งของคุณอยู่ห่างจากห้องเรียนมากเกินไป (ห่าง ${dist} เมตร)
                  </span>`;
    } else if (status === STATUS_BLOCKED) {
      iconHTML = `<i data-lucide="alert-circle"></i>`;
      textHTML = errorMsg ? `<span style="font-size:0.875rem; color: var(--rose-700); display:block;">
                    <span style="font-weight:bold;">ไม่สามารถดำเนินการต่อได้</span><br/>
                    <span style="font-weight:500;">${errorMsg}</span>
                  </span>` 
                : `<span style="font-size:0.875rem; color: var(--rose-700); display:block;">
                    <span style="font-weight:bold;">ไม่สามารถดำเนินการต่อได้</span><br/>
                    <span style="font-weight:300;">เนื่องจากคุณไม่ได้อยู่ในบริเวณของห้องเรียน (ห่าง ${dist} เมตร)</span><br/>
                    <span style="font-weight:300; font-size:0.75rem;">*โปรดลองอีกครั้งเมื่ออยู่ในห้องเรียน</span>
                  </span>`;
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

    const phone = phoneInput.value || '';
    const isPhoneComplete = phone.length === 10;
    btnSubmit.disabled = isBlocked || !isPhoneComplete || !photoFile;
  }

  if (phoneInput && phoneBoxes.length === 10) {
    phoneInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
      const val = e.target.value;
      
      phoneBoxes.forEach((box, index) => {
        box.textContent = val[index] || '';
        if (index === val.length) {
          box.classList.add('active');
          box.classList.remove('filled');
        } else if (index < val.length) {
          box.classList.remove('active');
          box.classList.add('filled');
        } else {
          box.classList.remove('active', 'filled');
        }
      });
  
      updateFormState();
    });
    
    phoneInput.addEventListener('focus', () => {
      const val = phoneInput.value || '';
      const activeIndex = Math.min(val.length, 9);
      phoneBoxes.forEach(b => b.classList.remove('active'));
      phoneBoxes[activeIndex].classList.add('active');
    });
  
    phoneInput.addEventListener('blur', () => {
      phoneBoxes.forEach(b => b.classList.remove('active'));
    });
  }

  async function fetchLocationAndCompare() {
    renderStatus(STATUS_LOCATING);
    startLocatingProgress();
    try {
      const roomDoc = await getDoc(doc(db, 'rooms', roomId));
      let isValidRoom = roomDoc.exists();
      let targetCoords = DEFAULT_COORDS;

      if (isValidRoom) {
        const roomData = roomDoc.data();
        if (roomData.latitude && roomData.longitude) {
          targetCoords = { lat: roomData.latitude, lng: roomData.longitude };
        }
      } else {
        // Fallback: Check if there's any schedule
        const qSchedules = query(collection(db, 'schedules'), where('room', '==', roomId));
        const snapSchedules = await getDocs(qSchedules);
        if (!snapSchedules.empty) {
          isValidRoom = true;
        }
      }

      if (!isValidRoom) {
        renderStatus(STATUS_ERROR, null, 'ไม่พบห้องเรียนนี้ในระบบ');
        return;
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

      const reader = new FileReader();
      reader.onload = (evt) => {
        document.getElementById('photo-preview').src = evt.target.result;
        document.getElementById('photo-preview-container').classList.remove('hidden');
        uploadArea.classList.add('hidden');
      };
      reader.readAsDataURL(photoFile);
    }
    updateFormState();
  });

  const btnRetakePhoto = document.getElementById('btn-retake-photo');
  if (btnRetakePhoto) {
    btnRetakePhoto.addEventListener('click', () => {
      photoFile = null;
      photoInput.value = '';
      document.getElementById('photo-preview-container').classList.add('hidden');
      uploadArea.classList.remove('hidden');
      updateFormState();
    });
  }

  btnSubmit.addEventListener('click', async () => {
    if (!currentUser || !phoneInput.value || !photoFile) return;
    if (phoneInput.value.length < 10) {
      alert('กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก');
      return;
    }

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
        status: 'checked_in',
        scheduleId: activeSchedule ? activeSchedule.id : null,
        subject: activeSchedule ? activeSchedule.subject : 'Unknown',
        endTime: activeSchedule ? activeSchedule.endTime : null
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
