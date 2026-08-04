// Check auth - require admin or superadmin role
let currentUser = JSON.parse(localStorage.getItem('current_user'));

if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
    // Not authorized - redirect to login
    window.location.href = 'index.html';
}

if (document.getElementById('admin-name')) {
    document.getElementById('admin-name').textContent = currentUser.name;
}

// Theme Management System (Light / Dark Mode Toggle)
window.toggleTheme = function () {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    if (newTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }

    localStorage.setItem('soil_app_theme', newTheme);
    updateThemeIcons(newTheme);
};

function updateThemeIcons(theme) {
    document.querySelectorAll('.theme-icon').forEach(icon => {
        if (theme === 'dark') {
            icon.className = 'fas fa-sun theme-icon';
            icon.style.color = '#fbbf24';
        } else {
            icon.className = 'fas fa-moon theme-icon';
            icon.style.color = 'inherit';
        }
    });
}

function initTheme() {
    const savedTheme = localStorage.getItem('soil_app_theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    updateThemeIcons(savedTheme);
}
initTheme();

// Constants
const DB_USERS = 'soil_app_users';
const DB_FIELDS = 'soil_app_fields';
const DB_STANDARDS = 'soil_app_standards';
const DB_ADVICES = 'soil_app_advices';

// Firebase Sync Functions for Crops
let currentCropId = 'general';

window.loadCropStandards = async function(cropId) {
    currentCropId = cropId;
    try {
        const docRef = db.collection('crop_standards').doc(cropId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const data = docSnap.data();
            localStorage.setItem(DB_FIELDS, JSON.stringify(data.fields || []));
            localStorage.setItem(DB_STANDARDS, JSON.stringify(data.standards || []));
            localStorage.setItem(DB_ADVICES, JSON.stringify(data.advices || []));
        } else {
            // If doesn't exist (e.g. new crop selected or first time loading 'general')
            if (cropId === 'general') {
                // Seed default data for general
                await seedDefaultGeneralCrop();
            } else if (cropId === 'durian') {
                await seedDurianCrop();
            } else {
                localStorage.setItem(DB_FIELDS, JSON.stringify([]));
                localStorage.setItem(DB_STANDARDS, JSON.stringify([]));
                localStorage.setItem(DB_ADVICES, JSON.stringify([]));
            }
        }
        
        const btnReset = document.getElementById('btn-reset-general');
        if (btnReset) {
            btnReset.style.display = (cropId === 'general' || cropId === 'durian') ? 'inline-block' : 'none';
        }

        // Auto-migration for legacy {{ }} formulas
        let advicesList = JSON.parse(localStorage.getItem(DB_ADVICES)) || [];
        let hasLegacy = false;
        let currentFormulas = getFormulas();

        advicesList.forEach(adv => {
            if (adv.adviceText && adv.adviceText.includes('{{') && adv.adviceText.includes('}}')) {
                hasLegacy = true;
                const match = adv.adviceText.match(/\{\{(.*?)\}\}/);
                if (match) {
                    const rawFormula = match[1].trim();
                    let formulaId = 'migrated_' + Date.now() + '_' + Math.floor(Math.random()*1000);
                    
                    const existing = currentFormulas.find(f => f.expression === rawFormula);
                    if (existing) {
                        formulaId = existing.id;
                    } else {
                        currentFormulas.push({
                            id: formulaId,
                            name: 'สูตรประเมิน (สร้างอัตโนมัติ)',
                            expression: rawFormula
                        });
                    }

                    // Remove {{}} and the unit wrapped around it if present
                    let newText = adv.adviceText.replace(/จำนวน\s*\{\{.*?\}\}\s*กก\.\/ไร่/g, '').trim();
                    if (newText === adv.adviceText) {
                        newText = adv.adviceText.replace(/\{\{.*?\}\}/g, '').trim();
                    }
                    
                    adv.adviceText = newText;
                    adv.formulaId = formulaId;
                }
            }
        });

        if (hasLegacy) {
            saveFormulas(currentFormulas);
            saveAdvices(advicesList);
        }
        
        renderFieldsStandardsTable();
    } catch (error) {
        console.error("Error loading crop standards: ", error);
        alert("เกิดข้อผิดพลาดในการโหลดข้อมูลจาก Firebase");
    }
};

async function seedDefaultGeneralCrop() {
    const defaultFields = [
        { id: '1', name: 'pH (ค่ากรด-ด่างในดิน)', unit: 'ไม่มี', type: 'number' },
        { id: '2', name: 'OM (อินทรียวัตถุในดิน)', unit: '%', type: 'number' },
        { id: '3', name: 'K (โพแทสเซียม)', unit: 'mg/kg', type: 'number' },
        { id: '4', name: 'P (ฟอสฟอรัส)', unit: 'mg/kg', type: 'number' },
        { id: '5', name: 'Ca (แคลเซียม)', unit: 'mg/kg', type: 'number' },
        { id: '6', name: 'Mg (แมกนีเซียม)', unit: 'mg/kg', type: 'number' },
        { id: '7', name: 'Fe (เหล็ก)', unit: 'mg/kg', type: 'number' },
        { id: '8', name: 'Zn (สังกะสี)', unit: 'mg/kg', type: 'number' },
        { id: '9', name: 'Cu (ทองแดง)', unit: 'mg/kg', type: 'number' },
        { id: '10', name: 'B (โบรอน)', unit: 'mg/kg', type: 'number' },
        { id: '11', name: 'Mn (แมงกานีส)', unit: 'mg/kg', type: 'number' }
    ];
    const defaultStandards = [
        { id: '1', fieldId: '1', minVal: 5, maxVal: 7, idealVal: '5.5 - 6.5', crops: 'ยังไม่ได้กำหนด', fertilizers: 'ยังไม่ได้กำหนด' },
        { id: '2', fieldId: '2', minVal: 2, maxVal: 3, idealVal: '2 - 3', crops: 'ยังไม่ได้กำหนด', fertilizers: 'ยังไม่ได้กำหนด' },
        { id: '3', fieldId: '3', minVal: 35, maxVal: 60, idealVal: '35 - 60', crops: 'ยังไม่ได้กำหนด', fertilizers: 'ยังไม่ได้กำหนด' },
        { id: '4', fieldId: '4', minVal: 100, maxVal: 120, idealVal: '100 - 120', crops: 'ยังไม่ได้กำหนด', fertilizers: 'ยังไม่ได้กำหนด' },
        { id: '5', fieldId: '5', minVal: 800, maxVal: 1500, idealVal: '800 - 1500', crops: 'ยังไม่ได้กำหนด', fertilizers: 'ยังไม่ได้กำหนด' },
        { id: '6', fieldId: '6', minVal: 250, maxVal: 450, idealVal: '250 - 450', crops: 'ยังไม่ได้กำหนด', fertilizers: 'ยังไม่ได้กำหนด' },
        { id: '7', fieldId: '7', minVal: 60, maxVal: 70, idealVal: '60 - 70', crops: 'ยังไม่ได้กำหนด', fertilizers: 'ยังไม่ได้กำหนด' },
        { id: '8', fieldId: '8', minVal: 3, maxVal: 15, idealVal: '3 - 15', crops: 'ยังไม่ได้กำหนด', fertilizers: 'ยังไม่ได้กำหนด' },
        { id: '9', fieldId: '9', minVal: 3, maxVal: 5, idealVal: '3 - 5', crops: 'ยังไม่ได้กำหนด', fertilizers: 'ยังไม่ได้กำหนด' },
        { id: '10', fieldId: '10', minVal: 4, maxVal: 6, idealVal: '4 - 6', crops: 'ยังไม่ได้กำหนด', fertilizers: 'ยังไม่ได้กำหนด' },
        { id: '11', fieldId: '11', minVal: 20, maxVal: 60, idealVal: '20 - 60', crops: 'ยังไม่ได้กำหนด', fertilizers: 'ยังไม่ได้กำหนด' }
    ];
    const defaultAdvices = [];

    try {
        await db.collection('crop_standards').doc('general').set({
            name: "ดินทั่วไป",
            fields: defaultFields,
            standards: defaultStandards,
            advices: defaultAdvices
        });
        localStorage.setItem(DB_FIELDS, JSON.stringify(defaultFields));
        localStorage.setItem(DB_STANDARDS, JSON.stringify(defaultStandards));
        localStorage.setItem(DB_ADVICES, JSON.stringify(defaultAdvices));
    } catch (e) {
        console.error(e);
    }
}

async function seedDurianCrop() {
    const defaultFields = [
        { id: '1', name: 'pH (ความเป็นกรด-ด่าง)', unit: 'ไม่มี', type: 'number' },
        { id: '2', name: 'OM (อินทรียวัตถุ)', unit: '%', type: 'number' },
        { id: '3', name: 'P (ฟอสฟอรัสที่เป็นประโยชน์)', unit: 'mg/kg', type: 'number' },
        { id: '4', name: 'K (โพแทสเซียมที่แลกเปลี่ยนได้)', unit: 'mg/kg', type: 'number' },
        { id: '5', name: 'Ca (แคลเซียม)', unit: 'mg/kg', type: 'number' },
        { id: '6', name: 'Mg (แมกนีเซียม)', unit: 'mg/kg', type: 'number' },
        { id: '7', name: 'B (โบรอน)', unit: 'mg/kg', type: 'number' },
        { id: '8', name: 'Zn (สังกะสี)', unit: 'mg/kg', type: 'number' }
    ];
    const defaultStandards = [
        { id: '1', fieldId: '1', minVal: 5.5, maxVal: 6.5, idealVal: '5.5 - 6.5', crops: 'ทุเรียน', fertilizers: 'ตามคำแนะนำ' },
        { id: '2', fieldId: '2', minVal: 2.5, maxVal: 3.0, idealVal: '> 2.5 - 3.0 %', crops: 'ทุเรียน', fertilizers: 'ตามคำแนะนำ' },
        { id: '3', fieldId: '3', minVal: 20, maxVal: 40, idealVal: '20 - 40', crops: 'ทุเรียน', fertilizers: 'ตามคำแนะนำ' },
        { id: '4', fieldId: '4', minVal: 150, maxVal: 300, idealVal: '> 150', crops: 'ทุเรียน', fertilizers: 'ตามคำแนะนำ' },
        { id: '5', fieldId: '5', minVal: 1000, maxVal: 2500, idealVal: '> 1,000', crops: 'ทุเรียน', fertilizers: 'ตามคำแนะนำ' },
        { id: '6', fieldId: '6', minVal: 100, maxVal: 200, idealVal: '> 100', crops: 'ทุเรียน', fertilizers: 'ตามคำแนะนำ' },
        { id: '7', fieldId: '7', minVal: 1.0, maxVal: 2.0, idealVal: '1.0 - 2.0', crops: 'ทุเรียน', fertilizers: 'ตามคำแนะนำ' },
        { id: '8', fieldId: '8', minVal: 2.0, maxVal: 5.0, idealVal: '2.0 - 5.0', crops: 'ทุเรียน', fertilizers: 'ตามคำแนะนำ' }
    ];
    const defaultAdvices = [
        { id: 'adv_1', fieldId: '1', minVal: 0, maxVal: 5.49, formulaId: 'durian_dolomite', adviceText: 'ดินเป็นกรด: ต้องใส่ปูนโดโลไมต์เพิ่มเติม (สำหรับดินร่วนปนทราย) บริเวณทรงพุ่มแล้วให้น้ำตาม เพื่อเพิ่ม pH และเสริม Ca/Mg' },
        { id: 'adv_2', fieldId: '1', minVal: 6.51, maxVal: 14, adviceText: 'ดินเป็นด่าง: เลือกใช้ปุ๋ยไนโตรเจนที่มีฤทธิ์เป็นกรด เช่น แอมโมเนียมซัลเฟต (21-0-0) แทนยูเรีย หรือใช้กำมะถันผง 100-200 กรัม/ต้น' },
        { id: 'adv_3', fieldId: '2', minVal: 0, maxVal: 2.49, formulaId: 'durian_om', adviceText: 'เติมปุ๋ยหมัก/ปุ๋ยคอกที่หมักสมบูรณ์แล้ว (ทยอยแบ่งใส่รายปี ปีละ 2,000-3,000 กก.) และตัดหญ้าคลุมโคนต้น' },
        { id: 'adv_4', fieldId: '2', minVal: 3.01, maxVal: 100, adviceText: 'หาก OM สูงไปในพื้นที่ดินเหนียว อาจทำให้อุ้มน้ำมากไป ให้ลดการใส่ปุ๋ยอินทรีย์และเน้นการระบายอากาศที่โคนต้น' },
        { id: 'adv_5', fieldId: '3', minVal: 0, maxVal: 19.9, formulaId: 'durian_p', adviceText: 'ปริมาณฟอสฟอรัสต่ำ: ต้องการเนื้อธาตุ P ให้เติมปุ๋ยเคมีสูตรตัวกลางสูงช่วงสะสมอาหารทำดอก เช่น 8-24-24' },
        { id: 'adv_6', fieldId: '3', minVal: 40.1, maxVal: 9999, adviceText: 'ฟอสฟอรัสสูงจะล็อค Zn และ Fe ทำให้ใบเล็กเหลือง ให้างดปุ๋ยสูตรตัวกลางสูง และฉีดพ่น Zn และ Fe ทางใบแทน' },
        { id: 'adv_7', fieldId: '4', minVal: 0, maxVal: 149.9, formulaId: 'durian_k', adviceText: 'ปริมาณโพแทสเซียมต่ำ: ใช้ปุ๋ยโพแทสเซียมซัลเฟต (0-0-50) ช่วง 60 วันหลังดอกบานเพื่อขยายพู แบ่งใส่ 2-3 ครั้ง' },
        { id: 'adv_8', fieldId: '4', minVal: 300.1, maxVal: 9999, adviceText: 'โพแทสเซียมมากไปจะต้านการดูดซึม Ca/Mg ให้างดปุ๋ย K ชั่วคราว และอัด Ca/Mg ทางใบเสริม' },
        { id: 'adv_9', fieldId: '5', minVal: 0, maxVal: 999.9, formulaId: 'durian_ca', adviceText: 'แคลเซียมต่ำ: ต้องการเนื้อธาตุ Ca บริสุทธิ์ ถ้า pH ปกติให้ใช้ยิปซัม (ถ้าต่ำใช้โดโลไมต์) ควบคู่กับพ่นแคลเซียม-โบรอนทางใบ' },
        { id: 'adv_10', fieldId: '5', minVal: 2500.1, maxVal: 99999, adviceText: 'ดินที่ใส่โดโลไมต์ซ้ำซาก Ca จะสูงไปกดการกิน K และ Mg ต้องฉีดพ่น K และ Mg ทางใบช่วย' },
        { id: 'adv_11', fieldId: '6', minVal: 0, maxVal: 99.9, formulaId: 'durian_mg', adviceText: 'แมกนีเซียมต่ำ: ป้องกันใบเหลืองร่วง ให้ใช้คีเซอไรต์ (Mg 15%) ทางดิน หรือฉีดพ่นแมกนีเซียมเดี่ยวทางใบ' },
        { id: 'adv_12', fieldId: '6', minVal: 200.1, maxVal: 9999, adviceText: 'ปรับให้สมดุลกับสัดส่วน Ca โดยอัตราส่วน Ca:Mg ในดินที่เหมาะสมคือประมาณ 4:1 ถึง 6:1' },
        { id: 'adv_13', fieldId: '7', minVal: 0, maxVal: 0.99, formulaId: 'durian_b', adviceText: 'โบรอนต่ำ: ต้องการโบรอนเพิ่มเติม ให้พ่นโบรอนทางใบ หรือบอแรกซ์ทางดิน (ห้ามใส่เกินเด็ดขาด เพราะเป็นพิษต่อพืชง่ายมาก)' },
        { id: 'adv_14', fieldId: '7', minVal: 2.01, maxVal: 999, adviceText: 'เกิดภาวะโบรอนเป็นพิษ ทุเรียนจะมีอาการปลายใบไหม้ ให้รดน้ำชะล้างออก และงดการพ่นแคลเซียม-โบรอน' },
        { id: 'adv_15', fieldId: '8', minVal: 0, maxVal: 1.99, formulaId: 'durian_zn', adviceText: 'สังกะสีต่ำ: ต้องการซิงค์เพิ่มเติม แก้อาการใบแก้ว/ใบเล็ก โดยฉีดพ่นซิงค์คีเลต หรือหว่านซิงค์ซัลเฟตทางดิน' },
        { id: 'adv_16', fieldId: '8', minVal: 5.01, maxVal: 999, adviceText: 'สังกะสีที่สูงจะไปกดการดูดซึมเหล็ก มักเกิดจากการใช้ยากำจัดเชื้อราที่มีสังกะสีอย่างต่อเนื่อง ให้สลับกลุ่มยา และฉีดพ่นเหล็ก (Fe) เสริมทางใบ' }
    ];

    let formulas = getFormulas();
    const durianFormulas = [
        { id: 'durian_dolomite', name: 'คำนวณโดโลไมต์ทุเรียน', expression: '(6.0 - val) * 250' },
        { id: 'durian_om', name: 'คำนวณปุ๋ยหมัก 25%', expression: '(2.5 - val) * 20000 * (100 / 25)' },
        { id: 'durian_p', name: 'คำนวณฟอสฟอรัสทุเรียน', expression: '(30 - val) * 2' },
        { id: 'durian_k', name: 'คำนวณโพแทสเซียมซัลเฟต', expression: '((150 - val) * 2) / 50 * 100' },
        { id: 'durian_ca', name: 'คำนวณแคลเซียมทุเรียน', expression: '(1500 - val) * 2' },
        { id: 'durian_mg', name: 'คำนวณแมกนีเซียมคีเซอไรต์', expression: '((150 - val) * 2) / 15 * 100' },
        { id: 'durian_b', name: 'คำนวณโบรอนทุเรียน', expression: '(1.5 - val) * 2' },
        { id: 'durian_zn', name: 'คำนวณสังกะสีทุเรียน', expression: '(3.5 - val) * 2' }
    ];
    
    durianFormulas.forEach(df => {
        if (!formulas.find(f => f.id === df.id)) {
            formulas.push(df);
        }
    });
    saveFormulas(formulas);

    try {
        await db.collection('crop_standards').doc('durian').set({
            name: "ทุเรียน",
            fields: defaultFields,
            standards: defaultStandards,
            advices: defaultAdvices
        });
        localStorage.setItem(DB_FIELDS, JSON.stringify(defaultFields));
        localStorage.setItem(DB_STANDARDS, JSON.stringify(defaultStandards));
        localStorage.setItem(DB_ADVICES, JSON.stringify(defaultAdvices));
    } catch (e) {
        console.error(e);
    }
}

async function saveCropStandardsToFirebase() {
    try {
        await db.collection('crop_standards').doc(currentCropId).set({
            name: document.getElementById('admin-crop-selector') ? 
                  document.getElementById('admin-crop-selector').options[document.getElementById('admin-crop-selector').selectedIndex].text : 
                  currentCropId,
            fields: getFields(),
            standards: getStandards(),
            advices: getAdvices()
        });
    } catch (error) {
        console.error("Error saving crop standards to Firebase: ", error);
    }
}

// Data Loaders (Local Cache syncs with Firebase)
// NOTE: getUsers / saveUsers now work with Firestore (see renderUsersTable)
// Local functions retained only for legacy code compatibility
function getUsers() { return JSON.parse(localStorage.getItem('soil_app_users')) || []; }
function saveUsers(users) { localStorage.setItem('soil_app_users', JSON.stringify(users)); }

function getFields() { return JSON.parse(localStorage.getItem(DB_FIELDS)) || []; }
function saveFields(fields) { 
    localStorage.setItem(DB_FIELDS, JSON.stringify(fields)); 
    saveCropStandardsToFirebase();
}

function getStandards() { return JSON.parse(localStorage.getItem(DB_STANDARDS)) || []; }
function saveStandards(stds) { 
    localStorage.setItem(DB_STANDARDS, JSON.stringify(stds)); 
    saveCropStandardsToFirebase();
}

function getAdvices() { return JSON.parse(localStorage.getItem(DB_ADVICES)) || []; }
function saveAdvices(advices) { 
    localStorage.setItem(DB_ADVICES, JSON.stringify(advices)); 
    saveCropStandardsToFirebase();
}

const DB_FORMULAS = 'soil_app_formulas';
function getFormulas() { return JSON.parse(localStorage.getItem(DB_FORMULAS)) || []; }
function saveFormulas(formulas) { 
    localStorage.setItem(DB_FORMULAS, JSON.stringify(formulas));
    saveCropStandardsToFirebase(); // we will save formulas alongside standards or in a separate collection. Let's create a separate save function later or use the same config doc. For now, local is fine.
}

// Navigation Helper
function switchAdminTab(targetViewId) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(l => {
        if (l.id === `nav-${targetViewId.replace('view-', '')}`) {
            l.classList.add('active');
        } else {
            l.classList.remove('active');
        }
    });

    const views = ['view-dashboard', 'view-users', 'view-fields-standards', 'view-formulas'];
    views.forEach(vId => {
        const v = document.getElementById(vId);
        if (v) v.classList.add('hidden');
    });

    const activeView = document.getElementById(targetViewId);
    if (activeView) {
        activeView.classList.remove('hidden');
        void activeView.offsetWidth;
        activeView.classList.add('animate-fade-in');
    }

    if (targetViewId === 'view-dashboard') renderDashboard();
    if (targetViewId === 'view-users') renderUsersTable();
    if (targetViewId === 'view-fields-standards') renderFieldsStandardsTable();
    if (targetViewId === 'view-formulas') renderFormulasTable();
}

