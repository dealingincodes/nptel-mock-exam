/* ============================================================
   Admin Panel JavaScript — Firebase + localStorage fallback
   ============================================================ */

// ── Firebase DB reference ─────────────────────────────────────
let dbRef = null;

function initFirebase() {
  if (!FIREBASE_ENABLED) return false;
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    dbRef = firebase.database().ref(DB_PATH);
    return true;
  } catch (e) {
    console.error('Firebase init failed:', e);
    return false;
  }
}

// ── LocalStorage ──────────────────────────────────────────────
const LS_KEY = 'nptel_exams';
function getLocalExams() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; }
}
function saveLocalExams(exams) {
  localStorage.setItem(LS_KEY, JSON.stringify(exams));
}

// ── Firebase with timeout wrapper ─────────────────────────────
function firebaseSetWithTimeout(ref, data, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Firebase write timed out. Check your Database Rules in the Firebase Console.'));
    }, timeoutMs);

    ref.set(data)
      .then(() => { clearTimeout(timer); resolve(); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

function firebaseGetWithTimeout(ref, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Firebase read timed out. Check your Database Rules.'));
    }, timeoutMs);

    ref.once('value')
      .then(snap => { clearTimeout(timer); resolve(snap); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// ── State ─────────────────────────────────────────────────────
let parsedQuestions = [];
let firebaseReady   = false;

// ── Banner helpers ────────────────────────────────────────────
function showConfigBanner() {
  const b = document.getElementById('firebase-banner');
  if (b) b.style.display = 'flex';
}
function hideConfigBanner() {
  const b = document.getElementById('firebase-banner');
  if (b) b.style.display = 'none';
}

// ── Tab Navigation ────────────────────────────────────────────
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'manage-panel') renderSavedExams();
  });
});

// ── Upload Zone ───────────────────────────────────────────────
const uploadZone = document.getElementById('upload-zone');
const fileInput  = document.getElementById('csv-file-input');

uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

function handleFile(file) {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    showToast('Please upload a valid .csv file!', 'error');
    return;
  }
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    complete: (results) => {
      if (results.errors.length > 0 && results.data.length === 0) {
        showToast('CSV parsing failed. Check file format.', 'error');
        return;
      }
      processCSVData(results.data, results.meta.fields || []);
    },
    error: (err) => showToast('Error reading file: ' + err.message, 'error')
  });
}

// ── CSV Processing ────────────────────────────────────────────
const REQUIRED_COLUMNS = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer'];

function processCSVData(data, fields) {
  const normFields = fields.map(f => f.toLowerCase().trim().replace(/\s+/g, '_'));
  const missing    = REQUIRED_COLUMNS.filter(col => !normFields.includes(col));

  if (missing.length > 0) {
    showAlertError(`Missing required columns: <strong>${missing.join(', ')}</strong>`);
    return;
  }
  clearAlert();

  const normalized = data.map(row => {
    const obj = {};
    Object.keys(row).forEach(k => {
      obj[k.toLowerCase().trim().replace(/\s+/g, '_')] = (row[k] || '').trim();
    });
    return obj;
  });

  parsedQuestions = normalized.map((row, idx) => ({
    no:          parseInt(row.question_no) || (idx + 1),
    question:    row.question,
    options:     { A: row.option_a, B: row.option_b, C: row.option_c, D: row.option_d },
    correct:     (row.correct_answer || '').toUpperCase().trim(),
    explanation: row.explanation || ''
  }));

  const invalidCount = parsedQuestions.filter(q =>
    !q.question || !q.options.A || !q.options.B || !q.options.C || !q.options.D ||
    !['A','B','C','D'].includes(q.correct)
  ).length;

  if (invalidCount > 0) showAlertWarning(`${invalidCount} row(s) have issues. Highlighted below.`);

  renderPreview(parsedQuestions);
  showToast(`${parsedQuestions.length} questions loaded!`, 'success');
  document.getElementById('save-action-bar').style.display = 'flex';
}

function showAlertError(msg) {
  const el = document.getElementById('parse-alert');
  el.className = 'alert alert-error';
  el.innerHTML = `<span class="alert-icon">❌</span><div>${msg}</div>`;
  el.style.display = 'flex';
}
function showAlertWarning(msg) {
  const el = document.getElementById('parse-alert');
  el.className = 'alert alert-warning';
  el.innerHTML = `<span class="alert-icon">⚠️</span><div>${msg}</div>`;
  el.style.display = 'flex';
}
function clearAlert() {
  document.getElementById('parse-alert').style.display = 'none';
}

