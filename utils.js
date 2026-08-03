import { db, collection, query, where, getDocs } from './firebase-config.js';

export function checkAndBlockLineBrowser() {
  const isLine = /Line/i.test(navigator.userAgent);
  if (isLine) {
    document.body.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 2rem; text-align: center; background-color: #f8fafc; font-family: 'Prompt', sans-serif;">
        <div style="width: 4rem; height: 4rem; background: #ef4444; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.3);">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <h2 style="font-size: 1.5rem; font-weight: bold; color: #0f172a; margin-bottom: 1rem;">ไม่รองรับการเปิดผ่าน LINE</h2>
        <p style="color: #475569; line-height: 1.6; font-size: 0.95rem; margin-bottom: 1.5rem;">
          กรุณากดที่ปุ่ม <strong style="color: #0f172a; font-size: 1.1rem;">3 จุด (⋮)</strong> มุมขวาล่าง<br>
          แล้วเลือก <strong style="color: #0f172a; font-size: 1.1rem;">"เปิดในเบราว์เซอร์อื่น"</strong><br>
          (Open in other browser)
        </p>
        <button onclick="navigator.clipboard.writeText(window.location.href).then(() => { this.innerHTML = '<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'18\\' height=\\'18\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><polyline points=\\'20 6 9 17 4 12\\'/></svg> คัดลอกแล้ว!'; setTimeout(() => this.innerHTML = '<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'18\\' height=\\'18\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><rect width=\\'14\\' height=\\'14\\' x=\\'8\\' y=\\'8\\' rx=\\'2\\' ry=\\'2\\'/><path d=\\'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\\'/></svg> คัดลอกลิงก์', 2000); }).catch(() => prompt('กรุณาคัดลอกลิงก์ด้านล่างนี้:', window.location.href))" style="background-color: #2563eb; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-family: 'Prompt', sans-serif; font-size: 1rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          คัดลอกลิงก์
        </button>
      </div>
    `;
    return true;
  }
  return false;
}

export function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) {
    return 'สวัสดีตอนเช้า';
  } else if (hour >= 10 && hour < 12) {
    return 'สวัสดีตอนสาย';
  } else if (hour >= 12 && hour < 16) {
    return 'สวัสดีตอนบ่าย';
  } else if (hour >= 16 && hour < 19) {
    return 'สวัสดีตอนเย็น';
  } else {
    return 'สวัสดีตอนค่ำ';
  }
}
// รัศมีโลกในหน่วยกิโลเมตร
const R = 6371;

/**
 * คำนวณระยะห่างระหว่างพิกัด 2 จุดโดยใช้ Haversine Formula (หน่วยเป็นเมตร)
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c * 1000; // แปลงเป็นเมตร
  return distance;
}

export function isClassEnded(endTimeStr, checkInDate) {
  if (!endTimeStr || !checkInDate) return false;

  // แปลง Date ของตอนนี้
  const now = new Date();

  // หากเลยวันที่ check-in มาแล้ว (ข้ามวัน) ถือว่าหมดเวลาแน่นอน
  // เพื่อความเรียบง่าย ถ้าวันที่ต่างกัน และเวลาปัจจุบัน มากกว่าเวลาเช็คอิน 24 ชม หรือเลยเที่ยงคืน
  // แต่วิธีที่ง่ายกว่าคือ เราเอาเวลาปัจจุบันมาคำนวณเปรียบเทียบกับเวลาจบของวิชานั้นในวันเดียวกัน

  const [endH, endM] = endTimeStr.split(':');
  const endMinutes = parseInt(endH || 0) * 60 + parseInt(endM || 0);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // ตรวจสอบว่าเช็คอินมานานเกิน 12 ชั่วโมงแล้วหรือยัง เพื่อป้องกันการลบผิดสำหรับวิชาข้ามคืน
  const diffHours = (now - checkInDate) / (1000 * 60 * 60);
  if (diffHours > 12) return true; // ถ้านานเกิน 12 ชม ถือว่าจบแล้วแน่ๆ

  // สำหรับวันเดียวกัน: ถ้า currentMinutes เลย endMinutes ถือว่าหมดเวลา (กรณีเวลาไม่ได้ข้ามคืน)
  // แต่ถ้าเช็คอินไปแล้วเวลาข้ามคืน เช่น เข้า 23:00 ออก 02:00
  // เราจะเช็คโดยอิงจากระยะเวลาที่เช็คอิน (diffHours) ถ้าหมดคลาสจริงก็ควรเกิน 

  // สร้าง Date object ของเวลาจบในวันที่เช็คอิน
  const endDate = new Date(checkInDate.getTime());
  endDate.setHours(parseInt(endH), parseInt(endM), 0, 0);

  // ถ้าเวลาจบน้อยกว่าเวลาเข้า ถือว่าข้ามคืน (เช่นเข้า 23:00 จบ 02:00) ให้บวกไป 1 วัน
  if (endDate < checkInDate && (checkInDate.getHours() * 60 + checkInDate.getMinutes() > endMinutes)) {
    endDate.setDate(endDate.getDate() + 1);
  }

  // ตอนนี้เวลาเกิน endDate หรือยัง?
  return now >= endDate;
}

export function compressImage(file, maxWidth = 800, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export function parseDMS(dmsString) {
  const regex = /(\d+)°(\d+)'([\d.]+)"([NS])\s+(\d+)°(\d+)'([\d.]+)"([EW])/i;
  const match = dmsString.match(regex);
  if (match) {
    let lat = parseInt(match[1]) + parseInt(match[2])/60 + parseFloat(match[3])/3600;
    if (match[4].toUpperCase() === 'S') lat = -lat;
    let lng = parseInt(match[5]) + parseInt(match[6])/60 + parseFloat(match[7])/3600;
    if (match[8].toUpperCase() === 'W') lng = -lng;
    return { lat, lng };
  }
  return null;
}

export function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position: fixed; top: 1rem; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; flex-direction: column; gap: 0.5rem; pointer-events: none;';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const bgColor = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#3b82f6');
  toast.style.cssText = `
    background: ${bgColor};
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 2rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    font-size: 0.875rem;
    font-weight: 500;
    opacity: 0;
    transform: translateY(-20px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  `;

  const icon = type === 'success' ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>' 
    : (type === 'error' ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>' 
    : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>');

  toast.innerHTML = `${icon} <span>${message}</span>`;
  container.appendChild(toast);

  // Trigger reflow
  toast.offsetHeight;

  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      toast.remove();
      if (container.childNodes.length === 0) {
        container.remove();
      }
    }, 300);
  }, 3000);
}

// ฟังก์ชันช่วยเหลือสำหรับอ่าน query params
export function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

export async function loadCurrentSubject(roomId, displayElementId, timeElementId = null, timeContainerId = null) {
  const subjectDisplay = document.getElementById(displayElementId);
  const timeDisplay = timeElementId ? document.getElementById(timeElementId) : null;
  const timeContainer = timeContainerId ? document.getElementById(timeContainerId) : null;

  if (!subjectDisplay) return;
  subjectDisplay.classList.remove('hidden');

  try {
    const now = new Date();
    const currentDayEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    const currentDayTh = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'][now.getDay()];
    const currentDayThFull = 'วัน' + currentDayTh;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // ดึงตารางทั้งหมดของห้องนี้มาตรวจสอบด้วย JS เพื่อความยืดหยุ่นในการเปรียบเทียบ
    const q = query(
      collection(db, 'schedules'),
      where('room', '==', roomId)
    );
    const snap = await getDocs(q);

    let activeSubject = null;
    let activeTimeStr = null;
    let activeSchedule = null;

    snap.forEach(doc => {
      const data = doc.data();
      const dbDay = (data.dayOfWeek || '').trim();

      // ตรวจสอบวัน (รองรับทั้งภาษาอังกฤษและภาษาไทย)
      const isMatchDay = dbDay.toLowerCase() === currentDayEn.toLowerCase() ||
        dbDay === currentDayTh ||
        dbDay === currentDayThFull;

      if (isMatchDay) {
        // ตรวจสอบเวลาโดยแปลงเป็นนาที
        let startMins = 0;
        let endMins = 0;

        if (data.startTime) {
          const [h, m] = data.startTime.split(':');
          startMins = parseInt(h || 0) * 60 + parseInt(m || 0);
        }

        if (data.endTime) {
          const [h, m] = data.endTime.split(':');
          endMins = parseInt(h || 0) * 60 + parseInt(m || 0);
        }

        let isTimeMatch = false;
        if (startMins <= endMins) {
          isTimeMatch = (currentMinutes >= startMins && currentMinutes <= endMins);
        } else {
          // ข้ามคืน (เช่น 23:00 - 02:00 หรือ 23:00 - 12:00)
          isTimeMatch = (currentMinutes >= startMins || currentMinutes <= endMins);
        }

        if (isTimeMatch) {
          activeSubject = data.subject;
          activeTimeStr = `${data.startTime} - ${data.endTime}`;
          activeSchedule = { id: doc.id, ...data };
        }
      }
    });

    if (activeSubject) {
      subjectDisplay.textContent = `วิชา: ${activeSubject}`;
      if (timeDisplay) timeDisplay.textContent = activeTimeStr;
      if (timeContainer) timeContainer.classList.remove('hidden');
      return activeSchedule;
    } else {
      subjectDisplay.textContent = 'ไม่มีการเรียนการสอนในเวลานี้';
      subjectDisplay.classList.replace('text-blue-600', 'text-slate-500');
      if (timeContainer) timeContainer.classList.add('hidden');
      return null;
    }
  } catch (error) {
    console.error("Error fetching subject:", error);
    subjectDisplay.textContent = 'ไม่สามารถดึงข้อมูลวิชาได้';
    subjectDisplay.classList.replace('text-blue-600', 'text-rose-500');
    return null;
  }
}
