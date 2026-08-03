import { db, collection, getDocs, query, where } from './firebase-config.js';

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

  const form = document.getElementById('search-instructor-form');
  const instructorSelect = document.getElementById('instructor-select');
  const btnSearch = document.getElementById('btn-search');
  
  const infoCard = document.getElementById('instructor-info-card');
  const infoName = document.getElementById('info-name');
  const infoEmail = document.getElementById('info-email');
  
  const subjectsContainer = document.getElementById('subjects-container');
  const subjectsTableBody = document.getElementById('subjects-table-body');
  const noResultMsg = document.getElementById('no-result-msg');

  // Load instructors into the dropdown
  async function loadInstructors() {
    try {
      const qSchedules = query(collection(db, 'schedules'));
      const snapSchedules = await getDocs(qSchedules);
      
      const instructorsMap = new Map(); // email -> name
      
      snapSchedules.forEach(doc => {
        const data = doc.data();
        if (data.teacherEmail) {
          const email = data.teacherEmail.toLowerCase();
          const name = data.teacherName || 'ไม่ทราบชื่อ';
          // Prefer a valid name over 'ไม่ทราบชื่อ'
          if (!instructorsMap.has(email) || (instructorsMap.get(email) === 'ไม่ทราบชื่อ' && name !== 'ไม่ทราบชื่อ')) {
            instructorsMap.set(email, name);
          }
        }
      });
      
      // Also get from sessions just in case there are old histories
      const qSessions = query(collection(db, 'sessions'));
      const snapSessions = await getDocs(qSessions);
      snapSessions.forEach(doc => {
        const data = doc.data();
        if (data.userEmail) {
          const email = data.userEmail.toLowerCase();
          const name = data.userName || 'ไม่ทราบชื่อ';
          if (!instructorsMap.has(email) || (instructorsMap.get(email) === 'ไม่ทราบชื่อ' && name !== 'ไม่ทราบชื่อ')) {
            instructorsMap.set(email, name);
          }
        }
      });

      instructorSelect.innerHTML = '<option value="" disabled selected>-- เลือกรายชื่ออาจารย์ผู้สอน --</option>';
      
      if (instructorsMap.size === 0) {
        instructorSelect.innerHTML = '<option value="" disabled selected>ไม่พบข้อมูลผู้สอนในระบบ</option>';
        return;
      }

      // Sort alphabetically by name
      const sortedInstructors = Array.from(instructorsMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));

      sortedInstructors.forEach(([email, name]) => {
        const option = document.createElement('option');
        option.value = email;
        option.textContent = `${name} (${email})`;
        instructorSelect.appendChild(option);
      });
      
    } catch (error) {
      console.error("Error loading instructors", error);
      instructorSelect.innerHTML = '<option value="" disabled selected>เกิดข้อผิดพลาดในการโหลดข้อมูล</option>';
    }
  }

  // Initial load
  loadInstructors();

  // Handle auto-submit on selection
  instructorSelect.addEventListener('change', () => {
    if (instructorSelect.value) {
      // Simulate form submission
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  });

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailToSearch = instructorSelect.value;
    if (!emailToSearch) return;

    btnSearch.disabled = true;
    const originalText = btnSearch.innerHTML;
    btnSearch.innerHTML = `<i data-lucide="loader" class="animate-spin" style="width: 18px; height: 18px;"></i> ค้นหา...`;
    lucide.createIcons();

    try {
      // 1. ค้นหาวิชาที่สอนจาก schedules
      const qSchedules = query(collection(db, 'schedules'));
      const snapSchedules = await getDocs(qSchedules);
      
      const teacherSchedules = [];
      let teacherNameFound = 'ไม่ทราบชื่อ';

      snapSchedules.forEach(doc => {
        const data = doc.data();
        if (data.teacherEmail && data.teacherEmail.toLowerCase() === emailToSearch) {
          teacherSchedules.push({ id: doc.id, ...data });
          if (data.teacherName) {
            teacherNameFound = data.teacherName; // เก็บชื่ออาจารย์จากตาราง
          }
        }
      });

      // 2. ดึงประวัติการสอนทั้งหมดของอีเมลนี้จาก sessions
      // เนื่องจาก firestore อาจไม่ได้สร้าง index ไว้สำหรับ where('userEmail', '==') เราอาจดึงทั้งหมดมา filter ฝั่ง client 
      // หรือดึงตามเงื่อนไขหากมี index
      let sessionsCountBySubject = {};
      const qSessions = query(collection(db, 'sessions'), where('userEmail', '==', emailToSearch));
      let snapSessions;
      
      try {
        snapSessions = await getDocs(qSessions);
      } catch(err) {
        // หากไม่มี index ใน firestore ให้ดึงทั้งหมดแล้วกรอง
        const qAll = query(collection(db, 'sessions'));
        const allSessions = await getDocs(qAll);
        const docs = allSessions.docs.filter(d => (d.data().userEmail || '').toLowerCase() === emailToSearch);
        snapSessions = { docs };
      }

      let hasAnyHistory = false;
      snapSessions.docs.forEach(doc => {
        hasAnyHistory = true;
        const data = doc.data();
        // นับจำนวนครั้งที่สอนวิชานี้
        const subjName = data.subject || 'ไม่ระบุวิชา';
        if (!sessionsCountBySubject[subjName]) {
          sessionsCountBySubject[subjName] = 0;
        }
        sessionsCountBySubject[subjName]++;
        
        if(teacherNameFound === 'ไม่ทราบชื่อ' && data.userName) {
            teacherNameFound = data.userName;
        }
      });

      // รวมผลลัพธ์
      // ถ้าไม่มีใน schedule แต่มีใน session เราก็แสดงวิชาจาก session ด้วย (เผื่อตารางสอนถูกลบไปแล้ว)
      const finalSubjects = [];
      
      teacherSchedules.forEach(s => {
        finalSubjects.push({
          subject: s.subject || 'ไม่ระบุ',
          room: s.room || '-',
          day: s.dayOfWeek || '-',
          time: `${s.startTime || '-'} - ${s.endTime || '-'}`,
          count: sessionsCountBySubject[s.subject] || 0
        });
        // เอาออกจาก sessionsCountBySubject จะได้รู้ว่าเหลือวิชาไหนที่ไม่อยู่ในตาราง
        delete sessionsCountBySubject[s.subject];
      });

      // เพิ่มวิชาที่เคยสอน(มี history) แต่ไม่อยู่ในตาราง
      for (const [subj, count] of Object.entries(sessionsCountBySubject)) {
        finalSubjects.push({
          subject: subj,
          room: 'ไม่พบในตาราง (ประวัติเก่า)',
          day: '-',
          time: '-',
          count: count
        });
      }

      // แสดงผล
      if (finalSubjects.length === 0 && !hasAnyHistory) {
        infoCard.classList.add('hidden');
        subjectsContainer.classList.add('hidden');
        noResultMsg.classList.remove('hidden');
      } else {
        noResultMsg.classList.add('hidden');
        infoCard.classList.remove('hidden');
        subjectsContainer.classList.remove('hidden');
        
        infoName.textContent = teacherNameFound;
        infoEmail.innerHTML = `<i data-lucide="mail" style="width: 16px; height: 16px;"></i> ${emailToSearch}`;

        let html = '';
        finalSubjects.forEach(s => {
          html += `
            <tr>
              <td style="font-weight: 600; color: var(--slate-800);">${s.subject}</td>
              <td>
                <span class="badge" style="background: var(--slate-100); color: var(--slate-700); font-weight: normal;">
                  ${s.day} ${s.time}
                </span>
              </td>
              <td style="color: var(--blue-700); font-weight: 500;">${s.room}</td>
              <td style="text-align: center; font-size: 1.125rem; font-weight: 700; color: var(--emerald-600);">
                ${s.count} <span style="font-size: 0.8125rem; font-weight: 400; color: var(--slate-500);">ครั้ง</span>
              </td>
            </tr>
          `;
        });
        subjectsTableBody.innerHTML = html;
      }

    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      btnSearch.disabled = false;
      btnSearch.innerHTML = originalText;
      lucide.createIcons();
    }
  });
});