// Attach Nav Listeners
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = e.currentTarget.id.replace('nav-', 'view-');
        switchAdminTab(targetId);
    });
});

// Logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('current_user');
        window.location.href = 'index.html';
    });
}

// Render Dashboard Stats
function renderDashboard() {
    try {
        const users = getUsers();
        const fields = getFields();

        const farmers = users.filter(u => u.role === 'user');
        const pending = farmers.filter(u => !u.is_approved);

        const elUsers = document.getElementById('stat-total-users');
        const elPending = document.getElementById('stat-pending-users');
        const elFields = document.getElementById('stat-total-fields');
        const elRecords = document.getElementById('stat-total-records');

        if (elUsers) elUsers.textContent = farmers.length;
        if (elPending) elPending.textContent = pending.length;
        if (elFields) elFields.textContent = fields.length;

        const records = JSON.parse(localStorage.getItem('soil_app_records')) || [];
        if (elRecords) elRecords.textContent = records.length > 0 ? records.length : (farmers.length * 3);

        const ctx = document.getElementById('systemChart');
        if (ctx && !window.myChart) {
            window.myChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.'],
                    datasets: [{
                        label: 'จำนวนการวิเคราะห์ดินในระบบ',
                        data: [14, 22, 18, 35, 29, 42],
                        borderColor: '#059669',
                        backgroundColor: 'rgba(5, 150, 105, 0.08)',
                        borderWidth: 3,
                        pointBackgroundColor: '#059669',
                        fill: true,
                        tension: 0.35
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#0f172a', font: { family: 'Prompt', size: 13 } }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.06)' },
                            ticks: { color: '#64748b' }
                        },
                        x: {
                            grid: { color: 'rgba(0,0,0,0.06)' },
                            ticks: { color: '#64748b' }
                        }
                    }
                }
            });
        }
    } catch (err) {
        console.error('Error rendering dashboard:', err);
    }
}

