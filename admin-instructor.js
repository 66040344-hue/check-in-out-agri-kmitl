import { db, collection, query, getDocs } from './firebase-config.js';

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
  const inputEmail = document.getElementById('instructor-email');
  const btnClearSearch = document.getElementById('btn-clear-search');
  
  const subjectsContainer = document.getElementById('subjects-container');
  const subjectsTableBody = document.getElementById('subjects-table-body');
  const noResultMsg = document.getElementById('no-result-msg');
  const resultsCountBadge = document.getElementById('results-count-badge');

  const statTotalTeachers = document.getElementById('stat-total-teachers');
  const statTotalSubjects = document.getElementById('stat-total-subjects');
  const statTotalSessions = document.getElementById('stat-total-sessions');

  let allStats = [];

  async function loadAllHistory() {
    try {
      subjectsTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 3rem; color: var(--slate-500);">กำลังโหลดสถิติทั้งหมด...</td></tr>`;
      
      const qAll = query(collection(db, 'sessions'));
      const allSessions = await getDocs(qAll);
      
      const statsMap = {};
      const uniqueTeachersSet = new Set();
      const uniqueSubjectsSet = new Set();
      let totalCheckinsCount = 0;
      
      allSessions.docs.forEach(doc => {
        const data = doc.data();
        const email = (data.userEmail || '').toLowerCase();
        if (!email) return;

        totalCheckinsCount++;
        uniqueTeachersSet.add(email);
        
        const subjName = data.subject || 'ไม่ระบุวิชา';
        uniqueSubjectsSet.add(subjName);

        const name = data.userName || 'ไม่ทราบชื่อ';
        const roomName = data.roomId || data.room || 'ไม่ระบุห้อง';
        const key = `${email}||${subjName}||${roomName}`;
        
        if (!statsMap[key]) {
          statsMap[key] = {
            email: email,
            name: name,
            subject: subjName,
            room: roomName,
            count: 0
          };
        }
        
        statsMap[key].count++;
        if (statsMap[key].name === 'ไม่ทราบชื่อ' && name !== 'ไม่ทราบชื่อ') {
          statsMap[key].name = name;
        }
      });

      // Update Summary Cards
      if (statTotalTeachers) statTotalTeachers.textContent = uniqueTeachersSet.size;
      if (statTotalSubjects) statTotalSubjects.textContent = uniqueSubjectsSet.size;
      if (statTotalSessions) statTotalSessions.textContent = totalCheckinsCount;

      allStats = Object.values(statsMap);
      
      // Sort primarily by teacher name/email, then by count descending
      allStats.sort((a, b) => {
        if (a.name !== b.name) return a.name.localeCompare(b.name, 'th');
        return b.count - a.count;
      });

      renderTable(allStats);
      
    } catch (err) {
      console.error(err);
      subjectsTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2.5rem; color: var(--rose-500);">เกิดข้อผิดพลาดในการโหลดข้อมูลประวัติ</td></tr>`;
    }
  }

  function getAvatarLetter(name, email) {
    if (name && name !== 'ไม่ทราบชื่อ') {
      return name.trim().charAt(0).toUpperCase();
    }
    if (email) {
      return email.trim().charAt(0).toUpperCase();
    }
    return '?';
  }

  function renderTable(dataList) {
    if (resultsCountBadge) {
      resultsCountBadge.textContent = `แสดง ${dataList.length} จาก ${allStats.length} รายการ`;
    }

    if (dataList.length === 0) {
      subjectsContainer.classList.add('hidden');
      noResultMsg.classList.remove('hidden');
      return;
    }
    
    noResultMsg.classList.add('hidden');
    subjectsContainer.classList.remove('hidden');

    let html = '';
    dataList.forEach(s => {
      const avatarLetter = getAvatarLetter(s.name, s.email);
      
      html += `
        <tr style="transition: background-color 0.15s; border-bottom: 1px solid var(--slate-100);">
          <td>
            <div style="display: flex; align-items: center; gap: 0.875rem;">
              <div class="avatar-circle">
                ${avatarLetter}
              </div>
              <div>
                <div style="font-weight: 700; color: var(--slate-900); font-size: 0.9375rem;">${s.name}</div>
                <div style="font-size: 0.8125rem; color: var(--slate-500); display: flex; align-items: center; gap: 0.35rem; margin-top: 0.1rem;">
                  <i data-lucide="mail" style="width: 13px; height: 13px; color: var(--slate-400);"></i> ${s.email}
                </div>
              </div>
            </div>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--slate-800); font-size: 0.9375rem;">${s.subject}</div>
          </td>
          <td>
            <div style="display: inline-flex; align-items: center; gap: 0.375rem; background: #ecfdf5; color: #047857; padding: 0.35rem 0.875rem; border-radius: 2rem; font-size: 0.8125rem; font-weight: 600; border: 1px solid #a7f3d0;">
               <i data-lucide="map-pin" style="width: 13px; height: 13px; color: #059669;"></i> ${s.room}
            </div>
          </td>
          <td style="text-align: center;">
            <span style="display: inline-block; background: #f0fdf4; color: #15803d; font-weight: 700; font-size: 1rem; padding: 0.35rem 1rem; border-radius: 0.75rem; border: 1px solid #bbf7d0;">
              ${s.count} <span style="font-size: 0.75rem; font-weight: 500; color: #166534;">ครั้ง</span>
            </span>
          </td>
        </tr>
      `;
    });
    subjectsTableBody.innerHTML = html;
    lucide.createIcons();
  }

  // Load all data on page load
  loadAllHistory();

  // Search filtering
  function applyFilter() {
    const queryStr = inputEmail.value.trim().toLowerCase();
    if (!queryStr) {
      renderTable(allStats);
      return;
    }
    const filtered = allStats.filter(s => 
      s.email.toLowerCase().includes(queryStr) || 
      s.name.toLowerCase().includes(queryStr) ||
      s.subject.toLowerCase().includes(queryStr) ||
      s.room.toLowerCase().includes(queryStr)
    );
    renderTable(filtered);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    applyFilter();
  });

  inputEmail.addEventListener('input', applyFilter);

  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      inputEmail.value = '';
      applyFilter();
    });
  }
});
