import { initAuth, loginWithGoogle } from './auth.js';
import { getQueryParam } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  
  const roomId = getQueryParam('room') || 'Unknown';
  document.getElementById('room-id-display').textContent = roomId;
  
  const loginBtn = document.getElementById('login-btn');
  const loginText = document.getElementById('login-text');

  // ตรวจสอบว่าเข้าระบบอยู่หรือไม่
  initAuth((user) => {
    if (user) {
      // ถ้ามี user อยู่แล้ว พาไปเมนูหลักเลย
      window.location.href = `menu.html?room=${roomId}`;
    }
  });

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
