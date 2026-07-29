import { db, collection, getDocs, query, orderBy, updateDoc, serverTimestamp } from './firebase-config.js';
import { isClassEnded } from './utils.js';

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
  
  const tableBody = document.getElementById('history-table-body');
  const statTotal = document.getElementById('stat-total');
  const statCheckedout = document.getElementById('stat-checkedout');
  const statMissing = document.getElementById('stat-missing');
  const historySearch = document.getElementById('history-search');
  const filterPills = document.querySelectorAll('.filter-pill');
  
  // Photo modal elements
  const photoModal = document.getElementById('photo-modal');
  const photoContent = document.getElementById('photo-modal-content');
  const btnClosePhoto = document.getElementById('btn-close-photo');
  
  let allHistoryData = [];
  let currentFilter = 'all';

  if (btnClosePhoto) {
    btnClosePhoto.addEventListener('click', () => {
      photoModal.style.display = 'none';
    });
  }
  
  if (photoModal) {
    photoModal.addEventListener('click', (e) => {
      if (e.target === photoModal) photoModal.style.display = 'none';
    });
  }

  async function loadAdminHistory() {
    try {
      const q = query(collection(db, 'sessions'));
      const snap = await getDocs(q);
      
      const sortedDocs = snap.docs.sort((a, b) => {
        const timeA = a.data().checkInTime ? a.data().checkInTime.toMillis() : 0;
        const timeB = b.data().checkInTime ? b.data().checkInTime.toMillis() : 0;
        return timeB - timeA;
      });

      allHistoryData = [];
      
      for (const docSnap of sortedDocs) {
        const data = docSnap.data();
        let status = data.status;
        const checkInDate = data.checkInTime ? data.checkInTime.toDate() : new Date();
        
        // Lazy Evaluation for Auto Check-out
        if (status === 'checked_in') {
          if (isClassEnded(data.endTime, checkInDate)) {
            status = 'auto_checked_out';
            await updateDoc(docSnap.ref, {
              status: 'auto_checked_out',
              checkOutTime: serverTimestamp()
            });
          }
        }

        allHistoryData.push({
          id: docSnap.id,
          ...data,
          status,
          checkInDate
        });
      }
      
      updateStats();
      renderTable();
      
    } catch (e) {
      console.error(e);
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 3rem; color: var(--rose-500);">เกิดข้อผิดพลาดในการโหลดข้อมูลประวัติ</td></tr>`;
    }
  }

  function updateStats() {
    statTotal.textContent = allHistoryData.length;
    
    const checkedOutCount = allHistoryData.filter(d => d.status === 'checked_out').length;
    const missingCount = allHistoryData.filter(d => d.status === 'auto_checked_out').length;
    
    if (statCheckedout) statCheckedout.textContent = checkedOutCount;
    if (statMissing) statMissing.textContent = missingCount;
  }

  function renderTable() {
    const searchText = (historySearch ? historySearch.value : '').toLowerCase().trim();
    
    const filtered = allHistoryData.filter(item => {
      // Filter by pill status
      if (currentFilter !== 'all' && item.status !== currentFilter) {
        return false;
      }
      
      // Filter by search string
      if (searchText) {
        const nameMatch = (item.userName || '').toLowerCase().includes(searchText);
        const emailMatch = (item.userEmail || '').toLowerCase().includes(searchText);
        const roomMatch = (item.roomId || '').toLowerCase().includes(searchText);
        const subjectMatch = (item.subject || '').toLowerCase().includes(searchText);
        return nameMatch || emailMatch || roomMatch || subjectMatch;
      }
      
      return true;
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 3rem; color: var(--slate-400);">ไม่พบประวัติการใช้งานที่ตรงตามเงื่อนไข</td></tr>`;
      return;
    }

    let html = '';
    filtered.forEach(item => {
      const dateStr = item.checkInTime 
        ? `${item.checkInDate.toLocaleDateString('th-TH')} <br/><span style="color:var(--slate-500); font-size:0.8rem;">${item.checkInDate.toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})} น.</span>`
        : '-';
        
      let outStr = '-';
      if (item.checkOutTime) {
        const outDate = item.checkOutTime.toDate();
        outStr = `${outDate.toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})} น.`;
      }
      
      // Status badge
      let statusBadge = '';
      if (item.status === 'checked_in') {
        statusBadge = `<span class="badge badge-blue"><i data-lucide="clock" style="width:12px;height:12px;"></i> กำลังใช้งาน</span>`;
      } else if (item.status === 'checked_out') {
        statusBadge = `<span class="badge badge-emerald"><i data-lucide="check" style="width:12px;height:12px;"></i> ออกเรียนแล้ว</span>`;
      } else if (item.status === 'auto_checked_out') {
        statusBadge = `<span class="badge badge-rose"><i data-lucide="x-circle" style="width:12px;height:12px;"></i> ไม่ได้ลงชื่อออก</span>`;
        outStr = `<span style="color:var(--rose-600); font-weight:500;">หมดเวลาสอน</span>`;
      }
      
      // User text
      const userText = `<div style="font-weight: 600; color:var(--slate-900);">${item.userName || 'ไม่ระบุชื่อ'}</div><div style="font-size: 0.75rem; color: var(--slate-500);">${item.userEmail || '-'}</div><div style="font-size: 0.75rem; color: var(--slate-400);">โทร: ${item.phone || '-'}</div>`;
      
      // Room text
      const roomText = `<div style="font-weight: 700; color: var(--blue-700); font-size:1rem;">ห้อง ${item.roomId}</div><div style="font-size: 0.8125rem; color: var(--slate-600); font-weight:500;">วิชา: ${item.subject || '-'}</div><div style="font-size: 0.75rem; color: var(--slate-400);">ห่างจุดพิกัด ${item.distance || 0} ม.</div>`;

      // Photo button / Thumbnail
      const photoBtn = item.photoBase64 
        ? `<button class="btn-photo-preview" onclick="window.viewPhoto('${item.photoBase64}')" title="คลิกเพื่อขยายดูรูป"><img src="${item.photoBase64}" alt="Photo"/></button>` 
        : `<span style="color:var(--slate-300); font-size:0.75rem;">ไม่มีรูป</span>`;

      html += `
        <tr>
          <td>${dateStr}</td>
          <td>${userText}</td>
          <td>${roomText}</td>
          <td style="font-weight: 500;">${outStr}</td>
          <td>${statusBadge}</td>
          <td>${photoBtn}</td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;
    lucide.createIcons();
  }

  // Filter Pills Event Listener
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.dataset.filter;
      renderTable();
    });
  });

  // Search Input Event Listener
  if (historySearch) {
    historySearch.addEventListener('input', () => {
      renderTable();
    });
  }

  // Global function to open lightbox
  window.viewPhoto = function(base64) {
    if (photoContent && photoModal) {
      photoContent.src = base64;
      photoModal.style.display = 'flex';
    }
  };

  loadAdminHistory();
});
