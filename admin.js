import { initAuth } from './auth.js';
import { db, collection, addDoc, getDocs, deleteDoc, doc, setDoc, updateDoc, query, orderBy, where } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  
  let currentUser = null;
  let schedulesData = [];
  let roomsData = [];
  let excelFile = null;

  const excelInput = document.getElementById('excel-file');
  const fileNameDisplay = document.getElementById('file-name');
  const btnImport = document.getElementById('btn-import');
  const importText = document.getElementById('import-text');
  
  const scheduleList = document.getElementById('schedule-list');
  const scheduleCount = document.getElementById('schedule-count');
  const btnPrintAll = document.getElementById('btn-print-all');
  const btnAddNew = document.getElementById('btn-add-new');
  const printArea = document.getElementById('print-area');
  
  const modal = document.getElementById('edit-modal');
  const form = document.getElementById('edit-form');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  const btnSaveModal = document.getElementById('btn-save-modal');
  const modalTitle = document.getElementById('modal-title');
  
  // Admin Session Check
  if (sessionStorage.getItem('isAdmin') !== 'true') {
    document.body.innerHTML = `
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:1.5rem; text-align:center;">
        <p style="color: var(--rose-600); margin-bottom: 1rem;">คุณไม่มีสิทธิ์เข้าถึงหน้านี้ กรุณาล็อกอินด้วยรหัสผ่านเจ้าหน้าที่</p>
        <a href="index.html" style="color: var(--blue-600); text-decoration: underline;">กลับหน้าแรก</a>
      </div>
    `;
    return;
  }
  
  // ถ้าเป็น Admin ให้ดึงข้อมูลเลย
  fetchData();

  async function fetchData() {
    try {
      const qSchedules = query(collection(db, 'schedules'), orderBy('room'));
      const snapSchedules = await getDocs(qSchedules);
      schedulesData = snapSchedules.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const qRooms = query(collection(db, 'rooms'));
      const snapRooms = await getDocs(qRooms);
      roomsData = snapRooms.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      renderSchedules();
    } catch (error) {
      console.error("Error fetching data", error);
      alert('ไม่สามารถดึงข้อมูลได้');
    }
  }

  function renderSchedules() {
    scheduleCount.textContent = `${schedulesData.length} รายการ`;
    
    if (schedulesData.length === 0) {
      scheduleList.innerHTML = `
        <div class="text-center text-slate-500" style="padding: 3rem 0; background: var(--slate-50); border-radius: 0.75rem; border: 1px dashed var(--slate-200); display:flex; flex-direction:column; align-items:center;">
          <i data-lucide="file-spreadsheet" style="width: 48px; height: 48px; color: var(--slate-300); margin-bottom: 0.75rem;"></i>
          <p style="font-size: 1rem; font-weight: 500;">ยังไม่มีข้อมูลตารางสอน</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }
    
    scheduleList.innerHTML = '';
    schedulesData.forEach(schedule => {
      const div = document.createElement('div');
      div.style.cssText = 'padding: 1rem; border: 1px solid var(--slate-200); border-radius: 0.75rem; background: white; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: background 0.2s;';
      div.className = 'schedule-row';
      div.onmouseover = () => div.style.background = 'var(--slate-50)';
      div.onmouseout = () => div.style.background = 'white';
      div.onclick = () => openEditModal(schedule);
      
      const teacherEmailHTML = schedule.teacherEmail ? `<span style="color:var(--slate-400); font-weight:normal;"> (${schedule.teacherEmail})</span>` : '';
      
      div.innerHTML = `
        <div style="display: flex; gap: 1rem; align-items: center; flex: 1;">
          <div style="background: var(--blue-50); color: var(--blue-700); font-weight: bold; padding: 0.75rem; border-radius: 0.5rem; width: 4rem; text-align: center; font-size: 0.875rem; border: 1px solid var(--blue-100);">
            ${schedule.room}
          </div>
          <div>
            <p style="font-weight: bold; color: var(--slate-800); font-size: 1rem;">${schedule.subject}</p>
            <p style="font-size: 0.875rem; color: var(--slate-600); margin-top: 0.25rem;">
              <span style="font-weight: 500;">${schedule.dayOfWeek}</span> 
              <span style="color: var(--slate-400);">|</span> 
              <span>${schedule.startTime} - ${schedule.endTime}</span>
            </p>
            <p style="font-size: 0.875rem; color: var(--emerald-600); margin-top: 0.25rem; font-weight: 500;">
              ${schedule.teacherName} ${teacherEmailHTML}
            </p>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn-action btn-print" data-room="${schedule.room}" style="padding: 0.5rem; border-radius: 0.5rem; border: 1px solid transparent; background: transparent; cursor: pointer; color: var(--slate-500);" title="พิมพ์ QR Code ห้องนี้">
            <i data-lucide="printer" style="width: 20px; height: 20px;"></i>
          </button>
          <button class="btn-action btn-edit" style="padding: 0.5rem; border-radius: 0.5rem; border: 1px solid transparent; background: transparent; cursor: pointer; color: var(--blue-500);" title="แก้ไขข้อมูล">
            <i data-lucide="edit" style="width: 20px; height: 20px;"></i>
          </button>
          <button class="btn-action btn-delete" data-id="${schedule.id}" style="padding: 0.5rem; border-radius: 0.5rem; border: 1px solid transparent; background: transparent; cursor: pointer; color: var(--rose-500);" title="ลบตารางสอน">
            <i data-lucide="trash-2" style="width: 20px; height: 20px;"></i>
          </button>
        </div>
      `;
      scheduleList.appendChild(div);
      
      const btnPrint = div.querySelector('.btn-print');
      btnPrint.onmouseover = () => { btnPrint.style.background = 'var(--slate-100)'; btnPrint.style.borderColor = 'var(--slate-200)'; };
      btnPrint.onmouseout = () => { btnPrint.style.background = 'transparent'; btnPrint.style.borderColor = 'transparent'; };
      btnPrint.onclick = (e) => { e.stopPropagation(); printQRCodes([schedule.room]); };

      const btnEdit = div.querySelector('.btn-edit');
      btnEdit.onmouseover = () => { btnEdit.style.background = 'var(--blue-50)'; btnEdit.style.borderColor = 'var(--blue-100)'; };
      btnEdit.onmouseout = () => { btnEdit.style.background = 'transparent'; btnEdit.style.borderColor = 'transparent'; };
      btnEdit.onclick = (e) => { e.stopPropagation(); openEditModal(schedule); };

      const btnDelete = div.querySelector('.btn-delete');
      btnDelete.onmouseover = () => { btnDelete.style.background = 'var(--rose-50)'; btnDelete.style.borderColor = 'var(--rose-100)'; };
      btnDelete.onmouseout = () => { btnDelete.style.background = 'transparent'; btnDelete.style.borderColor = 'transparent'; };
      btnDelete.onclick = (e) => { e.stopPropagation(); deleteSchedule(schedule.id); };
    });
    
    lucide.createIcons();
  }

  // --- Excel Import ---
  excelInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      excelFile = e.target.files[0];
      fileNameDisplay.textContent = excelFile.name;
      btnImport.disabled = false;
    }
  });

  btnImport.addEventListener('click', async () => {
    if (!excelFile) return;
    btnImport.disabled = true;
    importText.textContent = 'กำลังนำเข้า...';
    
    try {
      const data = await excelFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);
      
      if (json.length === 0) {
        alert('ไม่พบข้อมูลในไฟล์ Excel');
        resetImport();
        return;
      }
      
      let addedCount = 0;
      
      for (const row of json) {
        const normalizedRow = {};
        Object.keys(row).forEach(key => {
          const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
          normalizedRow[cleanKey] = row[key];
        });

        const room = normalizedRow['room'] || normalizedRow['ห้อง'] || normalizedRow['ห้องเรียน'];
        const subject = normalizedRow['subject'] || normalizedRow['วิชา'] || normalizedRow['ชื่อวิชา'];
        const teacherName = normalizedRow['teachername'] || normalizedRow['ชื่อผู้สอน'] || normalizedRow['อาจารย์'] || '';
        const teacherEmail = normalizedRow['teacheremail'] || normalizedRow['email'] || normalizedRow['อีเมล'] || '';
        const startTime = normalizedRow['starttime'] || normalizedRow['เวลาเริ่ม'] || '00:00';
        const endTime = normalizedRow['endtime'] || normalizedRow['เวลาจบ'] || '23:59';
        const dayOfWeek = normalizedRow['dayofweek'] || normalizedRow['วัน'] || normalizedRow['day'] || 'Monday';

        if (room && subject) {
          await addDoc(collection(db, 'schedules'), {
            room: String(room),
            subject: String(subject),
            teacherName: String(teacherName),
            teacherEmail: String(teacherEmail),
            startTime: String(startTime),
            endTime: String(endTime),
            dayOfWeek: String(dayOfWeek)
          });
          addedCount++;
        }
      }
      
      if (addedCount > 0) {
        alert(`นำเข้าข้อมูลสำเร็จจำนวน ${addedCount} รายการ!`);
      } else {
        alert('นำเข้าสำเร็จ แต่ไม่พบข้อมูลที่ตรงกับรูปแบบที่ระบบต้องการ\nโปรดตรวจสอบว่ามีคอลัมน์ Room และ Subject');
      }
      
      resetImport();
      fetchData();
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการอ่านไฟล์ โปรดดูรายละเอียดใน Console');
      resetImport();
    }
  });

  function resetImport() {
    excelFile = null;
    excelInput.value = '';
    fileNameDisplay.textContent = 'เลือกไฟล์ Excel หรือลากมาวางที่นี่';
    btnImport.disabled = true;
    importText.textContent = 'นำเข้าข้อมูล';
  }

  // --- Modal Logic ---
  function openEditModal(schedule = null) {
    if (schedule) {
      modalTitle.innerHTML = `<i data-lucide="edit" class="text-blue-600" style="width: 24px; height: 24px;"></i> แก้ไขข้อมูลวิชาและห้องเรียน`;
      document.getElementById('edit-id').value = schedule.id;
      document.getElementById('edit-subject').value = schedule.subject;
      document.getElementById('edit-teacher-name').value = schedule.teacherName;
      document.getElementById('edit-teacher-email').value = schedule.teacherEmail;
      document.getElementById('edit-day').value = schedule.dayOfWeek;
      document.getElementById('edit-start').value = schedule.startTime;
      document.getElementById('edit-end').value = schedule.endTime;
      document.getElementById('edit-room').value = schedule.room;
      
      const roomData = roomsData.find(r => r.id === schedule.room);
      document.getElementById('edit-lat').value = roomData ? roomData.lat : '';
      document.getElementById('edit-lng').value = roomData ? roomData.lng : '';
    } else {
      modalTitle.innerHTML = `<i data-lucide="edit" class="text-blue-600" style="width: 24px; height: 24px;"></i> เพิ่มข้อมูลรายวิชาใหม่`;
      form.reset();
      document.getElementById('edit-id').value = '';
      document.getElementById('edit-day').value = 'Monday';
      document.getElementById('edit-start').value = '09:00';
      document.getElementById('edit-end').value = '12:00';
    }
    
    lucide.createIcons();
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }

  btnCloseModal.addEventListener('click', closeModal);
  btnCancelModal.addEventListener('click', closeModal);

  // Auto-fill lat/lng when room changes
  document.getElementById('edit-room').addEventListener('input', (e) => {
    const newRoom = e.target.value;
    const roomData = roomsData.find(r => r.id === newRoom);
    if (roomData) {
      document.getElementById('edit-lat').value = roomData.lat;
      document.getElementById('edit-lng').value = roomData.lng;
    }
  });

  btnSaveModal.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    const id = document.getElementById('edit-id').value;
    const scheduleData = {
      subject: document.getElementById('edit-subject').value,
      teacherName: document.getElementById('edit-teacher-name').value,
      teacherEmail: document.getElementById('edit-teacher-email').value,
      dayOfWeek: document.getElementById('edit-day').value,
      startTime: document.getElementById('edit-start').value,
      endTime: document.getElementById('edit-end').value,
      room: document.getElementById('edit-room').value
    };
    
    const lat = document.getElementById('edit-lat').value;
    const lng = document.getElementById('edit-lng').value;

    try {
      if (id) {
        await updateDoc(doc(db, 'schedules', id), scheduleData);
      } else {
        await addDoc(collection(db, 'schedules'), scheduleData);
      }
      
      if (lat && lng) {
        await setDoc(doc(db, 'rooms', scheduleData.room), {
          lat: parseFloat(lat),
          lng: parseFloat(lng)
        });
      }
      
      closeModal();
      fetchData();
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  });

  async function deleteSchedule(id) {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบตารางสอนนี้?')) {
      try {
        const scheduleToDelete = schedulesData.find(s => s.id === id);
        const roomName = scheduleToDelete ? scheduleToDelete.room : null;

        await deleteDoc(doc(db, 'schedules', id));
        
        // ตรวจสอบว่ายังมีตารางสอนของห้องนี้เหลืออยู่หรือไม่
        if (roomName) {
          const qRemaining = query(collection(db, 'schedules'), where('room', '==', roomName));
          const snapRemaining = await getDocs(qRemaining);
          if (snapRemaining.empty) {
            // ถ้าไม่มีแล้ว ให้ลบห้องนั้นออกจากฐานข้อมูล rooms ด้วย
            await deleteDoc(doc(db, 'rooms', roomName));
          }
        }
      } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการลบข้อมูล');
      }
      fetchData();
    }
  }

  btnAddNew.addEventListener('click', () => openEditModal());

  // --- Print QR Codes ---
  btnPrintAll.addEventListener('click', () => {
    if (schedulesData.length === 0) return alert('ไม่มีข้อมูล');
    const uniqueRooms = Array.from(new Set(schedulesData.map(s => s.room)));
    printQRCodes(uniqueRooms);
  });

  async function printQRCodes(rooms) {
    printArea.innerHTML = '';
    const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', '');
    
    rooms.forEach(room => {
      const card = document.createElement('div');
      card.className = 'print-card';
      
      const h1 = document.createElement('h1');
      h1.style.cssText = 'font-size: 2.5rem; font-weight: 900; margin-bottom: 0.5rem; color: var(--slate-800);';
      h1.textContent = `ห้อง ${room}`;
      
      const h2 = document.createElement('h2');
      h2.style.cssText = 'font-size: 1.25rem; font-weight: bold; color: var(--slate-500); margin-bottom: 2rem;';
      h2.textContent = 'สแกนเพื่อยืนยันการใช้ห้อง';
      
      const qr = new QRious({
        value: `${baseUrl}index.html?room=${room}`,
        size: 220,
        level: 'H'
      });
      
      const img = document.createElement('img');
      img.src = qr.toDataURL();
      
      const footer = document.createElement('div');
      footer.style.cssText = 'margin-top: 2rem; padding: 0.5rem 1.5rem; background: var(--slate-100); border-radius: 9999px; color: var(--slate-500); font-size: 0.875rem; font-weight: 500;';
      footer.textContent = 'คณะเทคโนโลยีการเกษตร สจล.';
      
      card.appendChild(h1);
      card.appendChild(h2);
      card.appendChild(img);
      card.appendChild(footer);
      printArea.appendChild(card);
    });
    
    // Give browser a tiny bit of time to layout images
    setTimeout(() => {
      window.print();
    }, 100);
  }
});