// ── Preview Table ─────────────────────────────────────────────
function renderPreview(questions) {
  document.getElementById('preview-section').classList.add('visible');
  document.getElementById('stat-total').textContent   = questions.length;
  document.getElementById('stat-valid').textContent   = questions.filter(q => ['A','B','C','D'].includes(q.correct)).length;
  document.getElementById('stat-invalid').textContent = questions.filter(q => !['A','B','C','D'].includes(q.correct)).length;

  const tbody = document.querySelector('#preview-table tbody');
  tbody.innerHTML = '';
  questions.slice(0, 50).forEach(q => {
    const bad = !q.question || !q.options.A || !q.options.B || !q.options.C || !q.options.D || !['A','B','C','D'].includes(q.correct);
    const tr  = document.createElement('tr');
    if (bad) tr.classList.add('row-error');
    tr.innerHTML = `
      <td>${q.no}</td>
      <td class="question-text" title="${esc(q.question)}">${esc(q.question.substring(0, 80))}${q.question.length > 80 ? '…' : ''}</td>
      <td>${esc(q.options.A)}</td>
      <td>${esc(q.options.B)}</td>
      <td>${esc(q.options.C)}</td>
      <td>${esc(q.options.D)}</td>
      <td><span class="correct-badge">${esc(q.correct)}</span></td>
      <td>${q.explanation ? '✅' : '—'}</td>`;
    tbody.appendChild(tr);
  });
  if (questions.length > 50) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="8" style="text-align:center;color:var(--text-muted);padding:12px;font-style:italic;">… and ${questions.length - 50} more rows</td>`;
    tbody.appendChild(tr);
  }
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Save Exam ─────────────────────────────────────────────────
document.getElementById('btn-save-exam').addEventListener('click', saveExam);

async function saveExam() {
  if (parsedQuestions.length === 0) { showToast('Please upload a CSV first!', 'error'); return; }

  const name        = document.getElementById('exam-name').value.trim();
  const duration    = parseInt(document.getElementById('exam-duration').value);
  const description = document.getElementById('exam-description').value.trim();
  const shuffleQ    = document.getElementById('shuffle-questions').checked;
  const shuffleO    = document.getElementById('shuffle-options').checked;

  if (!name)             { showToast('Please enter an exam name!', 'error'); return; }
  if (!duration || duration < 1) { showToast('Please enter a valid duration!', 'error'); return; }

  let questions = parsedQuestions.slice();
  if (shuffleQ) questions = shuffleArray(questions);

  const exam = {
    id:             'exam_' + Date.now(),
    name, description, duration,
    shuffleOptions: shuffleO,
    createdAt:      new Date().toISOString(),
    totalQuestions: questions.length,
    questions
  };

  const btn = document.getElementById('btn-save-exam');
  btn.disabled    = true;
  btn.textContent = '⏳ Saving…';

  // Always save to localStorage first (instant backup)
  const localExams = getLocalExams();
  localExams.push(exam);
  saveLocalExams(localExams);

  // Then try Firebase
  if (firebaseReady) {
    try {
      await firebaseSetWithTimeout(dbRef.child(exam.id), exam, 8000);
      showToast(`✅ Exam "${name}" saved! Visible to everyone now.`, 'success');
    } catch (err) {
      console.error('Firebase save failed:', err);
      // Exam is already in localStorage — show specific help
      if (err.message.includes('PERMISSION_DENIED') || err.message.includes('timed out')) {
        showRulesError();
      } else {
        showToast(`⚠️ Saved locally only. Firebase error: ${err.message}`, 'warning');
      }
      btn.disabled    = false;
      btn.textContent = '💾 Save & Publish Exam';
      return;
    }
  } else {
    showToast(`Exam saved locally (Firebase not connected).`, 'info');
  }

  btn.disabled    = false;
  btn.textContent = '💾 Save & Publish Exam';

  // Reset form after success
  setTimeout(() => {
    document.querySelector('[data-tab="manage-panel"]').click();
    fileInput.value = '';
    parsedQuestions = [];
    document.getElementById('preview-section').classList.remove('visible');
    document.getElementById('save-action-bar').style.display = 'none';
    document.getElementById('exam-name').value      = '';
    document.getElementById('exam-duration').value  = '60';
    document.getElementById('exam-description').value = '';
    clearAlert();
  }, 800);
}

function showRulesError() {
  const el = document.getElementById('parse-alert');
  el.className    = 'alert alert-error';
  el.style.display = 'flex';
  el.innerHTML = `
    <span class="alert-icon">🔒</span>
    <div>
      <strong>Firebase blocked the save (Permission Denied).</strong><br>
      Your Database Rules are set to deny writes. Fix it in 30 seconds:<br><br>
      1. Go to <a href="https://console.firebase.google.com/project/nptel-quiz-53488/database/nptel-quiz-53488-default-rtdb/rules" target="_blank" style="color:#1d4ed8;font-weight:700;">Firebase Console → Rules ↗</a><br>
      2. Replace the rules with:<br>
      <code style="background:#1e293b;color:#94d35e;padding:6px 10px;border-radius:4px;display:inline-block;margin-top:6px;">{ "rules": { ".read": true, ".write": true } }</code><br>
      3. Click <strong>Publish</strong>, then try saving again.
    </div>`;
}

// ── Manage Saved Exams ────────────────────────────────────────
async function renderSavedExams() {
  const container = document.getElementById('saved-exams-list');
  container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">Loading… ⏳</div>`;

  let exams = [];

  if (firebaseReady) {
    try {
      const snapshot = await firebaseGetWithTimeout(dbRef, 8000);
      const data     = snapshot.val() || {};
      exams = Object.values(data).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (err) {
      console.warn('Firebase load failed, falling back to localStorage:', err);
      exams = getLocalExams().slice().reverse();
      showToast('Using locally saved exams (Firebase unavailable).', 'warning');
    }
  } else {
    exams = getLocalExams().slice().reverse();
  }

  if (exams.length === 0) {
    container.innerHTML = `<div class="no-exams"><div class="icon">📭</div><p>No exams saved yet. Upload a CSV to create your first exam.</p></div>`;
    return;
  }

  container.innerHTML = `<div class="exams-grid">${exams.map(examCardHTML).join('')}</div>`;

  container.querySelectorAll('.btn-delete-exam').forEach(btn =>
    btn.addEventListener('click', () => deleteExam(btn.dataset.id))
  );
  container.querySelectorAll('.btn-start-exam').forEach(btn =>
    btn.addEventListener('click', () => window.open(`exam.html?id=${btn.dataset.id}`, '_blank'))
  );
}

function examCardHTML(exam) {
  const date    = new Date(exam.createdAt);
  const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return `
    <div class="exam-card fade-in">
      <div class="exam-card-header">
        <div class="exam-card-icon">📝</div>
        <div class="exam-card-actions">
          <button class="icon-btn delete btn-delete-exam" data-id="${exam.id}" title="Delete">🗑️</button>
        </div>
      </div>
      <div class="exam-card-title">${esc(exam.name)}</div>
      <div class="exam-card-desc">${esc(exam.description || 'No description')}</div>
      <div class="exam-card-meta">
        <span>📚 ${exam.totalQuestions} Questions</span>
        <span>⏱ ${exam.duration} min</span>
        <span>📅 ${dateStr}</span>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary btn-start-exam" data-id="${exam.id}" style="flex:1;justify-content:center;">▶ Preview Exam</button>
      </div>
    </div>`;
}

async function deleteExam(id) {
  if (!confirm('Delete this exam? This cannot be undone.')) return;
  try {
    if (firebaseReady) {
      await firebaseSetWithTimeout(dbRef.child(id), null, 5000);
    }
    let exams = getLocalExams().filter(e => e.id !== id);
    saveLocalExams(exams);
    showToast('Exam deleted.', 'info');
    renderSavedExams();
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  }
}

// ── Download Sample CSV ───────────────────────────────────────
document.getElementById('btn-download-sample').addEventListener('click', () => {
  const csv = `question_no,question,option_a,option_b,option_c,option_d,correct_answer,explanation
1,"What is the full form of NPTEL?","National Programme on Technology Enhanced Learning","National Programme on Technology Enhanced Library","National Project on Technology Enhanced Learning","Not a real acronym","A","NPTEL stands for National Programme on Technology Enhanced Learning."
2,"Which organization launched NPTEL?","AICTE","IITs and IISc","UGC","MHRD","B","NPTEL was launched by the IITs and IISc."
3,"What platform hosts NPTEL courses?","Coursera","edX","SWAYAM","Udemy","C","NPTEL courses are hosted on the SWAYAM platform."
4,"How are NPTEL certifications earned?","By attending classes","By passing weekly assignments only","By passing a proctored exam","By submitting a project","C","NPTEL certification requires passing a proctored final exam."
5,"What is the minimum passing score in NPTEL exams?","25%","40%","50%","60%","B","The minimum passing score is 40%."`;

  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'sample_questions.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('Sample CSV downloaded!', 'success');
});

// ── Shuffle ───────────────────────────────────────────────────
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  firebaseReady = initFirebase();

  const badge = document.getElementById('storage-mode-badge');
  if (firebaseReady) {
    hideConfigBanner();
    if (badge) { badge.textContent = '☁️ Firebase Connected'; badge.style.background = '#dcfce7'; badge.style.color = '#166534'; }
  } else {
    showConfigBanner();
    if (badge) { badge.textContent = '💾 Local Storage Only'; }
  }

  if (window.location.hash === '#manage') {
    document.querySelector('[data-tab="manage-panel"]').click();
  }
});
