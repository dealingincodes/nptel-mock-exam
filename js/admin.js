/* ============================================================
   Admin Panel JavaScript
   ============================================================ */

const DB_KEY = 'nptel_exams';

// ── Utility: LocalStorage ────────────────────────────────────
function getExams() {
  try { return JSON.parse(localStorage.getItem(DB_KEY)) || []; }
  catch { return []; }
}

function saveExams(exams) {
  localStorage.setItem(DB_KEY, JSON.stringify(exams));
}

// ── Utility: Toast ───────────────────────────────────────────
function showToast(message, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; toast.style.transition = 'all 0.3s'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// ── State ────────────────────────────────────────────────────
let parsedQuestions = [];

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
  if (!file.name.endsWith('.csv')) {
    showToast('Please upload a valid CSV file!', 'error');
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
      processCSVData(results.data, results.meta.fields);
    },
    error: (err) => {
      showToast('Error reading file: ' + err.message, 'error');
    }
  });
}

// ── CSV Processing ────────────────────────────────────────────
const REQUIRED_COLUMNS = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer'];
const OPTIONAL_COLUMNS = ['question_no', 'explanation'];

function processCSVData(data, fields) {
  // Normalize headers to lowercase
  const normalized = data.map(row => {
    const obj = {};
    Object.keys(row).forEach(k => { obj[k.toLowerCase().trim().replace(/\s+/g, '_')] = (row[k] || '').trim(); });
    return obj;
  });

  // Validate required columns
  const missing = REQUIRED_COLUMNS.filter(col => !fields.map(f => f.toLowerCase().trim().replace(/\s+/g, '_')).includes(col));
  if (missing.length > 0) {
    showAlertError(`Missing required columns: <strong>${missing.join(', ')}</strong>`);
    return;
  }

  clearAlert();

  // Parse questions
  parsedQuestions = normalized.map((row, idx) => ({
    no: parseInt(row.question_no) || (idx + 1),
    question: row.question,
    options: {
      A: row.option_a,
      B: row.option_b,
      C: row.option_c,
      D: row.option_d
    },
    correct: (row.correct_answer || '').toUpperCase().trim(),
    explanation: row.explanation || ''
  }));

  // Validate
  const invalid = parsedQuestions.filter(q =>
    !q.question || !q.options.A || !q.options.B || !q.options.C || !q.options.D ||
    !['A','B','C','D'].includes(q.correct)
  );

  if (invalid.length > 0) {
    showAlertWarning(`${invalid.length} row(s) have issues (missing fields or invalid correct_answer). They are highlighted below.`);
  }

  renderPreview(parsedQuestions);
  showToast(`✅ ${parsedQuestions.length} questions loaded successfully!`, 'success');
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
  const el = document.getElementById('parse-alert');
  el.style.display = 'none';
}

