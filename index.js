import { initAuth, loginWithGoogle } from './auth.js';
import { getQueryParam } from './utils.js';
import { db, doc, getDoc } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', async () => {
  lucide.createIcons();
  
  const roomId = getQueryParam('room');
  const roomDisplay = document.getElementById('room-id-display');
  const loginBtn = document.getElementById('login-btn');
  const loginText = document.getElementById('login-text');

  if (!roomId) {
    roomDisplay.textContent = 'ไม่พบข้อมูลห้องเรียน';
    roomDisplay.style.color = 'var(--rose-600)';
    loginBtn.disabled = true;
    loginBtn.style.opacity = '0.5';
    loginBtn.style.cursor = 'not-allowed';
    loginText.textContent = 'กรุณาสแกน QR Code จากหน้าห้องเรียน';
  } else {
    roomDisplay.textContent = 'กำลังตรวจสอบห้องเรียน...';
    loginBtn.disabled = true;
    loginText.textContent = 'กำลังตรวจสอบ...';
    
    try {
      let isValidRoom = false;
      const roomSnap = await getDoc(doc(db, 'rooms', roomId));
      if (roomSnap.exists()) {
        isValidRoom = true;
      } else {
        // Fallback: Check if there is any schedule for this room
        const qSchedules = query(collection(db, 'schedules'), where('room', '==', roomId));
        const snapSchedules = await getDocs(qSchedules);
        if (!snapSchedules.empty) {
          isValidRoom = true;
        }
      }

      if (!isValidRoom) {
        roomDisplay.textContent = 'ไม่พบห้องเรียนนี้ในระบบ';
        roomDisplay.style.color = 'var(--rose-600)';
        loginBtn.disabled = true;
        loginBtn.style.opacity = '0.5';
        loginBtn.style.cursor = 'not-allowed';
        loginText.textContent = 'กรุณาสแกน QR Code ที่ถูกต้อง';
      } else {
        // ห้องถูกต้อง
        roomDisplay.textContent = roomId;
        loginBtn.disabled = false;
        loginText.textContent = 'เข้าสู่ระบบด้วย Google';
        
        // ตรวจสอบว่าเข้าระบบอยู่หรือไม่
        initAuth((user) => {
          if (user) {
            window.location.href = `menu.html?room=${roomId}`;
          }
        });
      }
    } catch(err) {
      console.error(err);
      roomDisplay.textContent = 'เกิดข้อผิดพลาดในการตรวจสอบ';
      roomDisplay.style.color = 'var(--rose-600)';
    }
  }

  loginBtn.addEventListener('click', async () => {
    loginBtn.disabled = true;
    loginText.textContent = 'กำลังเข้าสู่ระบบ...';
    
    try {
      await loginWithGoogle();
      window.location.href = `menu.html?room=${roomId}`;
    } catch (error) {
      console.error(error);
      alert(error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      loginBtn.disabled = false;
      loginText.textContent = 'เข้าสู่ระบบด้วย Google';
    }
  });

  const adminLoginBtn = document.getElementById('admin-login-btn');
  adminLoginBtn.addEventListener('click', () => {
    const password = prompt('กรุณาใส่รหัสผ่านสำหรับเจ้าหน้าที่:');
    // รหัสผ่านชั่วคราวสำหรับเจ้าหน้าที่ (สามารถเปลี่ยนได้ตามต้องการ)
    if (password === 'admin1234') {
      sessionStorage.setItem('isAdmin', 'true');
      window.location.href = 'admin.html';
    } else if (password !== null) {
      alert('รหัสผ่านไม่ถูกต้อง');
    }
  });
});
