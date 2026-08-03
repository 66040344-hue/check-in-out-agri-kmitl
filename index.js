import { initAuth, loginWithGoogle } from './auth.js';
import { checkAndBlockLineBrowser, getQueryParam, getTimeBasedGreeting } from './utils.js';
import { db, doc, getDoc, collection, query, where, getDocs } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (checkAndBlockLineBrowser()) return;
  lucide.createIcons();
  
  const greetingEl = document.getElementById('welcome-greeting');
  if (greetingEl) {
    greetingEl.textContent = getTimeBasedGreeting();
  }
  
  const roomId = getQueryParam('room');
  const roomDisplay = document.getElementById('room-id-display');
  const loginBtn = document.getElementById('login-btn');
  const loginText = document.getElementById('login-text');
  const roomInfoContainer = document.getElementById('room-info-container');
  const roomInstructions = document.getElementById('room-instructions');
  const noRoomActions = document.getElementById('no-room-actions');
  
  let html5QrCode = null;

  if (!roomId) {
    // ไม่มี Parameter เลขห้อง
    if (roomInfoContainer) roomInfoContainer.classList.add('hidden');
    if (roomInstructions) roomInstructions.classList.add('hidden');
    if (loginBtn) loginBtn.classList.add('hidden');
    if (noRoomActions) noRoomActions.classList.remove('hidden');

    // ถ้าเข้าด้วยระบบอยู่แล้ว แล้วพยายามดูก็ไปประวัติได้เลย
    initAuth((user) => {
      // User is authenticated
    });

  } else {
    // มี Parameter เลขห้อง
    if (noRoomActions) noRoomActions.classList.add('hidden');
    roomDisplay.textContent = 'กำลังตรวจสอบห้องเรียน...';
    loginBtn.disabled = true;
    loginText.textContent = 'กำลังตรวจสอบ...';
    
    try {
      let isValidRoom = false;
      const roomSnap = await getDoc(doc(db, 'rooms', encodeURIComponent(roomId)));
      if (roomSnap.exists()) {
        isValidRoom = true;
      } else {
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

  // Google login with room
  if (loginBtn) {
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
  }

  // View History Login Button (No room needed)
  const btnViewHistory = document.getElementById('btn-view-history');
  if (btnViewHistory) {
    btnViewHistory.addEventListener('click', async () => {
      btnViewHistory.disabled = true;
      try {
        await loginWithGoogle();
        window.location.href = 'history.html';
      } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
        btnViewHistory.disabled = false;
      }
    });
  }

  // Camera QR Scanner Modal Logic
  const btnScanCamera = document.getElementById('btn-scan-camera');
  const qrModal = document.getElementById('qr-scanner-modal');
  const btnCloseScanner = document.getElementById('btn-close-scanner');

  if (btnScanCamera && qrModal) {
    btnScanCamera.addEventListener('click', () => {
      qrModal.style.display = 'flex';
      
      if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("qr-reader");
      }
      
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          // Extracts room parameter or room name from URL or text
          let scannedRoom = decodedText.trim();
          if (scannedRoom.includes('room=')) {
            try {
              const url = new URL(scannedRoom);
              scannedRoom = url.searchParams.get('room') || scannedRoom;
            } catch (e) {
              const match = scannedRoom.match(/room=([^&]+)/);
              if (match) scannedRoom = match[1];
            }
          }
          
          stopScanner();
          window.location.href = `index.html?room=${encodeURIComponent(scannedRoom)}`;
        },
        (error) => {
          // silent error scanning frame
        }
      ).catch((err) => {
        console.error(err);
        alert("ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้งานกล้องในเบราว์เซอร์");
        qrModal.style.display = 'none';
      });
    });

    btnCloseScanner.addEventListener('click', stopScanner);
    
    qrModal.addEventListener('click', (e) => {
      if (e.target === qrModal) stopScanner();
    });
  }

  function stopScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
      html5QrCode.stop().then(() => {
        qrModal.style.display = 'none';
      }).catch(err => {
        console.error(err);
        qrModal.style.display = 'none';
      });
    } else {
      if (qrModal) qrModal.style.display = 'none';
    }
  }

  // Admin login button
  const adminLoginBtn = document.getElementById('admin-login-btn');
  if (adminLoginBtn) {
    adminLoginBtn.addEventListener('click', () => {
      const password = prompt('กรุณาใส่รหัสผ่านสำหรับเจ้าหน้าที่:');
      if (password === 'admin1234') {
        sessionStorage.setItem('isAdmin', 'true');
        window.location.href = 'admin.html';
      } else if (password !== null) {
        alert('รหัสผ่านไม่ถูกต้อง');
      }
    });
  }
});
