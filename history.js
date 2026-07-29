import { initAuth } from './auth.js';
import { db, collection, query, where, orderBy, getDocs, updateDoc, serverTimestamp } from './firebase-config.js';
import { isClassEnded } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  
  let currentUser = null;
  const historyContainer = document.getElementById('history-container');

  initAuth(async (user) => {
    if (!user) {
      window.location.href = `index.html`;
    } else {
      currentUser = user;
      document.getElementById('user-name').textContent = user.displayName;
      document.getElementById('user-email').textContent = user.email;
      
      await loadHistory();
    }
  });

  async function loadHistory() {
    try {
      const q = query(
        collection(db, 'sessions'), 
        where('userId', '==', currentUser.uid)
      );
      
      const snap = await getDocs(q);
      
      if (snap.empty) {
        historyContainer.innerHTML = `
          <div class="text-center text-slate-500" style="padding: 2rem; background: white; border-radius: 0.75rem; border: 1px dashed var(--slate-200);">
            <i data-lucide="history" style="width: 48px; height: 48px; color: var(--slate-300); margin: 0 auto 1rem auto;"></i>
            <p>ยังไม่มีประวัติการเข้าใช้งาน</p>
          </div>
        `;
        lucide.createIcons();
        return;
      }

      // เรียงลำดับตาม checkInTime ล่าสุดก่อนใน JS เพื่อไม่ต้องสร้าง Composite Index บน Firebase
      const sortedDocs = snap.docs.sort((a, b) => {
        const timeA = a.data().checkInTime ? a.data().checkInTime.toMillis() : 0;
        const timeB = b.data().checkInTime ? b.data().checkInTime.toMillis() : 0;
        return timeB - timeA;
      });

      historyContainer.innerHTML = '';
      
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

        const card = document.createElement('div');
        card.className = 'card';
        card.style.padding = '1rem';
        
        // Format Date and Time
        const checkInStr = data.checkInTime 
          ? `${checkInDate.toLocaleDateString('th-TH')} ${checkInDate.toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}`
          : '-';
          
        let checkOutStr = '-';
        if (data.checkOutTime) {
          const outDate = data.checkOutTime.toDate();
          checkOutStr = `${outDate.toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}`;
        }
        
        // Status Badge
        let statusHtml = '';
        if (status === 'checked_in') {
          statusHtml = `<span style="background: var(--blue-100); color: var(--blue-700); padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: bold;">กำลังใช้งาน</span>`;
        } else if (status === 'checked_out') {
          statusHtml = `<span style="background: var(--emerald-100); color: var(--emerald-700); padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: bold;">ลงชื่อออกแล้ว</span>`;
        } else if (status === 'auto_checked_out') {
          statusHtml = `<span style="background: var(--rose-100); color: var(--rose-700); padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: bold;">ไม่ได้ลงชื่อออก</span>`;
        }

        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            <div>
              <p style="font-weight: bold; color: var(--slate-800); font-size: 1.125rem;">ห้อง ${data.roomId || 'Unknown'}</p>
              <p style="font-size: 0.875rem; color: var(--slate-600); margin-top: 0.125rem;">วิชา: ${data.subject || '-'}</p>
            </div>
            <div>${statusHtml}</div>
          </div>
          
          <div style="background: var(--slate-50); border-radius: 0.5rem; padding: 0.75rem; border: 1px solid var(--slate-100);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span style="font-size: 0.875rem; color: var(--slate-500);">เข้าเรียน:</span>
              <span style="font-size: 0.875rem; color: var(--slate-700); font-weight: 500;">${checkInStr}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 0.875rem; color: var(--slate-500);">ออกเรียน:</span>
              <span style="font-size: 0.875rem; color: ${status === 'auto_checked_out' ? 'var(--rose-600)' : 'var(--slate-700)'}; font-weight: 500;">
                ${status === 'auto_checked_out' ? 'หมดเวลา (ไม่ได้ลงชื่อออก)' : checkOutStr}
              </span>
            </div>
          </div>
        `;
        
        historyContainer.appendChild(card);
      }
      lucide.createIcons();
      
    } catch (error) {
      console.error(error);
      historyContainer.innerHTML = `<p class="text-center text-rose-500">เกิดข้อผิดพลาดในการโหลดประวัติ</p>`;
    }
  }
});
