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

// ── LocalStorage fallback ─────────────────────────────────────
const LS_KEY = 'nptel_exams';

function getLocalExams() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
}

function saveLocalExams(exams) {
  localStorage.setItem(LS_KEY, JSON.stringify(exams));
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
  }, 3500);
}

// ── State ─────────────────────────────────────────────────────
let parsedQuestions = [];
let firebaseReady = false;

// ── Firebase config banner ────────────────────────────────────
function showConfigBanner() {
  const banner = document.getElementById('firebase-banner');
  if (banner) banner.style.display = 'flex';
}

function hideConfigBanner() {
  const banner = document.getElementById('firebase-banner');
  if (banner) banner.style.display = 'none';
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
  const normalizedFields = fields.map(f => f.toLowerCase().trim().replace(/\s+/g, '_'));
  const missing = REQUIRED_COLUMNS.filter(col => !normalizedFields.includes(col));

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
    no: parseInt(row.question_no) || (idx + 1),
    question: row.question,
    options: { A: row.option_a, B: row.option_b, C: row.option_c, D: row.option_d },
    correct: (row.correct_answer || '').toUpperCase().trim(),
    explanation: row.explanation || ''
  }));

  const invalidCount = parsedQuestions.filter(q =>
    !q.question || !q.options.A || !q.options.B || !q.options.C || !q.options.D ||
    !['A','B','C','D'].includes(q.correct)
  ).length;

  if (invalidCount > 0) {
    showAlertWarning(`${invalidCount} row(s) have issues (missing fields or invalid correct_answer). Highlighted below.`);
  }

  renderPreview(parsedQuestions);
  showToast(`${parsedQuestions.length} questions loaded!`, 'success');
  document.getElementById('save-action-bar').style.display = 'flex';
}

// ── Alert helpers ─────────────────────────────────────────────
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

