import { db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, setDoc, query, orderBy, where } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  
  let schedulesData = [];
  let roomsData = [];
  let excelFile = null;

  const excelInput = document.getElementById('excel-file');
  const fileNameDisplay = document.getElementById('file-name');
  const btnImport = document.getElementById('btn-import');
  const importText = document.getElementById('import-text');
  
  const scheduleList = document.getElementById('schedule-list');
  const scheduleSearch = document.getElementById('schedule-search');
  const btnPrintAll = document.getElementById('btn-print-all');
  const btnDeleteAll = document.getElementById('btn-delete-all');
  const btnAddNew = document.getElementById('btn-add-new');
  const printArea = document.getElementById('print-area');
  
  const modal = document.getElementById('edit-modal');
  const form = document.getElementById('edit-form');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  const modalTitle = document.getElementById('modal-title');
  
  const statSchedules = document.getElementById('stat-schedules');
  const statRooms = document.getElementById('stat-rooms');
  const statTeachers = document.getElementById('stat-teachers');

  // Admin Session Check
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
  
  fetchData();

  async function fetchData() {
    try {
      const qSchedules = query(collection(db, 'schedules'), orderBy('room'));
      const snapSchedules = await getDocs(qSchedules);
      schedulesData = snapSchedules.docs.map(d => ({ id: d.id, ...d.data() }));

      const qRooms = query(collection(db, 'rooms'));
      const snapRooms = await getDocs(qRooms);
      roomsData = snapRooms.docs.map(d => ({ id: d.id, ...d.data() }));
      
      updateStats();
      renderSchedules();
    } catch (error) {
      console.error("Error fetching data", error);
      alert('ไม่สามารถดึงข้อมูลได้');
    }
  }

  function updateStats() {
    statSchedules.textContent = schedulesData.length;
    
    const uniqueRooms = new Set(schedulesData.map(s => s.room));
    statRooms.textContent = uniqueRooms.size;
    
    const uniqueTeachers = new Set(schedulesData.map(s => s.teacherName).filter(Boolean));
    statTeachers.textContent = uniqueTeachers.size;
  }

  function getDayBadgeClass(day) {
    if (!day) return 'day-mon';
    const d = day.trim();
    if (d.includes('จันทร์') || d.toLowerCase().includes('mon')) return 'day-mon';
    if (d.includes('อังคาร') || d.toLowerCase().includes('tue')) return 'day-tue';
    if (d.includes('พุธ') || d.toLowerCase().includes('wed')) return 'day-wed';
    if (d.includes('พฤหัส') || d.toLowerCase().includes('thu')) return 'day-thu';
    if (d.includes('ศุกร์') || d.toLowerCase().includes('fri')) return 'day-fri';
    if (d.includes('เสาร์') || d.toLowerCase().includes('sat')) return 'day-sat';
    if (d.includes('อาทิตย์') || d.toLowerCase().includes('sun')) return 'day-sun';
    return 'day-mon';
  }

  function renderSchedules(filterText = '') {
    const queryStr = filterText.toLowerCase().trim();
    const filtered = schedulesData.filter(s => {
      if (!queryStr) return true;
      return (s.room || '').toLowerCase().includes(queryStr) ||
             (s.subject || '').toLowerCase().includes(queryStr) ||
             (s.teacherName || '').toLowerCase().includes(queryStr) ||
             (s.dayOfWeek || '').toLowerCase().includes(queryStr);
    });

    if (filtered.length === 0) {
      scheduleList.innerHTML = `
        <div class="text-center text-slate-500" style="padding: 3rem 0; background: var(--slate-50); border-radius: 0.75rem; border: 1px dashed var(--slate-200); display:flex; flex-direction:column; align-items:center;">
          <i data-lucide="folder-search" style="width: 48px; height: 48px; color: var(--slate-300); margin-bottom: 0.75rem;"></i>
          <p style="font-size: 1rem; font-weight: 500;">ไม่พบข้อมูลตารางสอน</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }
    
    scheduleList.innerHTML = '';
    filtered.forEach(schedule => {
      const div = document.createElement('div');
      div.style.cssText = 'padding: 1rem 1.25rem; border: 1px solid var(--slate-200); border-radius: 0.875rem; background: white; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.02);';
      div.className = 'schedule-row';
      div.onmouseover = () => { div.style.background = 'var(--slate-50)'; div.style.borderColor = 'var(--blue-200)'; };
      div.onmouseout = () => { div.style.background = 'white'; div.style.borderColor = 'var(--slate-200)'; };
      div.onclick = () => openEditModal(schedule);
      
      const teacherEmailHTML = schedule.teacherEmail ? `<span style="color:var(--slate-400); font-weight:normal;"> (${schedule.teacherEmail})</span>` : '';
      const dayBadge = `<span class="badge-day ${getDayBadgeClass(schedule.dayOfWeek)}">${schedule.dayOfWeek || 'ไม่ระบุวัน'}</span>`;

      div.innerHTML = `
        <div style="display: flex; gap: 1rem; align-items: center; flex: 1;">
          <div style="background: var(--grad-primary); color: white; font-weight: bold; padding: 0.75rem; border-radius: 0.75rem; width: 4.5rem; text-align: center; font-size: 0.95rem; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);">
            ${schedule.room}
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-bottom: 0.25rem;">
              <p style="font-weight: 700; color: var(--slate-900); font-size: 1.05rem;">${schedule.subject}</p>
              ${dayBadge}
            </div>
            <p style="font-size: 0.875rem; color: var(--slate-600);">
              <span style="color:var(--blue-600); font-weight:600;"><i data-lucide="clock" style="width:14px;height:14px;display:inline;vertical-align:-2px;"></i> ${schedule.startTime} - ${schedule.endTime}</span>
              <span style="color: var(--slate-300); margin: 0 0.35rem;">|</span> 
              <span style="color: var(--slate-700); font-weight: 500;">${schedule.teacherName || 'ไม่ระบุอาจารย์'}${teacherEmailHTML}</span>
            </p>
          </div>
        </div>
        <div style="display: flex; gap: 0.375rem;" onclick="event.stopPropagation()">
          <button class="action-btn-sm btn-print" style="color: var(--blue-600);" title="พิมพ์ QR Code ห้องนี้">
            <i data-lucide="printer" style="width: 16px; height: 16px;"></i>
          </button>
          <button class="action-btn-sm btn-edit" style="color: var(--amber-600);" title="แก้ไขข้อมูล">
            <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
          </button>
          <button class="action-btn-sm btn-delete" style="color: var(--rose-600);" title="ลบตารางสอน">
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          </button>
        </div>
      `;
      scheduleList.appendChild(div);
      
      const btnPrint = div.querySelector('.btn-print');
      btnPrint.onclick = () => printQRCodes([schedule.room]);

      const btnEdit = div.querySelector('.btn-edit');
      btnEdit.onclick = () => openEditModal(schedule);

      const btnDelete = div.querySelector('.btn-delete');
      btnDelete.onclick = () => deleteSchedule(schedule.id);
    });
    
    lucide.createIcons();
  }

  // Filter Event
  if (scheduleSearch) {
    scheduleSearch.addEventListener('input', (e) => {
      renderSchedules(e.target.value);
    });
  }

  // --- Excel Import ---
  if (excelInput) {
    excelInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        excelFile = e.target.files[0];
        fileNameDisplay.textContent = excelFile.name;
        btnImport.disabled = false;
      }
    });
  }

  if (btnImport) {
    btnImport.addEventListener('click', async () => {
      if (!excelFile) return;
      btnImport.disabled = true;
      importText.textContent = 'กำลังนำเข้า...';
      
      try {
        const data = await excelFile.arrayBuffer();
        const workbook = XLSX.read(data);
        
        let addedCount = 0;
        const roomsMap = {}; // To store coordinates by room name
        
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          // Use { raw: false } to get formatted strings for time and dates
          const json = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" });
          
          let currentDay = sheetName.replace('วัน', ''); // Fallback to sheet name
          
          for (const row of json) {
            const normalizedRow = {};
            Object.keys(row).forEach(key => {
              const cleanKey = key.toLowerCase().replace(/[^a-z0-9ก-๙]/g, '');
              normalizedRow[cleanKey] = row[key];
            });

            const rawDay = normalizedRow['dayofweek'] || normalizedRow['วัน'] || normalizedRow['day'];
            if (rawDay && String(rawDay).trim() !== '') {
               currentDay = String(rawDay).trim();
            }

            const room = normalizedRow['room'] || normalizedRow['ห้อง'] || normalizedRow['ห้องเรียน'];
            const subject = normalizedRow['subject'] || normalizedRow['วิชา'] || normalizedRow['ชื่อวิชา'];
            const teacherName = normalizedRow['teachername'] || normalizedRow['ชื่อผู้สอน'] || normalizedRow['รายชื่อผู้สอน'] || normalizedRow['อาจารย์'] || '';
            const teacherEmail = normalizedRow['teacheremail'] || normalizedRow['email'] || normalizedRow['อีเมล'] || normalizedRow['อีเมลผู้สอน'] || '';
            let startTime = normalizedRow['starttime'] || normalizedRow['เวลาเริ่ม'] || '00:00';
            let endTime = normalizedRow['endtime'] || normalizedRow['เวลาสิ้นสุด'] || normalizedRow['เวลาจบ'] || '23:59';
            const dmsCoords = normalizedRow['พิกัดห้องเรียนdms'] || normalizedRow['พิกัดdms'] || normalizedRow['dms'] || '';

            // Format time strings just in case they have seconds (e.g., "08:00:00" -> "08:00")
            if (startTime.length > 5) startTime = startTime.substring(0, 5);
            if (endTime.length > 5) endTime = endTime.substring(0, 5);

            if (room && subject) {
              await addDoc(collection(db, 'schedules'), {
                room: String(room),
                subject: String(subject),
                teacherName: String(teacherName),
                teacherEmail: String(teacherEmail),
                startTime: String(startTime),
                endTime: String(endTime),
                dayOfWeek: String(currentDay)
              });
              addedCount++;
              
              if (dmsCoords) {
                const parsedCoords = parseDMS(String(dmsCoords));
                if (parsedCoords) {
                  roomsMap[String(room)] = parsedCoords;
                }
              }
            }
          }
        }
        
        // Save extracted room coordinates
        for (const [roomName, coords] of Object.entries(roomsMap)) {
           await setDoc(doc(db, 'rooms', roomName), {
             latitude: coords.lat,
             longitude: coords.lng
           }, { merge: true });
        }
        
        if (addedCount > 0) {
          alert(`นำเข้าข้อมูลสำเร็จจำนวน ${addedCount} รายการ!`);
        } else {
          alert('นำเข้าสำเร็จ แต่ไม่พบข้อมูลที่ตรงกับรูปแบบที่ระบบต้องการ\nโปรดตรวจสอบคอลัมน์ Room, วิชา ในไฟล์');
        }
        
        resetImport();
        fetchData();
      } catch (error) {
        console.error(error);
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ โปรดดูรายละเอียดใน Console');
        resetImport();
      }
    });
  }

  function parseDMS(dmsString) {
    if (!dmsString) return null;
    const regex = /(\d+)[^\d]+(\d+)[^\d]+([\d.]+)[^\d]+([NS])[^\d]+(\d+)[^\d]+(\d+)[^\d]+([\d.]+)[^\d]+([EW])/i;
    const match = dmsString.match(regex);
    if (!match) return null;

    let lat = parseFloat(match[1]) + parseFloat(match[2])/60 + parseFloat(match[3])/3600;
    if (match[4].toUpperCase() === 'S') lat = -lat;

    let lng = parseFloat(match[5]) + parseFloat(match[6])/60 + parseFloat(match[7])/3600;
    if (match[8].toUpperCase() === 'W') lng = -lng;

    return { lat, lng };
  }

  function resetImport() {
    excelFile = null;
    if (excelInput) excelInput.value = '';
    if (fileNameDisplay) fileNameDisplay.textContent = 'ลากไฟล์ Excel มาวาง หรือคลิกเพื่อเลือกไฟล์';
    if (btnImport) {
      btnImport.disabled = true;
      importText.textContent = 'นำเข้าข้อมูลวิชา';
    }
  }

  // --- Modal Logic ---
  function openEditModal(schedule = null) {
    if (schedule) {
      modalTitle.innerHTML = `<i data-lucide="edit" class="text-blue-600" style="width: 20px; height: 20px;"></i> แก้ไขข้อมูลรายวิชา`;
      document.getElementById('edit-id').value = schedule.id;
      document.getElementById('edit-room').value = schedule.room || '';
      document.getElementById('edit-day').value = schedule.dayOfWeek || 'จันทร์';
      document.getElementById('edit-subject').value = schedule.subject || '';
      document.getElementById('edit-start-time').value = schedule.startTime || '09:00';
      document.getElementById('edit-end-time').value = schedule.endTime || '12:00';
      document.getElementById('edit-teacher-name').value = schedule.teacherName || '';
      document.getElementById('edit-teacher-email').value = schedule.teacherEmail || '';
      
      const roomInfo = roomsData.find(r => r.id === schedule.room);
      if (roomInfo && roomInfo.latitude && roomInfo.longitude) {
        document.getElementById('edit-coords').value = `${roomInfo.latitude}, ${roomInfo.longitude}`;
      } else {
        document.getElementById('edit-coords').value = '';
      }
    } else {
      modalTitle.innerHTML = `<i data-lucide="plus-circle" class="text-emerald-600" style="width: 20px; height: 20px;"></i> เพิ่มข้อมูลรายวิชาใหม่`;
      form.reset();
      document.getElementById('edit-id').value = '';
      document.getElementById('edit-day').value = 'จันทร์';
      document.getElementById('edit-start-time').value = '09:00';
      document.getElementById('edit-end-time').value = '12:00';
      document.getElementById('edit-coords').value = '';
    }
    
    lucide.createIcons();
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const id = document.getElementById('edit-id').value;
      const scheduleData = {
        room: document.getElementById('edit-room').value.trim(),
        dayOfWeek: document.getElementById('edit-day').value,
        subject: document.getElementById('edit-subject').value.trim(),
        startTime: document.getElementById('edit-start-time').value,
        endTime: document.getElementById('edit-end-time').value,
        teacherName: document.getElementById('edit-teacher-name').value.trim(),
        teacherEmail: document.getElementById('edit-teacher-email').value.trim()
      };

      try {
        if (id) {
          await updateDoc(doc(db, 'schedules', id), scheduleData);
        } else {
          await addDoc(collection(db, 'schedules'), scheduleData);
        }

        // Save Room Coordinates if provided
        const coordsRaw = document.getElementById('edit-coords').value.trim();
        if (coordsRaw && scheduleData.room) {
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
          
          if (!isNaN(lat) && !isNaN(lng)) {
             await setDoc(doc(db, 'rooms', scheduleData.room), {
               latitude: lat,
               longitude: lng
             }, { merge: true });
          }
        }
        
        closeModal();
        fetchData();
      } catch (error) {
        console.error(error);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    });
  }

  async function deleteSchedule(id) {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบตารางสอนนี้?')) {
      try {
        const scheduleToDelete = schedulesData.find(s => s.id === id);
        const roomName = scheduleToDelete ? scheduleToDelete.room : null;

        await deleteDoc(doc(db, 'schedules', id));
        
        if (roomName) {
          const qRemaining = query(collection(db, 'schedules'), where('room', '==', roomName));
          const snapRemaining = await getDocs(qRemaining);
          if (snapRemaining.empty) {
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

  if (btnDeleteAll) {
    btnDeleteAll.addEventListener('click', async () => {
      if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลตารางสอน "ทั้งหมด" ออกจากระบบ?\n(การกระทำนี้ไม่สามารถกู้คืนได้)')) {
        btnDeleteAll.disabled = true;
        btnDeleteAll.innerHTML = `<i data-lucide="loader" class="animate-spin" style="width: 16px; height: 16px;"></i> กำลังลบ...`;
        try {
          for (const s of schedulesData) {
             await deleteDoc(doc(db, 'schedules', s.id));
          }
          for (const r of roomsData) {
             await deleteDoc(doc(db, 'rooms', r.id));
          }
          alert('ลบข้อมูลตารางสอนและห้องเรียนทั้งหมดเรียบร้อยแล้ว');
          fetchData();
        } catch (err) {
          console.error(err);
          alert('เกิดข้อผิดพลาดในการลบข้อมูลทั้งหมด');
        } finally {
          btnDeleteAll.disabled = false;
          btnDeleteAll.innerHTML = `<i data-lucide="trash-2" style="width: 16px; height: 16px;"></i> ลบทั้งหมด`;
          lucide.createIcons();
        }
      }
    });
  }

  if (btnAddNew) btnAddNew.addEventListener('click', () => openEditModal());

  // --- Print QR Codes ---
  if (btnPrintAll) {
    btnPrintAll.addEventListener('click', () => {
      if (schedulesData.length === 0) return alert('ไม่มีข้อมูล');
      const uniqueRooms = Array.from(new Set(schedulesData.map(s => s.room)));
      printQRCodes(uniqueRooms);
    });
  }

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
    
    setTimeout(() => {
      window.print();
    }, 100);
  }
});
