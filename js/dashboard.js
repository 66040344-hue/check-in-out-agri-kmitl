// Check auth with auto-fallback for direct file viewing
let currentUser = JSON.parse(localStorage.getItem('current_user'));

if (!currentUser || currentUser.role !== 'user' || !currentUser.is_approved) {
    const DB_USERS = 'soil_app_users';
    let users = JSON.parse(localStorage.getItem(DB_USERS)) || [];
    let farmer = users.find(u => u.role === 'user' && u.is_approved);

    if (!farmer) {
        farmer = {
            id: 'farmer_1',
            name: 'สมชาย เกษตรก้าวหน้า',
            phone: '0899999999',
            email: 'somchai@farm.com',
            password: 'password123',
            role: 'user',
            is_approved: true,
            created_at: new Date().toISOString()
        };
        users.push(farmer);
        localStorage.setItem(DB_USERS, JSON.stringify(users));
    }
    currentUser = farmer;
    localStorage.setItem('current_user', JSON.stringify(farmer));
}

if (document.getElementById('user-name')) {
    document.getElementById('user-name').textContent = currentUser.name;
}
if (document.getElementById('mobile-user-name')) {
    document.getElementById('mobile-user-name').textContent = currentUser.name;
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
const DB_FIELDS = 'soil_app_fields';
const DB_RECORDS = 'soil_app_records';
const DB_STANDARDS = 'soil_app_standards';
const DB_ADVICES = 'soil_app_advices';

let currentAnalysisResult = null;
let currentCropId = 'general';

let isCompareMode = false;
let selectedCompareIds = [];

window.toggleCompareMode = function () {
    isCompareMode = !isCompareMode;
    selectedCompareIds = [];

    const thCompare = document.getElementById('th-compare-checkbox');
    const compareActions = document.getElementById('compare-actions');
    const btnToggle = document.getElementById('btn-toggle-compare');
    const checkboxes = document.querySelectorAll('.td-compare-checkbox');
    const compareInputs = document.querySelectorAll('.compare-checkbox');

    if (isCompareMode) {
        if (thCompare) thCompare.classList.remove('hidden');
        if (compareActions) compareActions.classList.remove('hidden');
        if (btnToggle) {
            btnToggle.innerHTML = '<i class="fas fa-times"></i> ยกเลิกเปรียบเทียบ';
            btnToggle.classList.replace('btn-outline', 'btn-danger');
            btnToggle.style.color = '#ef4444';
            btnToggle.style.borderColor = '#ef4444';
        }
        checkboxes.forEach(td => td.classList.remove('hidden'));
        compareInputs.forEach(cb => cb.checked = false);
    } else {
        if (thCompare) thCompare.classList.add('hidden');
        if (compareActions) compareActions.classList.add('hidden');
        if (btnToggle) {
            btnToggle.innerHTML = '<i class="fas fa-balance-scale"></i> เปรียบเทียบข้อมูล';
            btnToggle.classList.replace('btn-danger', 'btn-outline');
            btnToggle.style.color = '#0284c7';
            btnToggle.style.borderColor = '#0284c7';
        }
        checkboxes.forEach(td => td.classList.add('hidden'));
    }
};

window.handleCompareSelection = function (cb) {
    if (cb.checked) {
        if (selectedCompareIds.length >= 5) {
            alert('คุณสามารถเลือกเปรียบเทียบได้สูงสุด 5 รายการเท่านั้น');
            cb.checked = false;
            return;
        }
        selectedCompareIds.push(cb.value);
    } else {
        selectedCompareIds = selectedCompareIds.filter(id => id !== cb.value);
    }
};

window.compareSelectedRecords = function () {
    if (selectedCompareIds.length < 2) {
        alert('กรุณาเลือกประวัติอย่างน้อย 2 รายการเพื่อทำการเปรียบเทียบ');
        return;
    }

    const allRecords = JSON.parse(localStorage.getItem(DB_RECORDS)) || [];
    const recordsToCompare = allRecords.filter(r => selectedCompareIds.includes(r.id));

    // Sort oldest to newest for the chart timeline
    recordsToCompare.sort((a, b) => new Date(a.date) - new Date(b.date));

    document.getElementById('modal-compare-history').classList.add('active');

    // Use the existing renderChart function to render into the compare modal
    renderChart(recordsToCompare, 'compare-charts-wrapper');
};

window.loadDashboardCropStandards = async function (cropId) {
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
            // fallback to empty if crop doesn't exist
            localStorage.setItem(DB_FIELDS, JSON.stringify([]));
            localStorage.setItem(DB_STANDARDS, JSON.stringify([]));
            localStorage.setItem(DB_ADVICES, JSON.stringify([]));
        }
        renderDynamicFields();
    } catch (error) {
        console.error("Error loading crop standards: ", error);
        alert("เกิดข้อผิดพลาดในการโหลดข้อมูลจาก Firebase");
    }
};

// View Switch Helper
function switchDashboardTab(tabId) {
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.id === `nav-${tabId}`) link.classList.add('active');
        else link.classList.remove('active');
    });

    document.querySelectorAll('.mobile-nav-item').forEach(link => {
        if (link.id === `mobile-nav-${tabId}`) link.classList.add('active');
        else link.classList.remove('active');
    });

    const analyzeView = document.getElementById('view-analyze');
    const historyView = document.getElementById('view-history');

    if (tabId === 'analyze') {
        historyView.classList.add('hidden');
        analyzeView.classList.remove('hidden');
        void analyzeView.offsetWidth;
        analyzeView.classList.add('animate-fade-in');
        if (typeof goToWizardStep === 'function' && !currentAnalysisResult) {
            goToWizardStep(1);
        }
    } else if (tabId === 'history') {
        analyzeView.classList.add('hidden');
        historyView.classList.remove('hidden');
        void historyView.offsetWidth;
        historyView.classList.add('animate-fade-in');
        renderHistory();
    }
}

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = e.currentTarget.id.replace('nav-', '');
        switchDashboardTab(tabId);
    });
});

document.querySelectorAll('.mobile-nav-item').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = e.currentTarget.id.replace('mobile-nav-', '');
        switchDashboardTab(tabId);
    });
});

const handleLogout = () => {
    localStorage.removeItem('current_user');
    window.location.href = 'index.html';
};

if (document.getElementById('logout-btn')) {
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
}
if (document.getElementById('mobile-logout-btn')) {
    document.getElementById('mobile-logout-btn').addEventListener('click', handleLogout);
}

// Load Dynamic Fields
function renderDynamicFields() {
    const fields = JSON.parse(localStorage.getItem(DB_FIELDS)) || [];
    const container = document.getElementById('dynamic-fields-container');
    container.innerHTML = '';

    if (fields.length === 0) {
        container.innerHTML = '<p class="text-muted">ยังไม่มีการตั้งค่าตัวแปรจากผู้ดูแลระบบ</p>';
        return;
    }

    const standards = JSON.parse(localStorage.getItem(DB_STANDARDS)) || [];

    fields.forEach(field => {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.style.position = 'relative';

        let label = field.name;
        if (field.unit) label += ` (${field.unit})`;

        const std = standards.find(s => s.fieldId === field.id);
        const stdText = std ? `<span style="float:right; font-size: 0.8rem; color: var(--text-muted); font-weight: 400;"><i class="fas fa-info-circle"></i> มาตรฐาน: ${std.minVal} - ${std.maxVal} ${field.unit || ''}</span>` : '';

        // Add validation attributes
        let minAttr = '';
        let maxAttr = '';
        if (field.type === 'number') {
            minAttr = 'min="0"';
            if (field.name.toLowerCase().includes('ph')) {
                maxAttr = 'max="14"';
            }
        }

        div.innerHTML = `
            <label class="form-label" style="display: block; width: 100%;">${label} ${stdText}</label>
            <input type="${field.type}" ${field.type === 'number' ? 'step="any"' : ''} ${minAttr} ${maxAttr} id="field-${field.id}" data-id="${field.id}" data-name="${field.name}" class="form-control dynamic-input" required placeholder="ระบุ ${field.name}" oninput="if(window.validateInput) window.validateInput(this, '${field.name}')">
            <div id="error-${field.id}" style="color: var(--danger-color); font-size: 0.78rem; margin-top: 4px; display: none;"><i class="fas fa-exclamation-circle"></i> <span class="error-msg"></span></div>
        `;
        container.appendChild(div);
    });
}

// ================= SMART FORM UX (Auto-save & Validation) =================
window.validateInput = function(inputEl, fieldName) {
    const errorDiv = document.getElementById(`error-${inputEl.getAttribute('data-id')}`);
    const errorMsg = errorDiv.querySelector('.error-msg');
    const val = parseFloat(inputEl.value);
    
    let isError = false;
    if (inputEl.type === 'number' && inputEl.value !== '') {
        if (val < 0) {
            isError = true;
            errorMsg.textContent = 'ค่าต้องไม่ติดลบ';
        } else if (fieldName.toLowerCase().includes('ph') && val > 14) {
            isError = true;
            errorMsg.textContent = 'ค่า pH ต้องไม่เกิน 14';
        }
    }
    
    if (isError) {
        inputEl.style.borderColor = 'var(--danger-color)';
        inputEl.style.backgroundColor = 'rgba(244, 63, 94, 0.05)';
        errorDiv.style.display = 'block';
        inputEl.setCustomValidity('Invalid value');
    } else {
        inputEl.style.borderColor = '';
        inputEl.style.backgroundColor = '';
        errorDiv.style.display = 'none';
        inputEl.setCustomValidity('');
    }
    
    if (window.saveFormDraft) window.saveFormDraft();
};