// ── Render Preview Table ──────────────────────────────────────
function renderPreview(questions) {
  document.getElementById('preview-section').classList.add('visible');
  document.getElementById('stat-total').textContent   = questions.length;
  document.getElementById('stat-valid').textContent   = questions.filter(q => ['A','B','C','D'].includes(q.correct)).length;
  document.getElementById('stat-invalid').textContent = questions.filter(q => !['A','B','C','D'].includes(q.correct)).length;

  const tbody = document.querySelector('#preview-table tbody');
  tbody.innerHTML = '';

  questions.slice(0, 50).forEach(q => {
    const isInvalid = !q.question || !q.options.A || !q.options.B || !q.options.C || !q.options.D || !['A','B','C','D'].includes(q.correct);
    const tr = document.createElement('tr');
    if (isInvalid) tr.classList.add('row-error');
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

  if (!name)             { showToast('Please enter an exam name!', 'error'); document.getElementById('exam-name').focus(); return; }
  if (!duration || duration < 1) { showToast('Please enter a valid duration!', 'error'); return; }

  let questions = parsedQuestions.slice();
  if (shuffleQ) questions = shuffleArray(questions);

  const exam = {
    id: 'exam_' + Date.now(),
    name, description, duration,
    shuffleOptions: shuffleO,
    createdAt: new Date().toISOString(),
    totalQuestions: questions.length,
    questions
  };

  const btn = document.getElementById('btn-save-exam');
  btn.disabled = true;
  btn.textContent = '⏳ Saving…';

  try {
    if (firebaseReady) {
      // Save to Firebase
      await dbRef.child(exam.id).set(exam);
      showToast(`Exam "${name}" saved to Firebase! Everyone can see it now. 🎉`, 'success');
    } else {
      // Fallback to localStorage
      const exams = getLocalExams();
      exams.push(exam);
      saveLocalExams(exams);
      showToast(`Exam saved locally (Firebase not configured).`, 'info');
    }

    setTimeout(() => {
      document.querySelector('[data-tab="manage-panel"]').click();
      fileInput.value = '';
      parsedQuestions = [];
      document.getElementById('preview-section').classList.remove('visible');
      document.getElementById('save-action-bar').style.display = 'none';
      document.getElementById('exam-name').value = '';
      document.getElementById('exam-duration').value = '60';
      document.getElementById('exam-description').value = '';
      clearAlert();
    }, 1000);
  } catch (err) {
    console.error(err);
    showToast('Save failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Save & Publish Exam';
  }
}

// ── Manage Saved Exams ────────────────────────────────────────
async function renderSavedExams() {
  const container = document.getElementById('saved-exams-list');
  container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">Loading exams… ⏳</div>`;

  try {
    let exams = [];

    if (firebaseReady) {
      const snapshot = await dbRef.once('value');
      const data = snapshot.val() || {};
      exams = Object.values(data).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      exams = getLocalExams().slice().reverse();
    }

    if (exams.length === 0) {
      container.innerHTML = `
        <div class="no-exams">
          <div class="icon">📭</div>
          <p>No exams saved yet. Upload a CSV to create your first exam.</p>
        </div>`;
      return;
    }

    container.innerHTML = `<div class="exams-grid">${exams.map(examCardHTML).join('')}</div>`;

    container.querySelectorAll('.btn-delete-exam').forEach(btn =>
      btn.addEventListener('click', () => deleteExam(btn.dataset.id))
    );
    container.querySelectorAll('.btn-start-exam').forEach(btn =>
      btn.addEventListener('click', () => window.open(`exam.html?id=${btn.dataset.id}`, '_blank'))
    );
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error"><span class="alert-icon">❌</span><div>Failed to load exams: ${err.message}</div></div>`;
  }
}

function examCardHTML(exam) {
  const date = new Date(exam.createdAt);
  const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const source  = firebaseReady ? '☁️ Firebase' : '💾 Local';
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
        <span>${source}</span>
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
      await dbRef.child(id).remove();
    } else {
      let exams = getLocalExams().filter(e => e.id !== id);
      saveLocalExams(exams);
    }
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
2,"Which organization launched NPTEL?","AICTE","IITs and IISc","UGC","MHRD","B","NPTEL was launched by the IITs and IISc with support from MHRD."
3,"What type of courses does NPTEL primarily offer?","School-level courses","Engineering and science courses","Management courses","Medical courses","B","NPTEL primarily offers engineering and science courses."
4,"NPTEL courses are conducted over which platform?","SWAYAM","Coursera","edX","Udemy","A","NPTEL courses are hosted on the SWAYAM platform."
5,"How are NPTEL certifications earned?","By attending classes","By passing weekly assignments only","By passing a proctored exam","By submitting a project","C","NPTEL certification requires passing a proctored final exam."
6,"What is the typical duration of an NPTEL course?","2 weeks","4 weeks","8-12 weeks","1 year","C","Most NPTEL courses run for 8-12 weeks."
7,"Which language are most NPTEL courses taught in?","Hindi","Tamil","English","Bengali","C","Most NPTEL courses are taught in English."
8,"What are NPTEL FDP programs?","Faculty Development Programs","Free Digital Programs","Further Degree Programs","Final Degree Programs","A","FDP stands for Faculty Development Programs."
9,"How can students access NPTEL video lectures?","Only through TV","Only in colleges","Through nptel.ac.in website","Through mobile apps only","C","NPTEL video lectures are freely accessible at nptel.ac.in."
10,"What is the minimum passing score in NPTEL exams?","25%","40%","50%","60%","B","The minimum passing score in NPTEL certification exams is 40%."`;

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

  if (firebaseReady) {
    hideConfigBanner();
    const modeEl = document.getElementById('storage-mode-badge');
    if (modeEl) { modeEl.textContent = '☁️ Firebase Connected'; modeEl.style.background = '#dcfce7'; modeEl.style.color = '#166534'; }
  } else {
    showConfigBanner();
  }

  if (window.location.hash === '#manage') {
    document.querySelector('[data-tab="manage-panel"]').click();
  }
});
