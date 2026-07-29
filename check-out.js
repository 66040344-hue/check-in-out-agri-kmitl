import { initAuth } from './auth.js';
import { getQueryParam, loadCurrentSubject } from './utils.js';
import { db, collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  
  const roomId = getQueryParam('room') || 'Unknown';
  document.getElementById('room-id-display').textContent = roomId;
  loadCurrentSubject(roomId, 'subject-display');
  document.getElementById('success-room').textContent = `ห้อง ${roomId}`;
  
  let currentUser = null;
  let sessionDocId = null;
  let checkInDate = null;
  let minutesUsed = 0;

  const btnSubmit = document.getElementById('btn-submit');
  const checkEquip = document.getElementById('check-equip');
  const checkApp = document.getElementById('check-app');
  const checkEquipCard = document.getElementById('check-equip-card');
  const checkAppCard = document.getElementById('check-app-card');
  
  initAuth((user) => {
    if (!user) {
      window.location.href = `index.html?room=${roomId}`;
    } else {
      currentUser = user;
      fetchSession();
    }
  });

  async function fetchSession() {
    try {
      const q = query(
        collection(db, 'sessions'), 
        where('userId', '==', currentUser.uid),
        where('roomId', '==', roomId),
        where('status', '==', 'checked_in')
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        showScreen('no-session-screen');
        return;
      }

      const session = querySnapshot.docs[0];
      sessionDocId = session.id;
      
      const sessionData = session.data();
      checkInDate = sessionData.checkInTime ? sessionData.checkInTime.toDate() : new Date();
      
      updateTime();
      showScreen('form-screen');
    } catch (err) {
      console.error(err);
      showScreen('no-session-screen');
    }
  }

  function updateTime() {
    const now = new Date();
    const diffMs = now.getTime() - checkInDate.getTime();
    minutesUsed = Math.floor(diffMs / 60000);
    renderTimeUI();
  }

  function renderTimeUI() {
    const isTimeValid = minutesUsed >= 30;
    
    const timeStatusContainer = document.getElementById('time-status-container');
    const timeIcon = document.getElementById('time-icon');
    const timeLabel = document.getElementById('time-label');
    const timeValue = document.getElementById('time-value');
    const timeWarning = document.getElementById('time-warning');

    const hours = Math.floor(minutesUsed / 60);
    const mins = minutesUsed % 60;
    timeValue.textContent = `${hours} ชม. ${mins} นาที`;

    if (isTimeValid) {
      timeStatusContainer.style.backgroundColor = 'var(--blue-50)';
      timeIcon.style.color = 'var(--blue-600)';
      timeLabel.style.color = 'var(--blue-700)';
      timeValue.style.color = 'var(--blue-800)';
      timeWarning.classList.add('hidden');
      
      // Enable checkboxes
      checkEquip.disabled = false;
      checkApp.disabled = false;
      checkEquipCard.classList.remove('disabled');
      checkAppCard.classList.remove('disabled');
    } else {
      timeStatusContainer.style.backgroundColor = 'var(--rose-50)';
      timeIcon.style.color = 'var(--rose-600)';
      timeLabel.style.color = 'var(--rose-700)';
      timeValue.style.color = 'var(--rose-800)';
      timeWarning.classList.remove('hidden');
      timeWarning.style.display = 'flex';
      
      // Disable checkboxes
      checkEquip.disabled = true;
      checkApp.disabled = true;
      checkEquipCard.classList.add('disabled');
      checkAppCard.classList.add('disabled');
    }
    
    checkCanSubmit();
  }

  function updateCardStyle(checkbox, cardId, titleId, descId) {
    const card = document.getElementById(cardId);
    const title = document.getElementById(titleId);
    const desc = document.getElementById(descId);
    
    if (checkbox.checked) {
      card.classList.add('checked');
      title.style.color = 'var(--emerald-800)';
      desc.style.color = 'var(--emerald-600)';
    } else {
      card.classList.remove('checked');
      title.style.color = 'var(--slate-700)';
      desc.style.color = 'var(--slate-500)';
    }
    checkCanSubmit();
  }

  checkEquip.addEventListener('change', () => updateCardStyle(checkEquip, 'check-equip-card', 'check-equip-title', 'check-equip-desc'));
  checkApp.addEventListener('change', () => updateCardStyle(checkApp, 'check-app-card', 'check-app-title', 'check-app-desc'));

  function checkCanSubmit() {
    const isTimeValid = minutesUsed >= 30;
    btnSubmit.disabled = !(isTimeValid && checkEquip.checked && checkApp.checked);
  }


  btnSubmit.addEventListener('click', async () => {
    if (!sessionDocId) return;
    
    btnSubmit.disabled = true;
    const oldText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = 'กำลังบันทึก...';
    
    try {
      await updateDoc(doc(db, 'sessions', sessionDocId), {
        status: 'checked_out',
        checkOutTime: serverTimestamp(),
        checkOutChecklist: {
          equipment: checkEquip.checked,
          appliances: checkApp.checked
        }
      });
      
      // Set success screen texts
      const checkInTimeStr = checkInDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute:'2-digit' });
      const checkOutTimeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute:'2-digit' });
      document.getElementById('success-time-range').textContent = `${checkInTimeStr} - ${checkOutTimeStr}`;
      
      const hours = Math.floor(minutesUsed / 60);
      const mins = minutesUsed % 60;
      document.getElementById('success-total-time').textContent = `${hours} ชม. ${mins} นาที`;

      showScreen('success-screen');
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = oldText;
    }
  });

  document.getElementById('btn-home').addEventListener('click', () => {
    window.location.href = `index.html?room=${roomId}`;
  });

  function showScreen(screenId) {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('no-session-screen').classList.add('hidden');
    document.getElementById('success-screen').classList.add('hidden');
    document.getElementById('form-screen').classList.add('hidden');
    
    document.getElementById(screenId).classList.remove('hidden');
  }
});