window.saveFormDraft = function() {
    const draft = {
        plotName: document.getElementById('plot-name')?.value || '',
        cropType: document.getElementById('dashboard-crop-selector')?.value || '',
        fields: {}
    };
    document.querySelectorAll('.dynamic-input').forEach(input => {
        draft.fields[input.getAttribute('data-id')] = input.value;
    });
    localStorage.setItem('soil_app_form_draft', JSON.stringify(draft));
};

// Update Dashboard UI with latest configs
function renderDashboard() {
    renderDynamicFields();
    if (document.getElementById('dashboard-crop-selector')) {
        currentCropId = document.getElementById('dashboard-crop-selector').value || 'general';
        loadDashboardCropStandards(currentCropId);
    }
    // Load Auto-save Draft after rendering fields
    if (window.loadFormDraft) window.loadFormDraft();
}

window.loadFormDraft = function() {
    try {
        const draftJson = localStorage.getItem('soil_app_form_draft');
        if (!draftJson) return;
        const draft = JSON.parse(draftJson);
        
        if (draft.plotName && document.getElementById('plot-name')) {
            document.getElementById('plot-name').value = draft.plotName;
        }
        if (draft.cropType && document.getElementById('dashboard-crop-selector')) {
            document.getElementById('dashboard-crop-selector').value = draft.cropType;
        }
        document.querySelectorAll('.dynamic-input').forEach(input => {
            const id = input.getAttribute('data-id');
            if (draft.fields[id] !== undefined) {
                input.value = draft.fields[id];
                // Trigger validation visual update silently
                if (window.validateInput) window.validateInput(input, input.getAttribute('data-name'));
            }
        });
    } catch(e) { 
        console.error('Error loading form draft', e); 
    }
};

// Wizard Navigation Controller
window.goToWizardStep = function (step) {
    // Hide all steps
    for (let i = 1; i <= 4; i++) {
        const el = document.getElementById(`wizard-step-${i}`);
        if (el) el.style.display = 'none';
    }

    // Show target step
    const targetEl = document.getElementById(`wizard-step-${step}`);
    if (targetEl) {
        targetEl.style.display = 'block';
        // Trigger animation
        targetEl.classList.remove('animate-fade-in');
        void targetEl.offsetWidth;
        targetEl.classList.add('animate-fade-in');
    }

    // Update Stepper Bar UI
    if (typeof updateStepper === 'function') {
        updateStepper(step);
    }
};

// Helper function to evaluate formula and generate HTML badge
function generateFormulaResultHtml(formulaId, val, min = 0, max = 0) {
    if (!formulaId) return '';

    // Lazy load formulas from LocalStorage
    const formulas = JSON.parse(localStorage.getItem('soil_app_formulas')) || [];
    const found = formulas.find(f => f.id === formulaId);

    if (!found) return '';

    try {
        // Replace 'val', 'min', 'max' with numeric values
        let parsedFormula = found.expression.replace(/\bval\b/g, val);
        parsedFormula = parsedFormula.replace(/\bmin\b/g, min);
        parsedFormula = parsedFormula.replace(/\bmax\b/g, max);

        // Evaluate the math string safely
        const result = new Function('return ' + parsedFormula)();
        if (isNaN(result) || !isFinite(result) || result <= 0) return '';

        // Format to max 2 decimal places
        const finalResult = Number.isInteger(result) ? result : parseFloat(result.toFixed(2));

        return `<div style="font-size: 0.85rem; color: var(--primary-color); margin-bottom: 4px;"><i class="fas fa-box-open mr-1"></i> <strong>ปริมาณแนะนำ:</strong> ${found.name} ${finalResult} ${found.unit || ''}</div>`;
    } catch (e) {
        console.error('Error parsing formula:', found.expression, e);
        return '';
    }
}

// Dynamic Analysis Engine using Admin Configured Standards
document.getElementById('form-analyze').addEventListener('submit', (e) => {
    e.preventDefault();

    // 1. Show Processing Step
    goToWizardStep(2);

    setTimeout(() => {
        const plotNameInput = document.getElementById('plot-name');
        const plotName = plotNameInput ? plotNameInput.value.trim() : 'ไม่ระบุแปลง';

        const inputs = document.querySelectorAll('.dynamic-input');
        const data = {};

        inputs.forEach(input => {
            data[input.getAttribute('data-id')] = {
                name: input.getAttribute('data-name'),
                value: input.value
            };
        });

        const standards = JSON.parse(localStorage.getItem(DB_STANDARDS)) || [];
        const allAdvices = JSON.parse(localStorage.getItem(DB_ADVICES)) || [];
        const advices = [];
        let isOverallGood = true;
        let recommendedCropsList = [];
        let recommendedFertilizersList = [];

        // Evaluate each field against standards & advices
        Object.keys(data).forEach(fieldId => {
            const item = data[fieldId];
            const val = parseFloat(item.value);

            const std = standards.find(s => s.fieldId === fieldId);
            const fieldAdvices = allAdvices.filter(a => a.fieldId === fieldId);

            // Find matching advice for the exact numeric range entered
            const matchedAdvice = fieldAdvices.find(a => val >= parseFloat(a.minVal) && val <= parseFloat(a.maxVal));

            if (!isNaN(val)) {
                let status = 'good';
                let adviceText = matchedAdvice ? matchedAdvice.adviceText : '';
                let statusHtml = '';

                if (std) {
                    if (val < std.minVal) {
                        isOverallGood = false;
                        status = 'low';
                        adviceText = matchedAdvice ? matchedAdvice.adviceText : 'ควรปรับปรุงสภาพดินให้อยู่ในเกณฑ์มาตรฐาน';
                        statusHtml = `<span class="badge badge-warning" style="background: rgba(244, 63, 94, 0.1); color: var(--danger-color);"><i class="fas fa-arrow-down"></i> ต่ำกว่าเกณฑ์</span>`;
                    } else if (val > std.maxVal) {
                        isOverallGood = false;
                        status = 'high';
                        adviceText = matchedAdvice ? matchedAdvice.adviceText : 'ควรปรับปรุงสภาพดินให้อยู่ในเกณฑ์มาตรฐาน';
                        statusHtml = `<span class="badge badge-warning" style="background: rgba(245, 158, 11, 0.1); color: var(--warning-color);"><i class="fas fa-arrow-up"></i> สูงกว่าเกณฑ์</span>`;
                    } else {
                        statusHtml = `<span class="badge badge-success" style="background: rgba(16, 185, 129, 0.1); color: var(--primary-color);"><i class="fas fa-check"></i> เหมาะสม</span>`;
                    }

                    if (std.crops) recommendedCropsList.push(std.crops);
                    if (std.fertilizers) recommendedFertilizersList.push(std.fertilizers);

                    let formulaHtml = '';
                    if (matchedAdvice && matchedAdvice.formulaId) {
                        formulaHtml = generateFormulaResultHtml(matchedAdvice.formulaId, val, std.minVal, std.maxVal);
                    }

                    advices.push({
                        fieldId: fieldId,
                        fieldName: item.name,
                        val: val,
                        stdMin: std.minVal,
                        stdMax: std.maxVal,
                        idealVal: std.idealVal || `${std.minVal} - ${std.maxVal}`,
                        unit: std.unit || '',
                        status: status,
                        statusHtml: statusHtml,
                        adviceText: adviceText,
                        duration: matchedAdvice ? (matchedAdvice.improvementDuration || '') : '',
                        forecast: matchedAdvice ? (matchedAdvice.forecastResult || '') : '',
                        formulaResult: formulaHtml
                    });
                } else {
                    let formulaHtml = '';
                    if (matchedAdvice && matchedAdvice.formulaId) {
                        formulaHtml = generateFormulaResultHtml(matchedAdvice.formulaId, val, 0, 0);
                    }

                    advices.push({
                        fieldId: fieldId,
                        fieldName: item.name,
                        val: val,
                        stdMin: '-',
                        stdMax: '-',
                        idealVal: '-',
                        unit: '',
                        status: 'info',
                        statusHtml: `<span class="badge" style="background: rgba(2, 132, 199, 0.1); color: var(--secondary-color);"><i class="fas fa-info"></i> ข้อมูลทั่วไป</span>`,
                        adviceText: adviceText,
                        duration: matchedAdvice ? (matchedAdvice.improvementDuration || '') : '',
                        forecast: matchedAdvice ? (matchedAdvice.forecastResult || '') : '',
                        formulaResult: formulaHtml
                    });
                }
            }
        });

        const crops = recommendedCropsList.length > 0 ? Array.from(new Set(recommendedCropsList)).join(' / ') : 'ข้าว, ข้าวโพด, อ้อย';
        const fertilizers = recommendedFertilizersList.length > 0 ? Array.from(new Set(recommendedFertilizersList)).join(' / ') : 'สูตร 15-15-15 (50 กก./ไร่)';

        currentAnalysisResult = {
            date: new Date().toISOString(),
            plotName: plotName,
            data: data,
            advices: advices,
            crops: crops,
            fertilizers: fertilizers,
            status: isOverallGood ? 'good' : 'needs_improvement'
        };

        // Render Box 1: Analysis Results (compact 3-col row)
        const boxResults = document.getElementById('box-analysis-results');
        if (boxResults) {
            boxResults.innerHTML = advices.map(a => `
                <div class="result-row">
                    <span class="result-label">${a.fieldName}</span>
                    <strong class="result-val">${a.val}<span class="result-unit">${a.unit}</span></strong>
                    <span class="result-badge">${a.statusHtml}</span>
                </div>
            `).join('');
        }

        // Render Box 2: Optimal Standards (compact 2-col row)
        const boxOptimal = document.getElementById('box-optimal-standards');
        if (boxOptimal) {
            boxOptimal.innerHTML = advices.map(a => `
                <div class="result-row">
                    <span class="result-label">${a.fieldName}</span>
                    <span class="result-std">${a.idealVal} <span class="result-unit">${a.unit}</span></span>
                </div>
            `).join('');
        }

        // Render Box 3: Recommended Crops & Fertilizers
        const boxCrops = document.getElementById('box-recommended-crops');
        if (boxCrops) boxCrops.textContent = crops;
        const boxFertilizers = document.getElementById('box-recommended-fertilizers');
        if (boxFertilizers) boxFertilizers.textContent = fertilizers;

        // Render Box 4: Advices
        const boxAdvices = document.getElementById('box-advices');
        if (boxAdvices) {
            const validAdvices = advices.filter(a => a.adviceText && a.adviceText.trim() !== '' && a.adviceText !== 'ควรปรับปรุงสภาพดินให้อยู่ในเกณฑ์มาตรฐาน');
            if (validAdvices.length > 0) {
                boxAdvices.innerHTML = '<ol style="margin: 0; padding-left: 1.25rem;">' +
                    validAdvices.map(a => `<li style="margin-bottom: 0.75rem;"><strong>${a.fieldName}:</strong> ${a.adviceText}</li>`).join('') +
                    '</ol>';
            } else {
                boxAdvices.innerHTML = '<div class="text-muted text-center" style="padding: 1rem;"><i class="fas fa-check-circle text-emerald"></i> ดินอยู่ในสภาพสมบูรณ์ ไม่จำเป็นต้องจัดการเพิ่มเติม</div>';
            }
        }

        // Render Box 5: Forecast & Timeline
        const boxForecast = document.getElementById('box-forecast');
        if (boxForecast) {
            const forecastAdvices = advices.filter(a => (a.duration && a.duration.trim() !== '') || (a.forecast && a.forecast.trim() !== '') || (a.formulaResult && a.formulaResult !== ''));
            if (forecastAdvices.length > 0) {
                boxForecast.innerHTML = forecastAdvices.map(a => `
                    <div style="border-left: 3px solid var(--primary-color); padding: 0.6rem 0.8rem; margin-bottom: 0.75rem; background: rgba(16,185,129,0.04); border-radius: 0 6px 6px 0;">
                        <div style="font-weight: 600; font-size: 0.88rem; color: var(--text-primary); margin-bottom: 4px;">${a.fieldName}</div>
                        ${a.formulaResult ? a.formulaResult : ''}
                        ${a.duration ? `<div style="font-size: 0.82rem; color: #b45309; margin-bottom: 2px;"><i class="fas fa-clock mr-1"></i> <strong>ระยะเวลาที่ใช้:</strong> ${a.duration}</div>` : ''}
                        ${a.forecast ? `<div style="font-size: 0.82rem; color: var(--primary-color);"><i class="fas fa-chart-line mr-1"></i> <strong>ผลลัพธ์:</strong> ${a.forecast}</div>` : ''}
                    </div>
                `).join('');
                boxForecast.parentElement.style.display = 'block'; // Show if has content
            } else {
                boxForecast.parentElement.style.display = 'none'; // Hide if empty
            }
        }

        // Render Single Analysis Chart & Radar Chart
        renderChart([currentAnalysisResult], 'analysis-charts-wrapper');
        renderRadarChart(advices);

        // 2. Go to Recommendations Step
        goToWizardStep(3);
    }, 1200); // 1.2 seconds simulation delay
});

