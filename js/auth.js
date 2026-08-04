// ============================================================
// AUTH.JS - Firebase Firestore-based Auth (Cross-device ready)
// ============================================================

const DB_FIELDS = 'soil_app_fields';
const DB_STANDARDS = 'soil_app_standards';

// Super Admin Config (ไม่เก็บใน Firestore เพราะเป็น hardcoded ระดับระบบ)
const SUPER_ADMIN = {
    id: 'superadmin_1',
    name: 'Super Admin (ผู้ดูแลระบบสูงสุด)',
    phone: 'Saharat125',
    password: 'Saharat010203',
    role: 'superadmin',
    is_approved: true,
    email: 'superadmin@soil.com',
    created_at: '2024-01-01T00:00:00.000Z'
};

// ตรวจสอบว่า Super Admin มีในระบบ Firebase หรือไม่ ถ้าไม่มีให้สร้าง
async function ensureSuperAdminExists() {
    try {
        const ref = db.collection('users').doc('superadmin_1');
        const snap = await ref.get();
        if (!snap.exists) {
            await ref.set(SUPER_ADMIN);
            console.log('[Auth] Super Admin created in Firestore.');
        }
    } catch (err) {
        console.warn('[Auth] Could not check Super Admin in Firestore:', err);
    }
}

// UI Elements
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const waitingView = document.getElementById('waiting-view');

const showRegisterBtn = document.getElementById('show-register');
const showLoginBtn = document.getElementById('show-login');
const logoutWaitingBtn = document.getElementById('logout-waiting-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// View Switching
function switchView(viewId) {
    [loginView, registerView, waitingView].forEach(view => {
        if (!view) return;
        view.classList.add('hidden');
        view.classList.remove('animate-fade-in');
    });
    const activeView = document.getElementById(viewId);
    if (activeView) {
        activeView.classList.remove('hidden');
        void activeView.offsetWidth;
        activeView.classList.add('animate-fade-in');
    }
}

// Show loading state on button
function setButtonLoading(btn, loading, originalText) {
    if (!btn) return;
    if (loading) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังดำเนินการ...';
    } else {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

if (showRegisterBtn) {
    showRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchView('register-view');
    });
}

if (showLoginBtn) {
    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchView('login-view');
    });
}

if (logoutWaitingBtn) {
    logoutWaitingBtn.addEventListener('click', () => {
        localStorage.removeItem('current_user');
        switchView('login-view');
    });
}

// ============================================================
// LOGIN LOGIC (Firebase Firestore)
// ============================================================
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
        setButtonLoading(submitBtn, true, originalBtnText);

        const phoneInput = document.getElementById('login-phone').value.trim();
        const password = document.getElementById('login-password').value;

        try {
            // ---- 1. ตรวจสอบ Super Admin ก่อน (Hardcoded) ----
            if (phoneInput === SUPER_ADMIN.phone && password === SUPER_ADMIN.password) {
                await ensureSuperAdminExists();
                localStorage.setItem('current_user', JSON.stringify(SUPER_ADMIN));
                window.location.href = 'admin.html';
                return;
            }

            // ---- 2. ค้นหาจาก Firestore ----
            const snapshot = await db.collection('users')
                .where('phone', '==', phoneInput)
                .where('password', '==', password)
                .get();

            if (snapshot.empty) {
                alert('เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง');
                setButtonLoading(submitBtn, false, originalBtnText);
                return;
            }

            const userDoc = snapshot.docs[0];
            const user = { id: userDoc.id, ...userDoc.data() };

            localStorage.setItem('current_user', JSON.stringify(user));

            if (user.role === 'admin' || user.role === 'superadmin') {
                window.location.href = 'admin.html';
            } else {
                if (user.is_approved) {
                    window.location.href = 'dashboard.html';
                } else {
                    switchView('waiting-view');
                }
            }
        } catch (err) {
            console.error('[Auth] Login error:', err);
            alert('เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง');
            setButtonLoading(submitBtn, false, originalBtnText);
        }
    });
}

// ============================================================
// REGISTER LOGIC (Firebase Firestore)
// ============================================================
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
        setButtonLoading(submitBtn, true, originalBtnText);

        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const phone = document.getElementById('reg-phone').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;

        // Validation
        if (password !== confirmPassword) {
            alert('รหัสผ่านไม่ตรงกัน');
            setButtonLoading(submitBtn, false, originalBtnText);
            return;
        }

        if (password.length < 6) {
            alert('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
            setButtonLoading(submitBtn, false, originalBtnText);
            return;
        }

        try {
            // ตรวจสอบว่าเบอร์โทรซ้ำหรือไม่
            const existing = await db.collection('users')
                .where('phone', '==', phone)
                .get();

            if (!existing.empty) {
                alert('เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว กรุณาใช้เบอร์อื่น');
                setButtonLoading(submitBtn, false, originalBtnText);
                return;
            }

            const newUser = {
                name,
                email,
                phone,
                password, // NOTE: ในระบบจริงควรใช้ Firebase Auth หรือ hash password
                role: 'user',
                is_approved: false,
                created_at: new Date().toISOString()
            };

            // บันทึกเข้า Firestore
            const docRef = await db.collection('users').add(newUser);
            const savedUser = { id: docRef.id, ...newUser };

            localStorage.setItem('current_user', JSON.stringify(savedUser));
            switchView('waiting-view');
            registerForm.reset();

        } catch (err) {
            console.error('[Auth] Register error:', err);
            alert('เกิดข้อผิดพลาดในการสมัครสมาชิก กรุณาลองใหม่อีกครั้ง');
            setButtonLoading(submitBtn, false, originalBtnText);
        }
    });
}

// ============================================================
// WAITING VIEW - Poll Firestore for approval
// ============================================================
(function pollApprovalStatus() {
    const stored = localStorage.getItem('current_user');
    if (!stored) return;

    const user = JSON.parse(stored);
    if (!user || user.role !== 'user' || user.is_approved) return;

    // ถ้าอยู่ที่หน้า waiting-view ให้ตรวจสอบทุก 10 วินาที
    const waiting = document.getElementById('waiting-view');
    if (!waiting || waiting.classList.contains('hidden')) return;

    const interval = setInterval(async () => {
        try {
            const snap = await db.collection('users').doc(user.id).get();
            if (snap.exists && snap.data().is_approved) {
                clearInterval(interval);
                const updatedUser = { id: snap.id, ...snap.data() };
                localStorage.setItem('current_user', JSON.stringify(updatedUser));
                alert('บัญชีของคุณได้รับการอนุมัติแล้ว! กำลังพาเข้าสู่ระบบ...');
                window.location.href = 'dashboard.html';
            }
        } catch (err) {
            console.warn('[Auth] Poll error:', err);
        }
    }, 10000); // ตรวจทุก 10 วินาที
})();

// Init
ensureSuperAdminExists();