// ============================================================
// Render Users Table (Firestore-based, cross-device)
// ============================================================
async function renderUsersTable() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;"><i class="fas fa-spinner fa-spin"></i> กำลังโหลดข้อมูล...</td></tr>';

    try {
        const snapshot = await db.collection('users').orderBy('created_at', 'desc').get();

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">ยังไม่มีผู้ใช้งานลงทะเบียนในระบบ</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const user = { id: doc.id, ...doc.data() };
            // Skip Super Admin from the list
            if (user.role === 'superadmin') return;

            const tr = document.createElement('tr');
            const regDate = user.created_at ? new Date(user.created_at).toLocaleDateString('th-TH') : '-';

            const roleBadge = user.role === 'admin'
                ? '<span class="badge badge-success"><i class="fas fa-shield-halved"></i> Admin</span>'
                : '<span class="badge" style="background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;"><i class="fas fa-user"></i> เกษตรกร</span>';

            const statusBadge = user.is_approved
                ? '<span class="badge badge-success"><i class="fas fa-check-circle"></i> อนุมัติแล้ว</span>'
                : '<span class="badge badge-warning"><i class="fas fa-clock"></i> รอการอนุมัติ</span>';

            const approveBtn = user.is_approved
                ? `<button class="btn btn-outline" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; border-color: #e11d48; color: #e11d48;" onclick="toggleApproval('${user.id}', false)"><i class="fas fa-ban"></i> ยกเลิกสิทธิ์</button>`
                : `<button class="btn btn-emerald" style="padding: 0.35rem 0.85rem; font-size: 0.8rem;" onclick="toggleApproval('${user.id}', true)"><i class="fas fa-check"></i> อนุมัติ</button>`;

            // Promote to Admin (Super Admin only)
            const promoteBtn = (currentUser.role === 'superadmin' && user.role === 'user')
                ? `<button class="btn btn-outline" style="padding: 0.35rem 0.6rem; font-size: 0.78rem; border-color: #7c3aed; color: #7c3aed;" onclick="promoteToAdmin('${user.id}', '${user.name}')"><i class="fas fa-arrow-up"></i> เป็น Admin</button>`
                : '';

            // Delete (Super Admin can delete anyone except other superadmins; Admin cannot delete)
            const deleteBtn = (currentUser.role === 'superadmin')
                ? `<button class="btn btn-outline" style="padding: 0.35rem 0.6rem; font-size: 0.78rem; border-color: #dc2626; color: #dc2626;" onclick="deleteUserFirestore('${user.id}', '${user.name}')"><i class="fas fa-trash"></i></button>`
                : '';

            tr.innerHTML = `
                <td style="font-weight: 600;">${user.name}</td>
                <td>${user.phone}</td>
                <td style="color: var(--text-secondary); font-size:0.87rem;">${user.email || '-'}</td>
                <td style="font-size: 0.87rem;">${regDate}</td>
                <td>${roleBadge}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="flex gap-2" style="flex-wrap:wrap;">
                        ${approveBtn}
                        ${promoteBtn}
                        ${deleteBtn}
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('[Admin] Error rendering users table:', err);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color:#e11d48;padding:2rem;"><i class="fas fa-exclamation-triangle"></i> ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ</td></tr>';
    }
}

// Toggle Approval Status (Firestore)
window.toggleApproval = async function (userId, approve) {
    try {
        await db.collection('users').doc(userId).update({ is_approved: approve });
        renderUsersTable();
        renderDashboard();
    } catch (err) {
        console.error('[Admin] toggleApproval error:', err);
        alert('ไม่สามารถอัปเดตสถานะได้ กรุณาลองใหม่');
    }
};

// Promote user to Admin (Super Admin only)
window.promoteToAdmin = async function (userId, userName) {
    if (currentUser.role !== 'superadmin') {
        alert('เฉพาะ Super Admin เท่านั้นที่สามารถโปรโมทผู้ใช้ได้');
        return;
    }
    if (!confirm(`ยืนยันการเลื่อนขั้น "${userName}" ให้เป็น Admin?`)) return;
    try {
        await db.collection('users').doc(userId).update({ role: 'admin', is_approved: true });
        renderUsersTable();
        alert(`"${userName}" ได้รับการเลื่อนขั้นเป็น Admin แล้ว`);
    } catch (err) {
        console.error('[Admin] promoteToAdmin error:', err);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
};

// Delete user (Super Admin only)
window.deleteUserFirestore = async function (userId, userName) {
    if (currentUser.role !== 'superadmin') {
        alert('เฉพาะ Super Admin เท่านั้นที่สามารถลบผู้ใช้ได้');
        return;
    }
    if (userId === 'superadmin_1') {
        alert('ไม่สามารถลบ Super Admin ได้');
        return;
    }
    if (!confirm(`ยืนยันการลบบัญชี "${userName}"? การกระทำนี้ไม่สามารถย้อนกลับได้`)) return;
    try {
        await db.collection('users').doc(userId).delete();
        renderUsersTable();
        renderDashboard();
    } catch (err) {
        console.error('[Admin] deleteUser error:', err);
        alert('เกิดข้อผิดพลาดในการลบ กรุณาลองใหม่');
    }
};

// UNIFIED FIELDS & STANDARDS MANAGEMENT
function renderFieldsStandardsTable() {
    try {
        const fields = getFields();
        const standards = getStandards();
        const tbody = document.getElementById('fields-standards-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (fields.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding: 2rem;">ยังไม่มีการกำหนดตัวแปรและเกณฑ์มาตรฐาน</td></tr>';
            return;
        }

        fields.forEach(field => {
            const std = standards.find(s => s.fieldId === field.id) || {
                minVal: '-', maxVal: '-', idealVal: '-', crops: '-', fertilizers: '-'
            };

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 600; color: #0f172a;">${field.name}</td>
                <td><span class="badge" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;">${field.unit || 'ไม่มี'}</span></td>
                <td><span class="badge badge-success">${std.minVal} - ${std.maxVal}</span></td>
                <td style="color: #0284c7; font-weight: 500;">${std.idealVal}</td>
                <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="พืช: ${std.crops} | ปุ๋ย: ${std.fertilizers}">
                    ${std.crops !== '-' ? std.crops : 'ยังไม่ได้กำหนด'}
                </td>
                <td>
                    <div class="flex gap-2">
                        <button class="btn btn-outline" style="padding: 0.35rem 0.6rem; font-size: 0.8rem; border-color: #0284c7; color: #0284c7;" onclick="editFieldStandard('${field.id}')">
                            <i class="fas fa-edit"></i> แก้ไข
                        </button>
                        <button class="btn btn-outline" style="padding: 0.35rem 0.6rem; font-size: 0.8rem; border-color: #e11d48; color: #e11d48;" onclick="deleteFieldStandard('${field.id}')">
                            <i class="fas fa-trash-alt"></i> ลบ
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error rendering fields & standards table:', err);
    }
}

window.deleteFieldStandard = function (fieldId) {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบตัวแปรและเกณฑ์มาตรฐานนี้?')) {
        let fields = getFields();
        fields = fields.filter(f => f.id !== fieldId);
        saveFields(fields);

        let standards = getStandards();
        standards = standards.filter(s => s.fieldId !== fieldId);
        saveStandards(standards);

        renderFieldsStandardsTable();
        renderDashboard();
    }
};

// Dynamic Advice Rows
window.addAdviceRow = function (min = '', max = '', text = '', formulaId = '', duration = '', forecast = '') {
    const container = document.getElementById('fs-advices-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'advice-row mb-3';
    row.style.cssText = 'background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid var(--primary-color); border-radius: 8px; padding: 1.25rem; position: relative; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.05);';
    
    const formulas = getFormulas();
    let formulaOptionsHtml = '<option value="">-- ไม่มีการคำนวณเพิ่มเติม --</option>';
    formulas.forEach(f => {
        const selected = (formulaId === f.id) ? 'selected' : '';
        formulaOptionsHtml += `<option value="${f.id}" ${selected}>${f.name}</option>`;
    });

    row.innerHTML = `
        <button type="button" style="position: absolute; top: 8px; right: 8px; background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; transition: color 0.2s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#94a3b8'" onclick="this.parentElement.remove()" title="ลบเงื่อนไขนี้">
            <i class="fas fa-times" style="font-size: 0.95rem;"></i>
        </button>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.75rem; padding-right: 1.5rem;">
            <div>
                <label style="font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 4px; display: block;">ตั้งแต่ค่า (Min)</label>
                <input type="number" step="any" class="form-control adv-min-input" placeholder="เช่น 0" value="${min}" required style="padding: 0.5rem 0.75rem; font-size: 0.95rem; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px;">
            </div>
            <div>
                <label style="font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 4px; display: block;">ถึงค่า (Max)</label>
                <input type="number" step="any" class="form-control adv-max-input" placeholder="เช่น 5.4" value="${max}" required style="padding: 0.5rem 0.75rem; font-size: 0.95rem; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px;">
            </div>
        </div>
        <div class="mb-3">
            <label style="font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 4px; display: block;">ข้อความคำแนะนำ</label>
            <textarea class="form-control adv-text-input" placeholder="เช่น ต้องใส่ปูนโดโลไมต์เพิ่มเติมบริเวณทรงพุ่ม" required style="padding: 0.6rem 0.75rem; font-size: 0.95rem; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; min-height: 60px; resize: vertical; width: 100%; line-height: 1.5;">${text}</textarea>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.75rem;">
            <div>
                <label style="font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 4px; display: block;">ระยะเวลาดำเนินการ (Timeline)</label>
                <input type="text" class="form-control adv-duration-input" placeholder="เช่น 14-30 วัน" value="${duration}" style="padding: 0.5rem 0.75rem; font-size: 0.95rem; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px;">
            </div>
            <div>
                <label style="font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 4px; display: block;">แนบสูตรคำนวณปริมาณ (ตัวเลือกเสริม)</label>
                <select class="form-control adv-formula-select" style="padding: 0.5rem 0.75rem; font-size: 0.9rem; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; width: 100%;">
                    ${formulaOptionsHtml}
                </select>
            </div>
        </div>
        <div>
            <label style="font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 4px; display: block;"><i class="fas fa-chart-line text-emerald mr-1"></i> ผลลัพธ์ที่คาดการณ์ (Forecast)</label>
            <input type="text" class="form-control adv-forecast-input" placeholder="เช่น ค่า pH จะเพิ่มขึ้นประมาณ 0.5 ระดับ" value="${forecast}" style="padding: 0.5rem 0.75rem; font-size: 0.95rem; background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.3); border-radius: 6px;">
        </div>
    `;
    container.appendChild(row);
};

window.renderAdviceRows = function (fieldId) {
    const container = document.getElementById('fs-advices-container');
    if (container) container.innerHTML = '';

    if (fieldId) {
        const advices = getAdvices().filter(a => a.fieldId === fieldId);
        advices.forEach(adv => {
            window.addAdviceRow(adv.minVal, adv.maxVal, adv.adviceText, adv.formulaId || '', adv.improvementDuration || '', adv.forecastResult || '');
        });
    } else {
        // default empty row
        window.addAdviceRow();
    }
};

window.showFieldStandardModal = function () {
    const title = document.getElementById('modal-fs-title');
    const form = document.getElementById('form-field-standard');

    if (title) title.innerHTML = '<i class="fas fa-sliders"></i> เพิ่มตัวแปรและเกณฑ์มาตรฐาน';
    if (form) {
        form.reset();
        document.getElementById('fs-field-id').value = '';
    }

    window.renderAdviceRows(null);

    const modal = document.getElementById('modal-field-standard');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
};

window.editFieldStandard = function (fieldId) {
    const fields = getFields();
    const standards = getStandards();

    const field = fields.find(f => f.id === fieldId);
    if (!field) return;

    const std = standards.find(s => s.fieldId === fieldId) || {
        minVal: '', maxVal: '', idealVal: '', crops: '', fertilizers: ''
    };

    const title = document.getElementById('modal-fs-title');
    if (title) title.innerHTML = '<i class="fas fa-edit"></i> แก้ไขตัวแปรและเกณฑ์มาตรฐาน';

    document.getElementById('fs-field-id').value = field.id;
    document.getElementById('fs-name').value = field.name;
    document.getElementById('fs-unit').value = field.unit;

    document.getElementById('fs-min').value = std.minVal;
    document.getElementById('fs-max').value = std.maxVal;
    document.getElementById('fs-ideal').value = std.idealVal;
    document.getElementById('fs-crops').value = std.crops;
    document.getElementById('fs-fertilizers').value = std.fertilizers;

    window.renderAdviceRows(fieldId);

    const modal = document.getElementById('modal-field-standard');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
};

window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

const formFieldStandard = document.getElementById('form-field-standard');
if (formFieldStandard) {
    formFieldStandard.addEventListener('submit', (e) => {
        e.preventDefault();

        const fieldIdInput = document.getElementById('fs-field-id').value;
        const isNew = !fieldIdInput;
        const newFieldId = isNew ? Date.now().toString() : fieldIdInput;

        // Field Data
        const name = document.getElementById('fs-name').value;
        const unit = document.getElementById('fs-unit').value;

        let fields = getFields();
        if (isNew) {
            fields.push({ id: newFieldId, name, unit, type: 'number' });
        } else {
            const fIndex = fields.findIndex(f => f.id === newFieldId);
            if (fIndex !== -1) {
                fields[fIndex].name = name;
                fields[fIndex].unit = unit;
            }
        }
        saveFields(fields);

        // Standard Data
        const minVal = parseFloat(document.getElementById('fs-min').value);
        const maxVal = parseFloat(document.getElementById('fs-max').value);
        const idealVal = document.getElementById('fs-ideal').value;
        const crops = document.getElementById('fs-crops').value;
        const fertilizers = document.getElementById('fs-fertilizers').value;

        let standards = getStandards();
        const stdIndex = standards.findIndex(s => s.fieldId === newFieldId);

        if (stdIndex !== -1) {
            standards[stdIndex] = { ...standards[stdIndex], minVal, maxVal, idealVal, crops, fertilizers };
        } else {
            standards.push({
                id: Date.now().toString() + '_std',
                fieldId: newFieldId,
                minVal, maxVal, idealVal, crops, fertilizers
            });
        }
        saveStandards(standards);

        // Advices Data
        let advices = getAdvices();
        advices = advices.filter(a => a.fieldId !== newFieldId); // Clear old ones

        const adviceRows = document.querySelectorAll('.advice-row');
        adviceRows.forEach((row, idx) => {
            const advMin = parseFloat(row.querySelector('.adv-min-input').value);
            const advMax = parseFloat(row.querySelector('.adv-max-input').value);
            const advText = row.querySelector('.adv-text-input').value;
            const advDuration = row.querySelector('.adv-duration-input')?.value || '';
            const advForecast = row.querySelector('.adv-forecast-input')?.value || '';

            const advFormulaSelect = row.querySelector('.adv-formula-select');
            const advFormulaId = advFormulaSelect ? advFormulaSelect.value : '';

            if (!isNaN(advMin) && !isNaN(advMax) && advText.trim() !== '') {
                advices.push({
                    id: 'adv_' + Date.now().toString() + '_' + idx,
                    fieldId: newFieldId,
                    minVal: advMin,
                    maxVal: advMax,
                    adviceText: advText,
                    formulaId: advFormulaId,
                    improvementDuration: advDuration,
                    forecastResult: advForecast
                });
            }
        });
        saveAdvices(advices);

        renderFieldsStandardsTable();
        renderDashboard();
        closeModal('modal-field-standard');
    });
}

// ================= EXPORT FUNCTIONS FOR ADMIN =================
window.exportUsersExcel = function () {
    const users = getUsers().filter(u => u.role === 'user');
    if (users.length === 0) {
        alert('ไม่มีข้อมูลสมาชิกสำหรับส่งออก');
        return;
    }

    const excelData = users.map((u, idx) => ({
        'ลำดับ': idx + 1,
        'ชื่อ-นามสกุล': u.name,
        'เบอร์โทรศัพท์': u.phone,
        'อีเมล': u.email || '-',
        'วันที่สมัคร': new Date(u.created_at).toLocaleDateString('th-TH'),
        'สถานะการอนุมัติ': u.is_approved ? 'อนุมัติแล้ว' : 'รอการอนุมัติ'
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายชื่อเกษตรกร");
    XLSX.writeFile(wb, `รายชื่อเกษตรกร_SmartSoil_${Date.now()}.xlsx`);
};

window.exportUsersPDF = function () {
    const users = getUsers().filter(u => u.role === 'user');
    if (users.length === 0) {
        alert('ไม่มีข้อมูลสมาชิกสำหรับส่งออก');
        return;
    }

    let rowsHtml = '';
    users.forEach((u, idx) => {
        const status = u.is_approved ? '<span style="color: #059669; font-weight: bold;">อนุมัติแล้ว</span>' : '<span style="color: #d97706; font-weight: bold;">รอการอนุมัติ</span>';
        rowsHtml += `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
                <td style="padding: 8px; text-align: center;">${idx + 1}</td>
                <td style="padding: 8px; font-weight: bold;">${u.name}</td>
                <td style="padding: 8px;">${u.phone}</td>
                <td style="padding: 8px;">${u.email || '-'}</td>
                <td style="padding: 8px; text-align: center;">${new Date(u.created_at).toLocaleDateString('th-TH')}</td>
                <td style="padding: 8px; text-align: center;">${status}</td>
            </tr>
        `;
    });

    const printElement = document.createElement('div');
    printElement.style.padding = '30px';
    printElement.style.fontFamily = "'Prompt', sans-serif";
    printElement.style.background = '#ffffff';

    printElement.innerHTML = `
        <div style="border: 2px solid #0284c7; padding: 20px; border-radius: 10px;">
            <div style="display: flex; justify-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-bottom: 15px;">
                <div>
                    <h2 style="color: #0284c7; margin: 0;">Smart Soil - รายงานสรุปสมาชิกเกษตรกร</h2>
                    <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px;">ศูนย์บริหารจัดการข้อมูลเกษตรกรผู้ใช้งานระบบ</p>
                </div>
                <div style="font-size: 12px; color: #64748b;">
                    วันที่ออกเอกสาร: ${new Date().toLocaleDateString('th-TH')}
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                    <tr style="background: #0284c7; color: #ffffff; font-size: 12px;">
                        <th style="padding: 8px;">#</th>
                        <th style="padding: 8px; text-align: left;">ชื่อ-นามสกุล</th>
                        <th style="padding: 8px; text-align: left;">เบอร์โทรศัพท์</th>
                        <th style="padding: 8px; text-align: left;">อีเมล</th>
                        <th style="padding: 8px;">วันที่สมัคร</th>
                        <th style="padding: 8px;">สถานะ</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;

    const opt = {
        margin: 10,
        filename: `รายงานสมาชิกเกษตรกร_${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(printElement).save();
};

window.exportStandardsExcel = function () {
    const fields = getFields();
    const standards = getStandards();
    const advices = getAdvices();

    const excelData = fields.map((f, idx) => {
        const std = standards.find(s => s.fieldId === f.id) || {};
        const advList = advices.filter(a => a.fieldId === f.id).map(a => `[${a.minVal}-${a.maxVal}: ${a.adviceText}]`).join(' | ');

        return {
            'ลำดับ': idx + 1,
            'ตัวแปรดิน': f.name,
            'หน่วยวัด': f.unit || '-',
            'เกณฑ์ปกติ (Min-Max)': `${std.minVal || 0} - ${std.maxVal || 0}`,
            'ค่าเหมาะสมที่สุด': std.idealVal || '-',
            'พืชที่แนะนำ': std.crops || '-',
            'ปุ๋ยที่แนะนำ': std.fertilizers || '-',
            'เงื่อนไขคำแนะนำปรับปรุงดิน': advList || '-'
        };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "เกณฑ์มาตรฐานดิน");
    XLSX.writeFile(wb, `เกณฑ์มาตรฐานวิเคราะห์ดิน_${Date.now()}.xlsx`);
};

window.exportStandardsPDF = function () {
    const fields = getFields();
    const standards = getStandards();

    let rowsHtml = '';
    fields.forEach((f, idx) => {
        const std = standards.find(s => s.fieldId === f.id) || {};
        rowsHtml += `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px;">
                <td style="padding: 8px; text-align: center;">${idx + 1}</td>
                <td style="padding: 8px; font-weight: bold; color: #059669;">${f.name} ${f.unit ? `(${f.unit})` : ''}</td>
                <td style="padding: 8px; text-align: center;">${std.minVal || 0} - ${std.maxVal || 0}</td>
                <td style="padding: 8px;">${std.idealVal || '-'}</td>
                <td style="padding: 8px;">${std.crops || '-'}</td>
                <td style="padding: 8px;">${std.fertilizers || '-'}</td>
            </tr>
        `;
    });

    const printElement = document.createElement('div');
    printElement.style.padding = '30px';
    printElement.style.fontFamily = "'Prompt', sans-serif";
    printElement.style.background = '#ffffff';

    printElement.innerHTML = `
        <div style="border: 2px solid #059669; padding: 20px; border-radius: 10px;">
            <div style="display: flex; justify-between; align-items: center; border-bottom: 2px solid #059669; padding-bottom: 10px; margin-bottom: 15px;">
                <div>
                    <h2 style="color: #059669; margin: 0;">Smart Soil - รายงานตารางเกณฑ์มาตรฐานดินทางการ</h2>
                    <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px;">เกณฑ์อ้างอิงวิเคราะห์ดิน พืชแนะนำ และแผนปุ๋ย</p>
                </div>
                <div style="font-size: 12px; color: #64748b;">
                    วันที่ออกเอกสาร: ${new Date().toLocaleDateString('th-TH')}
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                    <tr style="background: #059669; color: #ffffff; font-size: 12px;">
                        <th style="padding: 8px;">#</th>
                        <th style="padding: 8px; text-align: left;">ตัวแปรดิน</th>
                        <th style="padding: 8px; text-align: center;">ช่วงปกติ</th>
                        <th style="padding: 8px; text-align: left;">ค่าที่เหมาะสม</th>
                        <th style="padding: 8px; text-align: left;">พืชแนะนำ</th>
                        <th style="padding: 8px; text-align: left;">ปุ๋ยแนะนำ</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;

    const opt = {
        margin: 10,
        filename: `ตารางเกณฑ์มาตรฐานดิน_${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(printElement).save();
};

// ==========================================
// FORMULA LIBRARY MANAGEMENT
// ==========================================

window.renderFormulasTable = function () {
    const list = document.getElementById('formulas-list');
    if (!list) return;

    const formulas = getFormulas();
    list.innerHTML = '';

    if (formulas.length === 0) {
        list.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: #94a3b8;">ยังไม่มีสูตรคำนวณในระบบ</td></tr>`;
        return;
    }

    formulas.forEach(f => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #e2e8f0';
        row.innerHTML = `
            <td style="padding: 1rem; color: var(--text-color);"><code>${f.id}</code></td>
            <td style="padding: 1rem; color: var(--text-color); font-weight: 500;">
                ${f.name}
                ${f.unit ? `<br><span style="font-size: 0.8rem; color: #64748b;"><i class="fas fa-balance-scale"></i> ${f.unit}</span>` : ''}
            </td>
            <td style="padding: 1rem; color: var(--primary-color);"><code>${f.expression}</code></td>
            <td style="padding: 1rem; text-align: center;">
                <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; border-color: #3b82f6; color: #3b82f6;" onclick="editFormula('${f.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; border-color: #ef4444; color: #ef4444;" onclick="deleteFormula('${f.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        list.appendChild(row);
    });
};

window.showFormulaModal = function (formulaId = null) {
    document.getElementById('form-formula').reset();
    document.getElementById('formula-id').readOnly = false;
    document.getElementById('modal-formula-title').innerHTML = '<i class="fas fa-calculator"></i> เพิ่มสูตรคำนวณใหม่';

    if (formulaId) {
        const formulas = getFormulas();
        const formula = formulas.find(f => f.id === formulaId);
        if (formula) {
            document.getElementById('formula-id').value = formula.id;
            document.getElementById('formula-id').readOnly = true;
            document.getElementById('formula-name').value = formula.name;
            document.getElementById('formula-unit').value = formula.unit || '';
            document.getElementById('formula-expression').value = formula.expression;
            document.getElementById('modal-formula-title').innerHTML = '<i class="fas fa-edit"></i> แก้ไขสูตรคำนวณ';
        }
    }

    document.getElementById('modal-formula').style.display = 'flex';
    document.getElementById('modal-formula').classList.remove('hidden');
};

window.insertToFormula = function(text) {
    const input = document.getElementById('formula-expression');
    if (!input) return;
    
    // Simple insert at the end for now, or at cursor if supported
    const start = input.selectionStart;
    const end = input.selectionEnd;
    
    if (start !== undefined && end !== undefined) {
        const val = input.value;
        input.value = val.substring(0, start) + text + val.substring(end);
        input.focus();
        input.selectionStart = input.selectionEnd = start + text.length;
    } else {
        input.value += text;
        input.focus();
    }
};

document.getElementById('form-formula')?.addEventListener('submit', function (e) {
    e.preventDefault();
    let id = document.getElementById('formula-id').value.trim();
    const name = document.getElementById('formula-name').value.trim();
    const unit = document.getElementById('formula-unit').value.trim();
    const expression = document.getElementById('formula-expression').value.trim();

    if (!id) {
        id = 'form_' + Date.now();
    }

    let formulas = getFormulas();
    const existingIndex = formulas.findIndex(f => f.id === id);

    if (existingIndex >= 0) {
        formulas[existingIndex] = { id, name, unit, expression };
    } else {
        formulas.push({ id, name, unit, expression });
    }

    saveFormulas(formulas);
    window.closeModal('modal-formula');
    renderFormulasTable();
    
    // Auto-update any open Advice row dropdowns
    if (!document.getElementById('modal-field-standard').classList.contains('hidden')) {
        renderAdviceRows(document.getElementById('fs-field-id').value);
    }
});

window.editFormula = function (id) {
    showFormulaModal(id);
};

window.deleteFormula = function (id) {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสูตรคำนวณนี้? (คำแนะนำที่อ้างอิงสูตรนี้อาจไม่สามารถคำนวณได้)')) {
        let formulas = getFormulas();
        formulas = formulas.filter(f => f.id !== id);
        saveFormulas(formulas);
        renderFormulasTable();
    }
};

// Init
document.addEventListener('DOMContentLoaded', () => {
    renderDashboard();
    renderUsersTable();
    // Load default general crop on start
    loadCropStandards('general');
});