// ── Render Preview ────────────────────────────────────────────
function renderPreview(questions) {
  const section = document.getElementById('preview-section');
  section.classList.add('visible');

  document.getElementById('stat-total').textContent  = questions.length;
  document.getElementById('stat-valid').textContent  = questions.filter(q => ['A','B','C','D'].includes(q.correct)).length;
  document.getElementById('stat-invalid').textContent = questions.filter(q => !['A','B','C','D'].includes(q.correct)).length;

  const tbody = document.querySelector('#preview-table tbody');
  tbody.innerHTML = '';

  const display = questions.slice(0, 50); // show first 50

  display.forEach((q, i) => {
    const isInvalid = !q.question || !q.options.A || !q.options.B || !q.options.C || !q.options.D || !['A','B','C','D'].includes(q.correct);
    const tr = document.createElement('tr');
    if (isInvalid) tr.classList.add('row-error');
    tr.innerHTML = `
      <td>${q.no}</td>
      <td class="question-text" title="${escHtml(q.question)}">${escHtml(q.question.substring(0,80))}${q.question.length > 80 ? '…' : ''}</td>
      <td>${escHtml(q.options.A)}</td>
      <td>${escHtml(q.options.B)}</td>
      <td>${escHtml(q.options.C)}</td>
      <td>${escHtml(q.options.D)}</td>
      <td><span class="correct-badge">${escHtml(q.correct)}</span></td>
      <td>${q.explanation ? '✅' : '-'}</td>
    `;
    tbody.appendChild(tr);
  });

  if (questions.length > 50) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="8" style="text-align:center;color:var(--text-muted);padding:12px;font-style:italic;">... and ${questions.length - 50} more rows</td>`;
    tbody.appendChild(tr);
  }
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Save Exam ─────────────────────────────────────────────────
document.getElementById('btn-save-exam').addEventListener('click', saveExam);

function saveExam() {
  if (parsedQuestions.length === 0) {
    showToast('Please upload a CSV file first!', 'error');
    return;
  }

  const name = document.getElementById('exam-name').value.trim();
  const duration = parseInt(document.getElementById('exam-duration').value);
  const description = document.getElementById('exam-description').value.trim();
  const shuffleQ = document.getElementById('shuffle-questions').checked;
  const shuffleO = document.getElementById('shuffle-options').checked;

  if (!name) { showToast('Please enter an exam name!', 'error'); document.getElementById('exam-name').focus(); return; }
  if (!duration || duration < 1) { showToast('Please enter a valid duration!', 'error'); document.getElementById('exam-duration').focus(); return; }

  let questions = [...parsedQuestions];
  if (shuffleQ) questions = shuffleArray(questions);

  const exam = {
    id: 'exam_' + Date.now(),
    name,
    description,
    duration,
    shuffleOptions: shuffleO,
    createdAt: new Date().toISOString(),
    totalQuestions: questions.length,
    questions
  };

  const exams = getExams();
  exams.push(exam);
  saveExams(exams);

  showToast(`Exam "${name}" saved successfully!`, 'success');

  // Switch to manage tab
  setTimeout(() => {
    document.querySelector('[data-tab="manage-panel"]').click();
    parsedQuestions = [];
    fileInput.value = '';
    document.getElementById('preview-section').classList.remove('visible');
    document.getElementById('save-action-bar').style.display = 'none';
    document.getElementById('exam-name').value = '';
    document.getElementById('exam-duration').value = '60';
    document.getElementById('exam-description').value = '';
    document.getElementById('parse-alert').style.display = 'none';
  }, 900);
}

// ── Manage Saved Exams ────────────────────────────────────────
function renderSavedExams() {
  const exams = getExams();
  const container = document.getElementById('saved-exams-list');

  if (exams.length === 0) {
    container.innerHTML = `
      <div class="no-exams">
        <div class="icon">📭</div>
        <p>No exams saved yet. Upload a CSV and save an exam to see it here.</p>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="exams-grid">${exams.map(exam => examCardHTML(exam)).join('')}</div>`;

  container.querySelectorAll('.btn-delete-exam').forEach(btn => {
    btn.addEventListener('click', () => deleteExam(btn.dataset.id));
  });

  container.querySelectorAll('.btn-preview-exam').forEach(btn => {
    btn.addEventListener('click', () => window.open(`exam.html?id=${btn.dataset.id}`, '_blank'));
  });
}

function examCardHTML(exam) {
  const date = new Date(exam.createdAt);
  const dateStr = date.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  return `
    <div class="exam-card fade-in">
      <div class="exam-card-header">
        <div class="exam-card-icon">📝</div>
        <div class="exam-card-actions">
          <button class="icon-btn delete btn-delete-exam" data-id="${exam.id}" title="Delete Exam">🗑️</button>
        </div>
      </div>
      <div class="exam-card-title">${escHtml(exam.name)}</div>
      <div class="exam-card-desc">${escHtml(exam.description || 'No description')}</div>
      <div class="exam-card-meta">
        <span>📚 ${exam.totalQuestions} Questions</span>
        <span>⏱ ${exam.duration} min</span>
        <span>📅 ${dateStr}</span>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary btn-preview-exam" data-id="${exam.id}" style="flex:1;justify-content:center;">▶ Start Exam</button>
      </div>
    </div>`;
}

function deleteExam(id) {
  if (!confirm('Are you sure you want to delete this exam? This cannot be undone.')) return;
  let exams = getExams();
  exams = exams.filter(e => e.id !== id);
  saveExams(exams);
  showToast('Exam deleted.', 'info');
  renderSavedExams();
}

// ── Shuffle Utility ───────────────────────────────────────────
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Download Sample CSV ───────────────────────────────────────
document.getElementById('btn-download-sample').addEventListener('click', () => {
  const csv = `question_no,question,option_a,option_b,option_c,option_d,correct_answer,explanation
1,"What is the full form of NPTEL?","National Programme on Technology Enhanced Learning","National Programme on Technology Enhanced Library","National Project on Technology Enhanced Learning","Not a real acronym","A","NPTEL stands for National Programme on Technology Enhanced Learning."
2,"Which organization launched NPTEL?","AICTE","IITs and IISc","UGC","MHRD","B","NPTEL was launched by the IITs and IISc with support from MHRD."
3,"What type of courses does NPTEL primarily offer?","School-level courses","Engineering and science courses","Management courses","Medical courses","B","NPTEL primarily offers engineering and science courses."
4,"NPTEL courses are conducted over which platform?","SWAYAM","Coursera","edX","Udemy","A","NPTEL courses are hosted on the SWAYAM platform."
5,"How are NPTEL certifications earned?","By attending classes","By passing weekly assignments only","By passing a proctored exam","By submitting a project","C","NPTEL certification requires passing a proctored final exam at authorized centers."
6,"What is the typical duration of an NPTEL course?","2 weeks","4 weeks","8-12 weeks","1 year","C","Most NPTEL courses run for 8-12 weeks."
7,"Which language are most NPTEL courses taught in?","Hindi","Tamil","English","Bengali","C","Most NPTEL courses are taught in English."
8,"What is the credit system in NPTEL?","Credit points earned per week","Credits assigned based on course level","No credit system","Credits exchangeable for degrees","B","Credits are assigned based on the level and duration of the course."
9,"What are NPTEL FDP programs?","Faculty Development Programs","Free Digital Programs","Further Degree Programs","Final Degree Programs","A","FDP stands for Faculty Development Programs offered to faculty members."
10,"How can students access NPTEL video lectures?","Only through TV","Only in colleges","Through nptel.ac.in website","Through mobile apps only","C","NPTEL video lectures are freely accessible at nptel.ac.in."`;

  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'sample_questions.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('Sample CSV downloaded!', 'success');
});

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Check if coming back from manage tab
  const hash = window.location.hash;
  if (hash === '#manage') {
    document.querySelector('[data-tab="manage-panel"]').click();
  }
});