// Save Record
window.saveRecord = async function () {
    if (!currentAnalysisResult) return;

    try {
        const recordData = {
            userId: currentUser.id,
            farmerName: currentUser.name,
            cropType: currentCropId,
            ...currentAnalysisResult,
            date: new Date().toISOString()
        };

        if (window.editingRecordId) {
            // Update existing record
            await db.collection('analysis_history').doc(window.editingRecordId).update(recordData);
            window.editingRecordId = null;
        } else {
            // Create new record
            await db.collection('analysis_history').add(recordData);
        }

        alert('บันทึกข้อมูลผลการวิเคราะห์ลงฐานข้อมูลเรียบร้อยแล้ว!');
        currentAnalysisResult = null;
        document.getElementById('form-analyze').reset();
        localStorage.removeItem('soil_app_form_draft'); // Clear auto-save draft on success

        switchDashboardTab('history');
        goToWizardStep(1);
    } catch (error) {
        console.error("Error saving record: ", error);
        alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
};

// Render History Table
async function renderHistory() {
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted" style="padding: 2rem;"><i class="fas fa-spinner fa-spin"></i> กำลังโหลดข้อมูล...</td></tr>';

    try {
        const snapshot = await db.collection('analysis_history')
            .where('userId', '==', currentUser.id)
            .get();

        const userRecords = [];
        snapshot.forEach(doc => {
            userRecords.push({ id: doc.id, ...doc.data() });
        });

        userRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

        tbody.innerHTML = '';

        if (userRecords.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted" style="padding: 2rem;">ยังไม่มีประวัติการวิเคราะห์ดิน</td></tr>';
            return;
        }

        [...userRecords].reverse().forEach(record => {
            const date = new Date(record.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="td-compare-checkbox ${isCompareMode ? '' : 'hidden'}" style="text-align: center;">
                    <input type="checkbox" value="${record.id}" class="compare-checkbox" onchange="handleCompareSelection(this)" ${selectedCompareIds.includes(record.id) ? 'checked' : ''}>
                </td>
                <td style="font-weight: 600;">${date}</td>
                <td><span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--primary-color); border: 1px solid rgba(16,185,129,0.3);"><i class="fas fa-map-marker-alt"></i> ${record.plotName || 'ไม่ระบุ'}</span></td>
                <td style="text-align: right; display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn btn-emerald" style="padding: 0.35rem 0.75rem; font-size: 0.85rem; border-radius: var(--radius-full);" onclick="viewHistoryDetail('${record.id}')" title="ดูข้อมูล">
                        <i class="fas fa-search"></i>
                    </button>
                    <button class="btn btn-outline" style="padding: 0.35rem 0.75rem; font-size: 0.85rem; border-radius: var(--radius-full); border-color: #eab308; color: #eab308;" onclick="editRecord('${record.id}')" title="แก้ไข">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline" style="padding: 0.35rem 0.75rem; font-size: 0.85rem; border-radius: var(--radius-full); border-color: #ef4444; color: #ef4444;" onclick="deleteRecord('${record.id}')" title="ลบ">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Save to local for functions that need synchronous access like editRecord and viewHistoryDetail
        localStorage.setItem(DB_RECORDS, JSON.stringify(userRecords));

        // Render Historical Trend Line Chart
        renderHistoryTrendChart(userRecords);
    } catch (error) {
        console.error("Error fetching history: ", error);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger" style="padding: 2rem;">ไม่สามารถโหลดข้อมูลประวัติได้</td></tr>';
    }
}

// Render Scientific Threshold Benchmark Charts
function renderChart(records, wrapperId = 'history-charts-wrapper') {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;

    wrapper.innerHTML = '';

    if (!window.chartInstancesCache) window.chartInstancesCache = {};
    if (window.chartInstancesCache[wrapperId] && window.chartInstancesCache[wrapperId].length > 0) {
        window.chartInstancesCache[wrapperId].forEach(chart => chart.destroy());
    }
    window.chartInstancesCache[wrapperId] = [];

    const standards = JSON.parse(localStorage.getItem(DB_STANDARDS)) || [];
    const fields = JSON.parse(localStorage.getItem(DB_FIELDS)) || [];

    // Master list of all soil variables in the system
    const targetFields = fields.length > 0 ? fields : standards.map(s => ({ id: s.fieldId, name: s.name || 'ตัวแปรดิน', unit: s.unit || '' }));

    if (targetFields.length === 0 || records.length === 0) {
        wrapper.innerHTML = '<div class="text-muted col-span-2 text-center" style="padding: 2rem;">ไม่มีข้อมูลตัวแปรดินในระบบสำหรับแสดงกราฟ</div>';
        return;
    }

    let labels;
    if (wrapperId === 'compare-charts-wrapper') {
        labels = records.map(r => [r.plotName || 'ไม่ระบุ', `(${new Date(r.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })})`]);
    } else {
        labels = records.map(r => new Date(r.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }));
    }
    // Create a scientific threshold chart for EVERY field in the system
    targetFields.forEach((fieldObj, index) => {
        const std = standards.find(s => s.fieldId === fieldObj.id) || {};
        const fieldName = fieldObj.name || 'ตัวแปรดิน';
        const fieldUnit = fieldObj.unit || std.unit || '';
        const minVal = !isNaN(parseFloat(std.minVal)) ? parseFloat(std.minVal) : 0;
        const maxVal = !isNaN(parseFloat(std.maxVal)) ? parseFloat(std.maxVal) : 100;

        // Extract data for this specific field across all records (by ID or Name fallback)
        const fieldData = [];
        records.forEach(r => {
            let val = null;
            if (r.data) {
                if (r.data[fieldObj.id] && r.data[fieldObj.id].value !== undefined && r.data[fieldObj.id].value !== '') {
                    val = parseFloat(r.data[fieldObj.id].value);
                } else {
                    const match = Object.values(r.data).find(d => d.name === fieldName || d.id === fieldObj.id);
                    if (match && match.value !== undefined && match.value !== '') {
                        val = parseFloat(match.value);
                    }
                }
            }
            fieldData.push(!isNaN(val) ? val : null);
        });

        // Calculate dynamic box delta for floating box effect
        const validVals = fieldData.filter(v => v !== null);
        const avgVal = validVals.length > 0 ? validVals.reduce((a, b) => a + b, 0) / validVals.length : (minVal + maxVal) / 2;
        const boxDelta = Math.max(0.12, avgVal * 0.07);

        // Floating range data [min, max]
        const floatingBoxData = fieldData.map(v => v !== null ? [v - boxDelta, v + boxDelta] : null);

        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDarkMode ? '#f8fafc' : '#030712';
        const mutedColor = isDarkMode ? '#94a3b8' : '#64748b';
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';

        // Dynamic status color grading logic (Green within range, Yellow -> Orange -> Deep Red for deviations)
        const statusColors = fieldData.map(v => {
            if (v === null || isNaN(v)) return { bg: '#64748b', border: '#475569', text: '-' };

            if (v >= minVal && v <= maxVal) {
                // Within range -> GREEN
                return {
                    bg: '#10b981',
                    border: '#047857',
                    text: '✅ อยู่ในเกณฑ์เหมาะสม'
                };
            }

            const rangeSpan = Math.max(0.1, maxVal - minVal);
            const diff = v < minVal ? (minVal - v) / rangeSpan : (v - maxVal) / rangeSpan;

            if (diff <= 0.3) {
                // Mild deviation -> YELLOW / AMBER
                return {
                    bg: '#d97706',
                    border: '#b45309',
                    text: v < minVal ? '⚠️ ต่ำกว่าเกณฑ์เล็กน้อย' : '⚠️ สูงกว่าเกณฑ์เล็กน้อย'
                };
            } else if (diff <= 0.75) {
                // Moderate deviation -> ORANGE
                return {
                    bg: isDarkMode ? '#f97316' : '#ea580c',
                    border: '#c2410c',
                    text: v < minVal ? '⚠️ ต่ำกว่าเกณฑ์ปานกลาง' : '⚠️ สูงกว่าเกณฑ์ปานกลาง'
                };
            } else {
                // Severe / Extreme deviation -> DEEP RED ALMOST BLACK
                return {
                    bg: '#450a0a',
                    border: '#2a0000',
                    text: v < minVal ? '🚨 ต่ำกว่าเกณฑ์มาก' : '🚨 สูงกว่าเกณฑ์มาก'
                };
            }
        });

        const distinctColors = [
            { bg: 'rgba(59, 130, 246, 0.85)', border: '#2563eb' }, // Blue
            { bg: 'rgba(139, 92, 246, 0.85)', border: '#7c3aed' }, // Purple
            { bg: 'rgba(236, 72, 153, 0.85)', border: '#db2777' }, // Pink
            { bg: 'rgba(245, 158, 11, 0.85)', border: '#d97706' }, // Amber
            { bg: 'rgba(16, 185, 129, 0.85)', border: '#059669' }  // Emerald
        ];

        let boxBgColors, boxBorderColors;

        if (wrapperId === 'compare-charts-wrapper') {
            boxBgColors = records.map((_, i) => distinctColors[i % distinctColors.length].bg);
            boxBorderColors = records.map((_, i) => distinctColors[i % distinctColors.length].border);
        } else {
            boxBgColors = statusColors.map(c => c.bg);
            boxBorderColors = statusColors.map(c => c.border);
        }

        // Create canvas wrapper
        const canvasWrapper = document.createElement('div');
        canvasWrapper.className = 'glass-card chart-container';
        canvasWrapper.style.height = '270px';
        canvasWrapper.style.padding = '0.85rem 0.6rem';

        const canvas = document.createElement('canvas');
        canvas.id = `${wrapperId}_chart_${std.fieldId || index}`;
        canvasWrapper.appendChild(canvas);
        wrapper.appendChild(canvasWrapper);

        const ctx = canvas.getContext('2d');

        // Custom Plugin to draw horizontal lines for min/max
        const horizontalLinePlugin = {
            id: 'horizontalLine',
            beforeDraw: (chart) => {
                if (chart.data.labels.length === 1) { // Only draw lines if there's just 1 data point
                    const ctx = chart.ctx;
                    const xAxis = chart.scales.x;
                    const yAxis = chart.scales.y;

                    chart.data.datasets.forEach(dataset => {
                        if (dataset.type === 'line' && (dataset.label.includes('Max') || dataset.label.includes('Min'))) {
                            const yVal = dataset.data[0];
                            const yPixel = yAxis.getPixelForValue(yVal);

                            ctx.save();
                            ctx.beginPath();
                            ctx.moveTo(xAxis.left, yPixel);
                            ctx.lineTo(xAxis.right, yPixel);
                            ctx.lineWidth = dataset.borderWidth || 2;
                            ctx.strokeStyle = dataset.borderColor;
                            if (dataset.borderDash) {
                                ctx.setLineDash(dataset.borderDash);
                            }
                            ctx.stroke();
                            ctx.restore();
                        }
                    });
                }
            }
        };

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        type: 'line',
                        label: `Max (${maxVal} ${fieldUnit})`,
                        data: Array(labels.length).fill(maxVal),
                        borderColor: '#15803d',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                        order: 1
                    },
                    {
                        type: 'line',
                        label: `Min (${minVal} ${fieldUnit})`,
                        data: Array(labels.length).fill(minVal),
                        borderColor: '#dc2626',
                        borderDash: [5, 4],
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                        order: 2
                    },
                    {
                        type: 'line',
                        label: `ตำแหน่งค่าจริง (X)`,
                        data: fieldData,
                        showLine: false,
                        pointStyle: 'crossRot',
                        pointRadius: 6.5,
                        pointHoverRadius: 8.5,
                        pointBorderWidth: 2,
                        pointBorderColor: boxBorderColors,
                        order: 3
                    },
                    {
                        type: 'bar',
                        label: `ค่าจริง (Floating Box)`,
                        data: floatingBoxData,
                        backgroundColor: boxBgColors,
                        borderColor: boxBorderColors,
                        borderWidth: 1.8,
                        borderSkipped: false,
                        borderRadius: 5,
                        barPercentage: 0.4,
                        order: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `[ ${fieldName} ]`,
                        align: 'start',
                        font: { family: 'Prompt', size: 13, weight: '700' },
                        color: textColor,
                        padding: { bottom: 8 }
                    },
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 6,
                            padding: 6,
                            font: { family: 'Prompt', size: 10 },
                            color: textColor,
                            filter: function (item) {
                                return !item.text.includes('ตำแหน่งค่าจริง');
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const idx = context.dataIndex;
                                const val = fieldData[idx];
                                const st = statusColors[idx];
                                if (val === null) return 'ไม่มีข้อมูล';
                                return `ค่าที่ตรวจวัดได้: ${val} ${fieldUnit} (${st.text})`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: `${fieldName} ${fieldUnit ? '(' + fieldUnit + ')' : ''}`,
                            font: { family: 'Prompt', size: 11, weight: '600' },
                            color: mutedColor
                        },
                        grid: { color: gridColor },
                        ticks: { color: mutedColor, font: { size: 10 } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: mutedColor, font: { size: 10 } }
                    }
                }
            },
            plugins: [horizontalLinePlugin]
        });

        window.chartInstancesCache[wrapperId].push(chart);
    });
}

