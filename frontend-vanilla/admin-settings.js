import { db, doc, getDoc, setDoc, collection, getDocs, deleteDoc, query, where } from './firebase-config.js';
import { parseDMS, showToast } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  
  if (sessionStorage.getItem('isAdmin') !== 'true') {
    document.body.innerHTML = `
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:3rem; text-align:center; background:#f8fafc; min-height:100vh;">
        <i data-lucide="shield-alert" style="width:56px; height:56px; color:var(--rose-600); margin-bottom:1rem;"></i>
        <h2 style="font-size:1.5rem; font-weight:bold; color:var(--slate-800); margin-bottom:0.5rem;">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
        <p style="color: var(--slate-500); margin-bottom: 1.5rem;">กรุณาล็อกอินด้วยรหัสผ่านเจ้าหน้าที่ (Admin)</p>
        <a href="index.html" class="btn btn-primary" style="width:auto; padding:0.75rem 1.5rem;">กลับสู่หน้าแรก</a>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  const form = document.getElementById('settings-form');
  const inputReady = document.getElementById('ready-distance');
  const inputWarning = document.getElementById('warning-distance');
  const btnSave = document.getElementById('btn-save-settings');

  const settingsDocRef = doc(db, 'settings', 'systemSettings');

  async function loadSettings() {
    try {
      const snap = await getDoc(settingsDocRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.readyDistance) inputReady.value = data.readyDistance;
        if (data.warningDistance) inputWarning.value = data.warningDistance;
      }
    } catch (err) {
      console.error("Error loading settings:", err);
      alert('ไม่สามารถโหลดการตั้งค่าได้');
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const readyDist = parseInt(inputReady.value, 10);
    const warningDist = parseInt(inputWarning.value, 10);

    if (readyDist >= warningDist) {
      alert('ระยะเตือน (สีส้ม) ควรมีค่ามากกว่าระยะปกติ (สีเขียว)');
      return;
    }

    btnSave.disabled = true;
    const originalText = btnSave.innerHTML;
    btnSave.innerHTML = `<i data-lucide="loader" class="animate-spin" style="width: 18px; height: 18px;"></i> กำลังบันทึก...`;
    lucide.createIcons();

    try {
      await setDoc(settingsDocRef, {
        readyDistance: readyDist,
        warningDistance: warningDist,
        updatedAt: new Date()
      }, { merge: true });
      
      showToast('บันทึกการตั้งค่าเรียบร้อยแล้ว', 'success');
    } catch (err) {
      console.error("Error saving settings:", err);
      showToast('เกิดข้อผิดพลาดในการบันทึกการตั้งค่า', 'error');
    } finally {
      btnSave.disabled = false;
      btnSave.innerHTML = originalText;
      lucide.createIcons();
    }
  });

  // --- Tabs Management ---
  const tabDistance = document.getElementById('tab-distance');
  const tabRooms = document.getElementById('tab-rooms');
  const sectionDistance = document.getElementById('section-distance');
  const sectionRooms = document.getElementById('section-rooms');

  function switchTab(tab) {
    if (tab === 'distance') {
      if (tabDistance) {
        tabDistance.style.fontWeight = '700';
        tabDistance.style.color = 'var(--blue-600)';
        tabDistance.style.borderBottomColor = 'var(--blue-600)';
      }
      if (tabRooms) {
        tabRooms.style.fontWeight = '500';
        tabRooms.style.color = 'var(--slate-500)';
        tabRooms.style.borderBottomColor = 'transparent';
      }
      if (sectionDistance) sectionDistance.classList.remove('hidden');
      if (sectionRooms) sectionRooms.classList.add('hidden');
      
      // Update URL without reloading
      const url = new URL(window.location);
      url.searchParams.delete('tab');
      window.history.replaceState({}, '', url);
    } else if (tab === 'rooms') {
      if (tabRooms) {
        tabRooms.style.fontWeight = '700';
        tabRooms.style.color = 'var(--blue-600)';
        tabRooms.style.borderBottomColor = 'var(--blue-600)';
      }
      if (tabDistance) {
        tabDistance.style.fontWeight = '500';
        tabDistance.style.color = 'var(--slate-500)';
        tabDistance.style.borderBottomColor = 'transparent';
      }
      if (sectionRooms) sectionRooms.classList.remove('hidden');
      if (sectionDistance) sectionDistance.classList.add('hidden');
      
      // Update URL without reloading
      const url = new URL(window.location);
      url.searchParams.set('tab', 'rooms');
      window.history.replaceState({}, '', url);
    }
  }

  if (tabDistance) tabDistance.addEventListener('click', () => switchTab('distance'));
  if (tabRooms) tabRooms.addEventListener('click', () => switchTab('rooms'));
  
  // Parse query params to auto-switch tab
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tab') === 'rooms') {
    switchTab('rooms');
  }

  // --- Room Management ---
  const roomsTableBody = document.getElementById('rooms-table-body');
  const btnAddRoom = document.getElementById('btn-add-room');
  const searchRoomInput = document.getElementById('search-room-input');
  
  const roomModal = document.getElementById('room-modal');
  const btnCloseRoomModal = document.getElementById('btn-close-room-modal');
  const btnCancelRoom = document.getElementById('btn-cancel-room');
  const roomForm = document.getElementById('room-form');
  
  const inputRoomId = document.getElementById('room-id-input');
  const inputRoomCoords = document.getElementById('room-coords-input');
  const roomModalTitle = document.getElementById('room-modal-title');
  
  let roomsData = [];
  let isEditingRoom = false;

  async function loadRooms() {
    try {
      const qRooms = query(collection(db, 'rooms'));
      const snapRooms = await getDocs(qRooms);
      const dbRooms = snapRooms.docs.map(doc => ({ id: decodeURIComponent(doc.id), ...doc.data() }));
      
      const qSchedules = query(collection(db, 'schedules'));
      const snapSchedules = await getDocs(qSchedules);
      const scheduleRooms = new Set();
      snapSchedules.forEach(doc => {
        const room = doc.data().room;
        if (room) scheduleRooms.add(room);
      });
      
      const mergedRooms = [...dbRooms];
      scheduleRooms.forEach(room => {
        if (!mergedRooms.find(r => r.id === room)) {
          mergedRooms.push({ id: room, latitude: null, longitude: null });
        }
      });
      
      roomsData = mergedRooms;
      roomsData.sort((a, b) => a.id.localeCompare(b.id, 'th'));
      renderRooms();
    } catch(err) {
      console.error("Error loading rooms", err);
      roomsTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--rose-500);">โหลดข้อมูลห้องเรียนไม่สำเร็จ</td></tr>`;
    }
  }

  function renderRooms(filterText = '') {
    const filteredRooms = roomsData.filter(r => r.id.toLowerCase().includes(filterText.toLowerCase()));

    if (filteredRooms.length === 0) {
      roomsTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:3rem; color:var(--slate-400);">ไม่มีข้อมูลห้องเรียน หรือไม่พบข้อมูลที่ค้นหา</td></tr>`;
      return;
    }
    
    let html = '';
    filteredRooms.forEach((r, index) => {
      const lat = r.latitude != null ? r.latitude : (r.lat || null);
      const lng = r.longitude != null ? r.longitude : (r.lng || null);
      
      const hasCoords = (lat !== null && lng !== null);
      const coordsDisplay = hasCoords 
        ? `<div style="display: inline-flex; align-items: center; gap: 0.5rem; background: var(--slate-100); color: var(--slate-700); padding: 0.375rem 0.875rem; border-radius: 2rem; font-family: monospace; font-size: 0.8125rem; border: 1px solid var(--slate-200);"><i data-lucide="map-pin" style="width:14px; height:14px; color:var(--emerald-600);"></i>${lat}, ${lng}</div>`
        : `<div style="display: inline-flex; align-items: center; gap: 0.375rem; background: var(--rose-50); color: var(--rose-600); padding: 0.375rem 0.875rem; border-radius: 2rem; font-size: 0.8125rem; font-weight: 600; border: 1px solid var(--rose-100);"><i data-lucide="alert-circle" style="width:14px; height:14px;"></i>ยังไม่มีพิกัด</div>`;
        
      let actionBtns = `
        <button onclick="window.editRoom('${r.id}')" title="แก้ไข/เพิ่มพิกัด" style="background: var(--blue-50); color: var(--blue-600); border: 1px solid var(--blue-100); width: 34px; height: 34px; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center;" onmouseenter="this.style.background='var(--blue-100)'" onmouseleave="this.style.background='var(--blue-50)'">
          <i data-lucide="edit-3" style="width:15px; height:15px;"></i>
        </button>`;
      
      if (hasCoords) {
        actionBtns += `
        <button onclick="window.deleteCoords('${r.id}')" title="ลบเฉพาะพิกัด" style="background: var(--amber-50); color: var(--amber-700); border: 1px solid var(--amber-200); width: 34px; height: 34px; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s; margin-left: 0.375rem; display: inline-flex; align-items: center; justify-content: center;" onmouseenter="this.style.background='var(--amber-100)'" onmouseleave="this.style.background='var(--amber-50)'">
          <i data-lucide="map-pin-off" style="width:15px; height:15px;"></i>
        </button>`;
      }
      
      actionBtns += `
        <button onclick="window.deleteRoom('${r.id}')" title="ลบห้องและตารางสอน" style="background: var(--rose-50); color: var(--rose-600); border: 1px solid var(--rose-100); width: 34px; height: 34px; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s; margin-left: 0.375rem; display: inline-flex; align-items: center; justify-content: center;" onmouseenter="this.style.background='var(--rose-100)'" onmouseleave="this.style.background='var(--rose-50)'">
          <i data-lucide="trash-2" style="width:15px; height:15px;"></i>
        </button>`;
      
      html += `
        <tr style="border-bottom: 1px solid var(--slate-100); transition: background-color 0.15s; ${!hasCoords ? 'background-color: rgba(255, 241, 242, 0.4);' : ''}" onmouseover="this.style.background='var(--slate-50)'" onmouseout="this.style.background='${!hasCoords ? 'rgba(255, 241, 242, 0.4)' : 'transparent'}'">
          <td style="padding: 1rem 1.5rem; text-align: center; color: var(--slate-500); font-weight: 600;">${index + 1}</td>
          <td style="padding: 1rem 1.5rem; font-weight: 700; color: var(--slate-800); font-size: 0.9375rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 2.25rem; height: 2.25rem; border-radius: 0.625rem; background: ${hasCoords ? 'var(--emerald-50)' : 'var(--rose-50)'}; color: ${hasCoords ? 'var(--emerald-600)' : 'var(--rose-500)'}; display: flex; align-items: center; justify-content: center; border: 1px solid ${hasCoords ? 'var(--emerald-100)' : 'var(--rose-100)'};">
                <i data-lucide="door-closed" style="width:18px; height:18px;"></i>
              </div>
              <span>${r.id}</span>
            </div>
          </td>
          <td style="padding: 1rem 1.5rem;">${coordsDisplay}</td>
          <td style="padding: 1rem 1.5rem; text-align: right; white-space: nowrap;">
            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
              ${actionBtns}
            </div>
          </td>
        </tr>
      `;
    });
    
    roomsTableBody.innerHTML = html;
    lucide.createIcons();
  }
  
  if (searchRoomInput) {
    searchRoomInput.addEventListener('input', (e) => {
      renderRooms(e.target.value);
    });
  }
  
  function openRoomModal(roomId = null) {
    if (roomId) {
      isEditingRoom = true;
      roomModalTitle.innerHTML = `<i data-lucide="edit" class="text-blue-600" style="width:20px; height:20px;"></i> แก้ไขห้องเรียน`;
      const r = roomsData.find(x => x.id === roomId);
      inputRoomId.value = roomId;
      inputRoomId.readOnly = true;
      inputRoomId.style.background = 'var(--slate-50)';
      
      const lat = r.latitude || r.lat || '';
      const lng = r.longitude || r.lng || '';
      inputRoomCoords.value = (lat && lng) ? `${lat}, ${lng}` : '';
    } else {
      isEditingRoom = false;
      roomModalTitle.innerHTML = `<i data-lucide="plus-circle" class="text-emerald-600" style="width:20px; height:20px;"></i> เพิ่มห้องเรียนใหม่`;
      roomForm.reset();
      inputRoomId.readOnly = false;
      inputRoomId.style.background = 'white';
    }
    roomModal.classList.remove('hidden');
    roomModal.style.display = 'flex';
    lucide.createIcons();
  }

  function closeRoomModal() {
    roomModal.classList.add('hidden');
    roomModal.style.display = 'none';
  }

  if (btnAddRoom) btnAddRoom.addEventListener('click', () => openRoomModal());
  if (btnCloseRoomModal) btnCloseRoomModal.addEventListener('click', closeRoomModal);
  if (btnCancelRoom) btnCancelRoom.addEventListener('click', closeRoomModal);

  roomForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rId = inputRoomId.value.trim();
    const coordsRaw = inputRoomCoords.value.trim();
    
    if (!rId || !coordsRaw) return;

    let lat = NaN, lng = NaN;
    const parsedDms = parseDMS(coordsRaw);
    if (parsedDms) {
      lat = parsedDms.lat;
      lng = parsedDms.lng;
    } else {
      const parts = coordsRaw.split(',');
      if (parts.length === 2) {
        lat = parseFloat(parts[0]);
        lng = parseFloat(parts[1]);
      }
    }
    
    if (isNaN(lat) || isNaN(lng)) {
      showToast('รูปแบบพิกัดไม่ถูกต้อง', 'error');
      return;
    }

    const btnSubmit = document.getElementById('btn-save-room');
    btnSubmit.disabled = true;
    
    try {
      await setDoc(doc(db, 'rooms', encodeURIComponent(rId)), {
        latitude: lat,
        longitude: lng
      }, { merge: true });
      
      closeRoomModal();
      showToast('บันทึกห้องเรียนเรียบร้อยแล้ว', 'success');
      loadRooms();
    } catch(err) {
      console.error("Error saving room", err);
      showToast('เกิดข้อผิดพลาดในการบันทึกห้องเรียน', 'error');
    } finally {
      btnSubmit.disabled = false;
    }
  });

  // --- Delete Modal Logic ---
  const deleteModal = document.getElementById('delete-modal');
  const btnCancelDelete = document.getElementById('btn-cancel-delete');
  const btnConfirmDelete = document.getElementById('btn-confirm-delete');
  const deleteModalTitle = document.getElementById('delete-modal-title');
  const deleteModalText = document.getElementById('delete-modal-text');
  
  let itemToDelete = null;
  let deleteActionType = ''; // 'coords' or 'room'

  window.editRoom = (id) => openRoomModal(id);
  
  window.deleteCoords = (id) => {
    itemToDelete = id;
    deleteActionType = 'coords';
    deleteModalTitle.textContent = 'ยืนยันการลบพิกัด';
    deleteModalText.textContent = `คุณแน่ใจหรือไม่ว่าต้องการลบพิกัดของห้องเรียน "${id}" ?`;
    deleteModal.classList.remove('hidden');
    deleteModal.style.display = 'flex';
  };
  
  window.deleteRoom = (id) => {
    itemToDelete = id;
    deleteActionType = 'room';
    deleteModalTitle.textContent = 'ยืนยันการลบห้องและตารางสอน';
    deleteModalText.textContent = `ระวัง! คุณกำลังจะลบห้อง "${id}" รวมถึงวิชาที่สอนในห้องนี้ทั้งหมดออกจากตารางสอนด้วย ยืนยันหรือไม่?`;
    deleteModal.classList.remove('hidden');
    deleteModal.style.display = 'flex';
  };

  btnCancelDelete.addEventListener('click', () => {
    deleteModal.classList.add('hidden');
    deleteModal.style.display = 'none';
    itemToDelete = null;
    deleteActionType = '';
  });

  btnConfirmDelete.addEventListener('click', async () => {
    if (!itemToDelete) return;
    
    const originalText = btnConfirmDelete.innerHTML;
    btnConfirmDelete.disabled = true;
    btnConfirmDelete.innerHTML = `<i data-lucide="loader" class="animate-spin" style="width: 18px; height: 18px;"></i>`;
    lucide.createIcons();

    try {
      if (deleteActionType === 'coords') {
        // Delete only coords from rooms collection
        await deleteDoc(doc(db, 'rooms', encodeURIComponent(itemToDelete)));
        showToast('ลบพิกัดเรียบร้อยแล้ว', 'success');
      } else if (deleteActionType === 'room') {
        // Delete coords if exist
        await deleteDoc(doc(db, 'rooms', encodeURIComponent(itemToDelete)));
        // Delete all schedules having this room
        const qSched = query(collection(db, 'schedules'), where('room', '==', itemToDelete));
        const snapSched = await getDocs(qSched);
        
        const deletePromises = [];
        snapSched.forEach(docSnap => {
          deletePromises.push(deleteDoc(doc(db, 'schedules', docSnap.id)));
        });
        await Promise.all(deletePromises);
        
        showToast('ลบห้องและตารางสอนเรียบร้อยแล้ว', 'success');
      }
      
      loadRooms();
    } catch(err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
    } finally {
      btnConfirmDelete.disabled = false;
      btnConfirmDelete.innerHTML = originalText;
      deleteModal.classList.add('hidden');
      deleteModal.style.display = 'none';
      itemToDelete = null;
      deleteActionType = '';
      lucide.createIcons();
    }
  });

  loadSettings();
  loadRooms();
});
