import { db, collection, query, where, getDocs } from './firebase-config.js';

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