// Export Analysis PDF (Official Certificate Report)
window.exportAnalysisPDF = function () {
    if (!currentAnalysisResult) {
        alert('กรุณาทำการวิเคราะห์ดินก่อนส่งออกไฟล์ PDF');
        return;
    }

    const dateStr = new Date(currentAnalysisResult.date).toLocaleDateString('th-TH', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    let itemsHtml = '';
    Object.keys(currentAnalysisResult.data).forEach(fieldId => {
        const item = currentAnalysisResult.data[fieldId];
        itemsHtml += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; font-weight: bold; color: #1e293b;">${item.name}</td>
                <td style="padding: 10px; text-align: center; font-size: 1.1em; color: #059669; font-weight: bold;">${item.value}</td>
            </tr>
        `;
    });

    let adviceClean = currentAnalysisResult.advices.map(a => `<li style="margin-bottom: 6px;">${a.replace(/<[^>]*>?/gm, '')}</li>`).join('');

    const printElement = document.createElement('div');
    printElement.style.padding = '30px';
    printElement.style.fontFamily = "'Prompt', sans-serif";
    printElement.style.color = '#0f172a';
    printElement.style.background = '#ffffff';

    printElement.innerHTML = `
        <div style="border: 2px solid #059669; padding: 25px; border-radius: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 15px; margin-bottom: 20px;">
                <div>
                    <h1 style="color: #059669; margin: 0; font-size: 24px; font-weight: bold;">🌱 Smart Soil - รายงานผลวิเคราะห์ดินทางการ</h1>
                    <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">ระบบวิเคราะห์สภาพดินเพื่อการเกษตรแม่นยำ</p>
                </div>
                <div style="text-align: right; font-size: 12px; color: #475569;">
                    <div><strong>วันที่ออกรายงาน:</strong> ${dateStr}</div>
                    <div><strong>เกษตรกรผู้ถือแปลง:</strong> ${currentUser.name}</div>
                    <div><strong>เบอร์โทรศัพท์:</strong> ${currentUser.phone}</div>
                </div>
            </div>

            <div style="margin-bottom: 25px;">
                <h3 style="color: #0284c7; border-left: 4px solid #0284c7; padding-left: 10px; margin-bottom: 12px; font-size: 16px;">1. ข้อมูลสภาพดินจากการตรวจวิเคราะห์</h3>
                <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; overflow: hidden;">
                    <thead>
                        <tr style="background: #e2e8f0; color: #334155; font-size: 13px;">
                            <th style="padding: 10px; text-align: left;">ตัวแปรวัดสภาพดิน</th>
                            <th style="padding: 10px; text-align: center;">ค่าที่วัดได้</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
            </div>

            <div style="margin-bottom: 25px;">
                <h3 style="color: #d97706; border-left: 4px solid #d97706; padding-left: 10px; margin-bottom: 12px; font-size: 16px;">2. สรุปคำแนะนำในการปรับปรุงคุณภาพดิน</h3>
                <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 14px; line-height: 1.6;">
                    ${adviceClean}
                </ul>
            </div>

            <div style="display: flex; gap: 20px; margin-bottom: 30px;">
                <div style="flex: 1; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px;">
                    <h4 style="color: #166534; margin: 0 0 6px 0; font-size: 14px;">🌾 พืชที่แนะนำให้เพาะปลูก:</h4>
                    <p style="margin: 0; color: #15803d; font-weight: bold; font-size: 15px;">${currentAnalysisResult.crops}</p>
                </div>
                <div style="flex: 1; background: #fefce8; border: 1px solid #fef08a; padding: 15px; border-radius: 8px;">
                    <h4 style="color: #854d0e; margin: 0 0 6px 0; font-size: 14px;">🧪 แผนและสูตรปุ๋ยแนะนำ:</h4>
                    <p style="margin: 0; color: #a16207; font-weight: bold; font-size: 15px;">${currentAnalysisResult.fertilizers}</p>
                </div>
            </div>

            <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8;">
                เอกสารนี้ได้รับการประมวลผลด้วยระบบ Smart Soil | ศูนย์บริการวิเคราะห์ดินดิจิทัล
            </div>
        </div>
    `;

    const opt = {
        margin: 10,
        filename: `รายงานวิเคราะห์ดิน_${currentUser.name}_${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(printElement).save();
};

// Export Analysis Excel
window.exportAnalysisExcel = function () {
    if (!currentAnalysisResult) {
        alert('กรุณาทำการวิเคราะห์ดินก่อนส่งออกไฟล์ Excel');
        return;
    }

    const excelData = [];
    Object.keys(currentAnalysisResult.data).forEach(fieldId => {
        const item = currentAnalysisResult.data[fieldId];
        excelData.push({
            'ตัวแปรดิน': item.name,
            'ค่าที่วัดได้': item.value
        });
    });

    excelData.push({});
    excelData.push({ 'ตัวแปรดิน': 'พืชที่แนะนำ', 'ค่าที่วัดได้': currentAnalysisResult.crops });
    excelData.push({ 'ตัวแปรดิน': 'สูตรปุ๋ยแนะนำ', 'ค่าที่วัดได้': currentAnalysisResult.fertilizers });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ผลวิเคราะห์ดิน");
    XLSX.writeFile(wb, `ผลวิเคราะห์ดิน_${currentUser.name}.xlsx`);
};

// Export History Excel
window.exportHistoryExcel = function () {
    const allRecords = JSON.parse(localStorage.getItem(DB_RECORDS)) || [];
    const userRecords = allRecords.filter(r => r.userId === currentUser.id);

    if (userRecords.length === 0) {
        alert('ยังไม่มีประวัติการวิเคราะห์ดินสำหรับส่งออก');
        return;
    }

    const excelData = userRecords.map((r, idx) => {
        const date = new Date(r.date).toLocaleDateString('th-TH');
        return {
            'ลำดับ': idx + 1,
            'วันที่วิเคราะห์': date,
            'สถานะดิน': r.status === 'good' ? 'เหมาะสม' : 'ต้องปรับปรุง',
            'พืชที่แนะนำ': r.crops,
            'สูตรปุ๋ยแนะนำ': r.fertilizers
        };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ประวัติวิเคราะห์ดิน");
    XLSX.writeFile(wb, `ประวัติการวิเคราะห์ดิน_${currentUser.name}.xlsx`);
};

// Stepper Progress Bar Controller
window.updateStepper = function (stepState) {
    const item1 = document.getElementById('step-item-1');
    const item2 = document.getElementById('step-item-2');
    const item3 = document.getElementById('step-item-3');
    const item4 = document.getElementById('step-item-4');

    const line1 = document.getElementById('step-line-1');
    const line2 = document.getElementById('step-line-2');
    const line3 = document.getElementById('step-line-3');

    if (!item1) return;

    [item1, item2, item3, item4].forEach(item => {
        if (item) item.classList.remove('active', 'completed');
    });
    [line1, line2, line3].forEach(line => {
        if (line) line.classList.remove('completed');
    });

    if (stepState === 1) {
        item1.classList.add('active');
    } else if (stepState === 2) {
        item1.classList.add('completed');
        if (line1) line1.classList.add('completed');
        item2.classList.add('active');
    } else if (stepState === 3) {
        item1.classList.add('completed');
        if (line1) line1.classList.add('completed');
        item2.classList.add('completed');
        if (line2) line2.classList.add('completed');
        item3.classList.add('active');
    } else if (stepState === 4) {
        item1.classList.add('completed');
        if (line1) line1.classList.add('completed');
        item2.classList.add('completed');
        if (line2) line2.classList.add('completed');
        item3.classList.add('completed');
        if (line3) line3.classList.add('completed');
        item4.classList.add('completed');
    }
};

// View History Details in Modal
window.viewHistoryDetail = function (id) {
    const allRecords = JSON.parse(localStorage.getItem(DB_RECORDS)) || [];
    const record = allRecords.find(r => r.id === id);
    if (!record) return;
    window.lastOpenedHistoryRecord = record;

    const modalBody = document.getElementById('history-detail-body');
    const date = new Date(record.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    const time = new Date(record.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    let boxResultsHtml = '';
    let boxOptimalHtml = '';
    let boxAdvicesHtml = '';

    if (record.advices && Array.isArray(record.advices) && typeof record.advices[0] === 'object') {
        boxResultsHtml = record.advices.map(a => `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border-color); padding: 0.75rem 0;">
                <span>${a.fieldName} <strong style="margin-left: 0.5rem; color: var(--text-primary); font-size: 1.05rem;">${a.val}</strong> <span class="text-muted" style="font-size: 0.85rem;">${a.unit}</span></span>
                <span style="min-width: 100px; text-align: right;">${a.statusHtml}</span>
            </div>
        `).join('');

        boxOptimalHtml = record.advices.map(a => `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border-color); padding: 0.75rem 0;">
                <span>${a.fieldName}</span>
                <span style="font-weight: 600; color: #0284c7;">${a.idealVal || '-'} <span class="text-muted" style="font-size: 0.85rem; font-weight: normal;">${a.unit}</span></span>
            </div>
        `).join('');

        const validAdvices = record.advices.filter(a => a.adviceText && a.adviceText.trim() !== '' && a.adviceText !== 'ควรปรับปรุงสภาพดินให้อยู่ในเกณฑ์มาตรฐาน');
        if (validAdvices.length > 0) {
            boxAdvicesHtml = '<ol style="margin: 0; padding-left: 1.25rem;">' +
                validAdvices.map(a => `<li style="margin-bottom: 0.75rem;"><strong>${a.fieldName}:</strong> ${a.adviceText}</li>`).join('') +
                '</ol>';
        } else {
            boxAdvicesHtml = '<div class="text-muted text-center" style="padding: 1rem;"><i class="fas fa-check-circle text-emerald"></i> ดินอยู่ในสภาพสมบูรณ์ ไม่จำเป็นต้องจัดการเพิ่มเติม</div>';
        }
    } else {
        // Fallback for old data structure
        Object.keys(record.data).forEach(fieldId => {
            const item = record.data[fieldId];
            boxResultsHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border-color); padding: 0.75rem 0;">
                    <span>${item.name} <strong style="margin-left: 0.5rem; color: var(--text-primary); font-size: 1.05rem;">${item.value}</strong></span>
                    <span style="min-width: 100px; text-align: right;">-</span>
                </div>
            `;
            boxOptimalHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border-color); padding: 0.75rem 0;">
                    <span>${item.name}</span>
                    <span style="font-weight: 600; color: #0284c7;">-</span>
                </div>
            `;
        });
        boxAdvicesHtml = '<div class="text-muted text-center">ไม่มีข้อมูลคำแนะนำ</div>';
    }

    modalBody.innerHTML = `
        <div class="mb-4" style="text-align: center;">
            <div style="font-size: 0.9rem; color: var(--text-muted);">วันที่วิเคราะห์</div>
            <div style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary);">${date} เวลา ${time} น.</div>
            <div class="mt-2">
                ${record.status === 'good'
            ? '<span class="badge badge-success px-3 py-1" style="font-size: 0.9rem;"><i class="fas fa-check-circle"></i> สถานะ: เหมาะสม</span>'
            : '<span class="badge badge-warning px-3 py-1" style="font-size: 0.9rem;"><i class="fas fa-exclamation-triangle"></i> สถานะ: ต้องปรับปรุง</span>'}
            </div>
        </div>

        <div class="ldd-report-grid mb-6" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; text-align: left;">
            <!-- Box 1: Analysis Results -->
            <div class="glass-card">
                <h4 class="mb-3" style="color: var(--primary-color); border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem; text-align: left;"><i class="fas fa-microscope"></i> ผลวิเคราะห์</h4>
                <div style="font-size: 0.95rem;">
                    ${boxResultsHtml}
                </div>
            </div>
            
            <!-- Box 2: Optimal Standards -->
            <div class="glass-card">
                <h4 class="mb-3" style="color: #0284c7; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem; text-align: left;"><i class="fas fa-bullseye"></i> เกณฑ์มาตรฐานที่เหมาะสม</h4>
                <div style="font-size: 0.95rem;">
                    ${boxOptimalHtml}
                </div>
            </div>

            <!-- Box 3: Recommended Fertilizers -->
            <div class="glass-card" style="grid-column: 1 / -1; text-align: left;">
                <h4 class="mb-3" style="color: #d97706; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem;"><i class="fas fa-seedling"></i> พืชที่แนะนำและสูตรปุ๋ย</h4>
                <div style="font-size: 0.95rem; line-height: 1.6;">
                    <div class="mb-2"><strong>พืชที่แนะนำ:</strong> <span class="text-emerald font-semibold">${record.crops || '-'}</span></div>
                    <div><strong>สูตรปุ๋ย:</strong> <span style="color: #b45309; font-weight: 600;">${record.fertilizers || '-'}</span></div>
                </div>
            </div>

            <!-- Box 4: Advices -->
            <div class="glass-card" style="grid-column: 1 / -1; text-align: left;">
                <h4 class="mb-3" style="color: #7c3aed; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem;"><i class="fas fa-lightbulb"></i> คำแนะนำการจัดการดินและธาตุอาหาร</h4>
                <div style="line-height: 1.8; font-size: 0.95rem;">
                    ${boxAdvicesHtml}
                </div>
            </div>

            <!-- Radar Chart Card -->
            <div class="glass-card" style="grid-column: 1 / -1; text-align: left; padding: 1.25rem;">
                <div class="flex justify-between items-center mb-3 pb-2" style="border-bottom: 1px solid var(--border-color);">
                    <h4 style="color: var(--primary-color); margin: 0; font-size: 1.05rem;"><i class="fas fa-project-diagram mr-2"></i> สมดุลธาตุอาหารในดิน (Nutrient Balance Radar Chart)</h4>
                    <span class="badge badge-success" style="background: rgba(16, 185, 129, 0.1); color: var(--primary-color); font-size: 0.78rem;"><i class="fas fa-check-circle mr-1"></i> เกณฑ์ 100%</span>
                </div>
                <div style="max-width: 480px; margin: 0 auto; position: relative; height: 320px;">
                    <canvas id="modalRadarChartCanvas"></canvas>
                </div>
            </div>
        </div>
        
        <div id="modal-charts-wrapper" class="responsive-chart-grid mb-4">
            <!-- Modal charts injected here -->
        </div>
    `;

    document.getElementById('modal-history-detail').classList.add('active');

    // Render Modal Charts
    renderChart([record], 'modal-charts-wrapper');
    if (record.advices) {
        renderRadarChart(record.advices, 'modalRadarChartCanvas');
    }
};

// Close Modal
window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
};

// Edit Record
window.editRecord = function (id) {
    const allRecords = JSON.parse(localStorage.getItem(DB_RECORDS)) || [];
    const record = allRecords.find(r => r.id === id);
    if (!record) return;

    // Load data into Step 1
    const plotNameInput = document.getElementById('plot-name');
    if (plotNameInput) plotNameInput.value = record.plotName || '';

    const inputs = document.querySelectorAll('.dynamic-input');
    inputs.forEach(input => {
        const fieldId = input.getAttribute('data-id');
        if (record.data && record.data[fieldId]) {
            input.value = record.data[fieldId].value;
        }
    });

    window.editingRecordId = id;

    switchDashboardTab('analyze');
    goToWizardStep(1);

    // Show a small toast or alert
    alert('ข้อมูลถูกโหลดเข้าสู่แบบฟอร์มเพื่อแก้ไขแล้ว เมื่อคุณกดวิเคราะห์และบันทึก จะเป็นการแก้ไขข้อมูลเดิม');
};

// Delete Record
window.deleteRecord = async function (id) {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบประวัติการวิเคราะห์ดินรายการนี้? (การกระทำนี้ไม่สามารถย้อนกลับได้)')) {
        try {
            await db.collection('analysis_history').doc(id).delete();
            alert('ลบข้อมูลสำเร็จ');
            renderHistory();
        } catch (error) {
            console.error("Error deleting record: ", error);
            alert("เกิดข้อผิดพลาดในการลบข้อมูล");
        }
    }
};

// ================= OFFICIAL REPORT EXPORT (PDF & PNG) =================
function generateOfficialReportContainer(recordData) {
    const data = recordData || currentAnalysisResult || {};
    const dateStr = new Date(data.date || Date.now()).toLocaleDateString('th-TH', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    const timeStr = new Date(data.date || Date.now()).toLocaleTimeString('th-TH', {
        hour: '2-digit', minute: '2-digit'
    });

    const cropName = data.cropType === 'durian' ? 'ทุเรียน' : (data.cropType === 'rice' ? 'ข้าว' : (data.cropType === 'sugarcane' ? 'อ้อย' : 'พืชทั่วไป'));
    const farmerName = (currentUser && currentUser.name) ? currentUser.name : (data.farmerName || 'เกษตรกรผู้ถือแปลง');
    const farmerPhone = (currentUser && currentUser.phone) ? currentUser.phone : '-';
    const plotName = data.plotName || 'แปลงเกษตรทั่วไป';

    // 1. Capture Radar Chart Canvas
    let radarImgSrc = '';
    const radarCanvas = document.getElementById('modalRadarChartCanvas') || document.getElementById('radarChartCanvas');
    if (radarCanvas) {
        try {
            radarImgSrc = radarCanvas.toDataURL('image/png');
        } catch (e) {
            console.warn('Could not capture radar canvas:', e);
        }
    }

    // 2. Build Analysis Table Rows
    let tableRows = '';
    if (data.advices && Array.isArray(data.advices) && typeof data.advices[0] === 'object') {
        tableRows = data.advices.map(a => {
            const adviceCleanText = a.adviceText ? a.adviceText.replace(/<[^>]*>?/gm, '') : '-';
            return `
                <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
                    <td style="padding: 8px 10px; font-weight: 600; color: #1e293b;">${a.fieldName}</td>
                    <td style="padding: 8px 10px; text-align: center; font-weight: 700; color: #0f172a; font-size: 14px;">${a.val} <span style="font-size: 11px; color: #64748b; font-weight: normal;">${a.unit || ''}</span></td>
                    <td style="padding: 8px 10px; text-align: center; color: #0284c7; font-weight: 600;">${a.idealVal || (a.stdMin + ' - ' + a.stdMax)} ${a.unit || ''}</td>
                    <td style="padding: 8px 10px; text-align: center;">${a.statusHtml || '-'}</td>
                </tr>
            `;
        }).join('');
    } else if (data.data) {
        Object.keys(data.data).forEach(k => {
            const item = data.data[k];
            tableRows += `
                <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
                    <td style="padding: 8px 10px; font-weight: 600; color: #1e293b;">${item.name}</td>
                    <td style="padding: 8px 10px; text-align: center; font-weight: 700; color: #0f172a; font-size: 14px;">${item.value}</td>
                    <td style="padding: 8px 10px; text-align: center; color: #0284c7;">-</td>
                    <td style="padding: 8px 10px; text-align: center;">-</td>
                </tr>
            `;
        });
    }

    // 3. Build Advices List
    let advicesList = '';
    if (data.advices && Array.isArray(data.advices)) {
        if (typeof data.advices[0] === 'object') {
            const valid = data.advices.filter(a => a.adviceText && a.adviceText.trim() !== '' && a.adviceText !== 'ควรปรับปรุงสภาพดินให้อยู่ในเกณฑ์มาตรฐาน');
            if (valid.length > 0) {
                advicesList = valid.map((a, idx) => `
                    <li style="margin-bottom: 6px; font-size: 13px; color: #334155; line-height: 1.5;">
                        <strong>${idx + 1}. ${a.fieldName}:</strong> ${a.adviceText}
                    </li>
                `).join('');
            } else {
                advicesList = '<div style="color: #10b981; font-size: 13px;">สภาพดินอยู่ในเกณฑ์สมบูรณ์ดีตามมาตรฐาน ไม่จำเป็นต้องใส่สารปรับปรุงดินเพิ่มเติม</div>';
            }
        } else {
            advicesList = data.advices.map((a, idx) => `<li style="margin-bottom: 6px; font-size: 13px; color: #334155;">${idx + 1}. ${a}</li>`).join('');
        }
    }

    // 4. Construct Official Container
    const container = document.createElement('div');
    container.className = 'official-pdf-container';
    container.style.width = '794px'; // A4 pixel width at 96dpi
    container.style.padding = '35px 40px';
    container.style.background = '#ffffff';
    container.style.color = '#0f172a';
    container.style.fontFamily = "'Prompt', 'Sarabun', sans-serif";
    container.style.boxSizing = 'border-box';
    // Fix for white page: Place at top left but under everything
    container.style.position = 'absolute';
    container.style.left = '0';
    container.style.top = '0';
    container.style.zIndex = '-9999';

    container.innerHTML = `
        <!-- Official Header (กรมพัฒนาที่ดิน Style) -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 14px;">
                <div style="width: 58px; height: 58px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; color: white; font-size: 26px; box-shadow: 0 4px 10px rgba(16,185,129,0.25);">
                    <i class="fas fa-seedling"></i>
                </div>
                <div>
                    <h2 style="margin: 0; color: #059669; font-size: 20px; font-weight: 700; line-height: 1.2;">Smart Soil Analysis Center</h2>
                    <span style="font-size: 13px; color: #475569; font-weight: 500;">ระบบวิเคราะห์ดิน | เพื่อการจัดการอย่างแม่นยำ </span>
                </div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #475569; line-height: 1.4;">
                <div style="font-weight: 700; color: #059669; font-size: 13px;">ใบรายงานผลทางการ (Official Certificate)</div>
                <div>วันที่ออกเอกสาร: ${dateStr}</div>
                <div>เวลา: ${timeStr} น.</div>
            </div>
        </div>

        <!-- Document Title -->
        <div style="text-align: center; margin-bottom: 20px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h1 style="margin: 0; font-size: 21px; font-weight: 700; color: #0f172a;">ผลการวิเคราะห์การใช้ปุ๋ยและปรับปรุงคุณภาพดิน</h1>
            <div style="font-size: 14px; color: #059669; font-weight: 600; margin-top: 4px;">
                ชนิดพืช: <strong>${cropName}</strong> | แปลงเกษตร: <strong>${plotName}</strong> | เกษตรกร: <strong>${farmerName}</strong> (${farmerPhone})
            </div>
        </div>

        <!-- Section 1: Analysis Table -->
        <div style="margin-bottom: 18px;">
            <h3 style="margin: 0 0 8px 0; font-size: 15px; color: #059669; border-left: 4px solid #059669; padding-left: 8px;">1. ผลตรวจวิเคราะห์สภาพดินเทียบเกณฑ์มาตรฐาน</h3>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1;">
                <thead>
                    <tr style="background: #f1f5f9; color: #334155; font-size: 13px; text-align: left;">
                        <th style="padding: 8px 10px; border-bottom: 2px solid #cbd5e1;">ตัวแปรวัดสภาพดิน</th>
                        <th style="padding: 8px 10px; border-bottom: 2px solid #cbd5e1; text-align: center;">ค่าที่วัดได้</th>
                        <th style="padding: 8px 10px; border-bottom: 2px solid #cbd5e1; text-align: center;">เกณฑ์เหมาะสม</th>
                        <th style="padding: 8px 10px; border-bottom: 2px solid #cbd5e1; text-align: center;">การประเมินสถานะ</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>

        <!-- Section 2: Recommended Crops & Fertilizers -->
        <div style="display: flex; gap: 14px; margin-bottom: 18px;">
            <div style="flex: 1; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 8px;">
                <div style="font-size: 13px; font-weight: 700; color: #166534; margin-bottom: 4px;"><i class="fas fa-leaf mr-1"></i> พืชที่แนะนำให้เพาะปลูก:</div>
                <div style="font-size: 14px; font-weight: 600; color: #15803d;">${data.crops || '-'}</div>
            </div>
            <div style="flex: 1; background: #fefce8; border: 1px solid #fef08a; padding: 12px; border-radius: 8px;">
                <div style="font-size: 13px; font-weight: 700; color: #854d0e; margin-bottom: 4px;"><i class="fas fa-flask mr-1"></i> แผนและสูตรปุ๋ยพื้นฐาน:</div>
                <div style="font-size: 14px; font-weight: 600; color: #a16207;">${data.fertilizers || '-'}</div>
            </div>
        </div>

        <!-- Section 3: Smart Advices -->
        <div style="margin-bottom: 20px;">
            <h3 style="margin: 0 0 8px 0; font-size: 15px; color: #7c3aed; border-left: 4px solid #7c3aed; padding-left: 8px;">2. คำแนะนำการใส่ปุ๋ยและปรับปรุงคุณภาพดินอัจฉริยะ</h3>
            <ul style="margin: 0; padding-left: 18px;">
                ${advicesList}
            </ul>
        </div>

        <!-- Section 4: Embedded Charts (Radar Chart Only) -->
        <div style="margin-bottom: 20px; page-break-inside: avoid;">
            <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #0284c7; border-left: 4px solid #0284c7; padding-left: 8px;">3. แผนภูมิแสดงสมดุลธาตุอาหาร</h3>
            <div style="display: flex; gap: 16px; align-items: center; justify-content: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
                ${radarImgSrc ? `
                <div style="text-align: center; flex: 1;">
                    <div style="font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px;">🕸️ กราฟใยแมงมุมสมดุลธาตุอาหาร (100% Ideal)</div>
                    <img src="${radarImgSrc}" style="max-width: 320px; width: 100%; height: auto; object-fit: contain;">
                </div>` : '<div style="text-align: center; width: 100%; color: #64748b; font-size: 13px;">(ไม่พบข้อมูลกราฟใยแมงมุม)</div>'}
            </div>
        </div>

        <!-- Official Signatures & Seal Footer -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; pt-15px; border-top: 1px solid #cbd5e1; page-break-inside: avoid;">
            <div style="font-size: 11px; color: #64748b; line-height: 1.6;">
                * เอกสารนี้ได้รับการประมวลผลอัตโนมัติด้วยระบบ Smart Soil Engine<br>
                * ใช้เป็นคำแนะนำสำหรับการปรับปรุงดินและการใส่ปุ๋ยทางการเกษตรแม่นยำ<br>
                * รหัสอ้างอิงเอกสาร: SSL-REPORT-${Date.now().toString().slice(-6)}
            </div>
            <div style="text-align: center; width: 200px;">
                <div style="border-bottom: 1px dashed #94a3b8; height: 40px; margin-bottom: 4px;"></div>
                <div style="font-size: 13px; font-weight: 600; color: #334155;">(${farmerName})</div>
                <div style="font-size: 11px; color: #64748b;">ผู้ขอรับการวิเคราะห์ดิน</div>
            </div>
        </div>
    `;

    return container;
}

// Unified Official Export Image (PNG)
window.exportAnalysisImage = function (elementId, filename) {
    let targetRecord = currentAnalysisResult;
    if (!targetRecord && window.lastOpenedHistoryRecord) {
        targetRecord = window.lastOpenedHistoryRecord;
    }

    if (typeof html2canvas === 'undefined') {
        alert('ไลบรารี html2canvas ยังโหลดไม่เสร็จสมบูรณ์ โปรดลองอีกครั้ง');
        return;
    }

    const e = window.event;
    const btn = e ? e.currentTarget : null;
    let btnText = '';
    if (btn) {
        btnText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังสร้างรูปภาพทางการ...';
    }

    const reportContainer = generateOfficialReportContainer(targetRecord);
    document.body.appendChild(reportContainer);

    html2canvas(reportContainer, {
        scale: 2, // High resolution
        backgroundColor: '#ffffff',
        useCORS: true
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = filename || `รายงานวิเคราะห์ดิน_${targetRecord ? targetRecord.plotName : 'Official'}.png`;
        link.href = imgData;
        link.click();
        reportContainer.remove();
        if (btn) btn.innerHTML = btnText;
    }).catch(err => {
        console.error('Error generating image:', err);
        if (reportContainer) reportContainer.remove();
        alert('เกิดข้อผิดพลาดในการสร้างรูปภาพ');
        if (btn) btn.innerHTML = btnText;
    });
};

// Unified Official Export PDF
window.exportAnalysisPDF = function (elementId, filename) {
    let targetRecord = currentAnalysisResult;
    if (!targetRecord && window.lastOpenedHistoryRecord) {
        targetRecord = window.lastOpenedHistoryRecord;
    }

    if (typeof html2pdf === 'undefined') {
        alert('ไลบรารี html2pdf ยังโหลดไม่เสร็จสมบูรณ์');
        return;
    }

    const e = window.event;
    const btn = e ? e.currentTarget : null;
    let btnText = '';
    if (btn) {
        btnText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังสร้าง PDF ทางการ...';
    }

    const reportContainer = generateOfficialReportContainer(targetRecord);
    document.body.appendChild(reportContainer);

    const opt = {
        margin: 8,
        filename: filename || `รายงานวิเคราะห์ดินทางการ_${targetRecord ? targetRecord.plotName : 'Official'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(reportContainer).save().then(() => {
        reportContainer.remove();
        if (btn) btn.innerHTML = btnText;
    }).catch(err => {
        console.error('Error generating PDF:', err);
        if (reportContainer) reportContainer.remove();
        alert('เกิดข้อผิดพลาดในการสร้าง PDF');
        if (btn) btn.innerHTML = btnText;
    });
};

// Helper: Generate Mobile Cards HTML
function generateMobileCardsHtml(advices) {
    if (!advices || !Array.isArray(advices)) return '';
    return advices.map(a => {
        const isObj = typeof a === 'object';
        const fieldName = isObj ? a.fieldName : 'ตัวแปรดิน';
        const stdMin = isObj ? a.stdMin : '-';
        const stdMax = isObj ? a.stdMax : '-';
        const unit = isObj ? a.unit : '';
        const val = isObj ? a.val : '-';
        const statusHtml = isObj ? a.statusHtml : '';
        const adviceText = isObj ? a.adviceText : a;

        return `
            <div class="mobile-analysis-card">
                <div class="mobile-card-header">
                    <span class="mobile-card-title"><i class="fas fa-flask text-emerald mr-1"></i> ${fieldName}</span>
                    <div class="mobile-card-status">${statusHtml}</div>
                </div>
                <div class="mobile-card-body">
                    <div class="mobile-metric-item">
                        <span class="metric-label">ค่ามาตรฐาน</span>
                        <span class="metric-val std-val">${stdMin} - ${stdMax} ${unit}</span>
                    </div>
                    <div class="mobile-metric-item">
                        <span class="metric-label">ค่าที่วัดได้</span>
                        <span class="metric-val measured-val">${val} ${unit}</span>
                    </div>
                </div>
                ${adviceText ? `
                <div class="mobile-card-footer">
                    <i class="fas fa-lightbulb text-warning mr-1"></i> ${adviceText}
                </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// ================= PILLAR 3: CHARTS & VISUALIZATIONS =================
if (!window.radarChartInstances) window.radarChartInstances = {};

function renderRadarChart(advices, canvasId = 'radarChartCanvas') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (window.radarChartInstances[canvasId]) {
        window.radarChartInstances[canvasId].destroy();
        window.radarChartInstances[canvasId] = null;
    }

    if (!advices || advices.length === 0) return;

    // Filter only fields with valid min-max standards
    const validAdvices = advices.filter(a => a.stdMin !== '-' && !isNaN(a.val));
    if (validAdvices.length === 0) return;

    const labels = validAdvices.map(a => a.fieldName);
    const idealScores = validAdvices.map(() => 100); // Ideal target is 100%

    // Calculate score for each field: (val / midpoint) * 100
    const actualScores = validAdvices.map(a => {
        const min = parseFloat(a.stdMin);
        const max = parseFloat(a.stdMax);
        const mid = (min + max) / 2;
        if (isNaN(mid) || mid === 0) return 100;

        let score = (a.val / mid) * 100;
        // Cap max score at 160% for chart visual clarity
        return Math.min(Math.round(score), 160);
    });

    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDarkMode ? '#cbd5e1' : '#475569';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)';

    window.radarChartInstances[canvasId] = new Chart(canvas, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'เกณฑ์สมบูรณ์แบบ (Ideal 100%)',
                    data: idealScores,
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    borderColor: 'rgba(16, 185, 129, 0.8)',
                    borderWidth: 2,
                    pointBackgroundColor: '#10b981',
                    borderDash: [4, 4]
                },
                {
                    label: 'ค่าดินปัจจุบันของคุณ',
                    data: actualScores,
                    backgroundColor: 'rgba(2, 132, 199, 0.25)',
                    borderColor: '#0284c7',
                    borderWidth: 3,
                    pointBackgroundColor: '#0284c7',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: gridColor },
                    grid: { color: gridColor },
                    pointLabels: {
                        color: textColor,
                        font: { size: 11, family: "'Prompt', sans-serif", weight: '500' }
                    },
                    ticks: {
                        color: textColor,
                        backdropColor: 'transparent',
                        stepSize: 25,
                        font: { size: 9 }
                    },
                    suggestedMin: 0,
                    suggestedMax: 140
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: textColor,
                        font: { family: "'Prompt', sans-serif", size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${context.raw}%`;
                        }
                    }
                }
            }
        }
    });
}

let currentTrendChart = null;
let cachedHistoryRecords = [];

window.onTrendPlotSelect = function (selectedPlot) {
    if (cachedHistoryRecords && cachedHistoryRecords.length > 0) {
        renderHistoryTrendChart(cachedHistoryRecords, selectedPlot);
    }
};

function populatePlotSelector(userRecords, selectedPlot = 'ALL') {
    const selector = document.getElementById('trend-plot-selector');
    if (!selector) return;

    const plotNames = Array.from(new Set(userRecords.map(r => r.plotName || 'ไม่ระบุ')));

    let html = `<option value="ALL" ${selectedPlot === 'ALL' ? 'selected' : ''}>ทุกแปลงเกษตร (ทั้งหมด)</option>`;
    plotNames.forEach(name => {
        const isSelected = selectedPlot === name ? 'selected' : '';
        html += `<option value="${name}" ${isSelected}>แปลง: ${name}</option>`;
    });

    selector.innerHTML = html;
}

function renderHistoryTrendChart(userRecords, selectedPlot = 'ALL') {
    const canvas = document.getElementById('historyTrendCanvas');
    if (!canvas) return;

    cachedHistoryRecords = userRecords;
    populatePlotSelector(userRecords, selectedPlot);

    if (currentTrendChart) {
        currentTrendChart.destroy();
        currentTrendChart = null;
    }

    if (!userRecords || userRecords.length === 0) {
        return;
    }

    // Filter by selected plot
    let filteredRecords = userRecords;
    if (selectedPlot && selectedPlot !== 'ALL') {
        filteredRecords = userRecords.filter(r => (r.plotName || 'ไม่ระบุ') === selectedPlot);
    }

    if (filteredRecords.length === 0) {
        return;
    }

    // Sort ascending by date
    const sorted = [...filteredRecords].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Check if multiple records share the same date string (same day)
    const dateStrings = sorted.map(r => new Date(r.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }));
    const hasSameDayDuplicates = new Set(dateStrings).size < dateStrings.length;

    // Prepare labels with time if same day or single plot selected
    const labels = sorted.map(r => {
        const d = new Date(r.date);
        const dateStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        const timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        return (hasSameDayDuplicates || (selectedPlot && selectedPlot !== 'ALL')) ? `${dateStr} ${timeStr}` : dateStr;
    });

    // Extract parameters over time: pH, OM, P, K
    const extractParamData = (paramName) => {
        return sorted.map(r => {
            if (r.advices) {
                const adv = r.advices.find(a => a.fieldName && a.fieldName.toLowerCase().includes(paramName.toLowerCase()));
                return adv ? adv.val : null;
            }
            return null;
        });
    };

    const phValues = extractParamData('pH');
    const omValues = extractParamData('OM');
    const pValues = extractParamData('P');
    const kValues = extractParamData('K');

    const datasets = [];
    const colors = {
        pH: '#10b981',
        OM: '#f59e0b',
        P: '#0284c7',
        K: '#8b5cf6'
    };

    if (phValues.some(v => v !== null)) {
        datasets.push({
            label: 'pH (กรด-ด่าง)',
            data: phValues,
            borderColor: colors.pH,
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.35,
            fill: false,
            borderWidth: 3,
            pointRadius: 5,
            pointBackgroundColor: '#10b981'
        });
    }

    if (omValues.some(v => v !== null)) {
        datasets.push({
            label: 'OM (%)',
            data: omValues,
            borderColor: colors.OM,
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            tension: 0.35,
            fill: false,
            borderWidth: 3,
            pointRadius: 5,
            pointBackgroundColor: '#f59e0b'
        });
    }

    if (pValues.some(v => v !== null)) {
        datasets.push({
            label: 'P (mg/kg)',
            data: pValues,
            borderColor: colors.P,
            backgroundColor: 'rgba(2, 132, 199, 0.1)',
            tension: 0.35,
            fill: false,
            borderWidth: 2,
            borderDash: [4, 4],
            pointRadius: 4,
            pointBackgroundColor: '#0284c7'
        });
    }

    if (kValues.some(v => v !== null)) {
        datasets.push({
            label: 'K (mg/kg)',
            data: kValues,
            borderColor: colors.K,
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            tension: 0.35,
            fill: false,
            borderWidth: 2,
            borderDash: [4, 4],
            pointRadius: 4,
            pointBackgroundColor: '#8b5cf6'
        });
    }

    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDarkMode ? '#cbd5e1' : '#475569';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)';

    currentTrendChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor, font: { family: "'Prompt', sans-serif", size: 11 } }
                },
                tooltip: {
                    callbacks: {
                        title: function (items) {
                            const idx = items[0].dataIndex;
                            const rec = sorted[idx];
                            return `แปลง: ${rec.plotName || 'ไม่ระบุ'} (${items[0].label})`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor, font: { family: "'Prompt', sans-serif", size: 10 } }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: { color: textColor, font: { family: "'Prompt', sans-serif", size: 10 } },
                    beginAtZero: false
                }
            }
        }
    });
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardCropStandards('general');
    goToWizardStep(1);
});
