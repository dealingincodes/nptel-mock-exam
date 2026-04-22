/* ============================================================
   Exam Engine — Firebase + localStorage fallback
   ============================================================ */

let dbRef = null;

function initFirebase() {
  if (!FIREBASE_ENABLED) return false;
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    dbRef = firebase.database().ref(DB_PATH);
    return true;
  } catch(e) { console.error('Firebase init failed:', e); return false; }
}

// LocalStorage fallback
const LS_KEY = 'nptel_exams';
function getLocalExams() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; }
}

const SESSION_KEY = 'nptel_session';

// ── Toast ─────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; toast.style.transition = 'all 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ── State ─────────────────────────────────────────────────────
let exam         = null;
let questions    = [];
let currentIndex = 0;
let answers      = {};
let markedReview = new Set();
let visited      = new Set();
let timerInterval = null;
let timeRemaining = 0;
let examSubmitted = false;
let firebaseReady = false;

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  firebaseReady = initFirebase();

  const params = new URLSearchParams(window.location.search);
  const examId = params.get('id');

  if (!examId) { alert('No exam ID specified.'); window.location.href = 'index.html'; return; }

  try {
    exam = await loadExam(examId);
  } catch(e) {
    alert('Failed to load exam: ' + e.message);
    window.location.href = 'index.html';
    return;
  }

  if (!exam) { alert('Exam not found. It may have been deleted.'); window.location.href = 'index.html'; return; }

  // Check for saved session
  const savedSession = loadSession(examId);
  if (savedSession && !savedSession.submitted) {
    if (confirm('Resume your previous session?')) {
      restoreSession(savedSession);
    } else {
      clearSession(examId);
      initExam();
    }
  } else {
    initExam();
  }
});

// ── Load Exam ─────────────────────────────────────────────────
async function loadExam(examId) {
  if (firebaseReady) {
    const snapshot = await dbRef.child(examId).once('value');
    return snapshot.val();
  } else {
    const exams = getLocalExams();
    return exams.find(e => e.id === examId) || null;
  }
}

function initExam() {
  questions     = exam.questions;
  timeRemaining = exam.duration * 60;
  answers       = {};
  markedReview  = new Set();
  visited       = new Set([0]);
  currentIndex  = 0;

  if (exam.shuffleOptions) {
    questions = questions.map(q => {
      const opts    = ['A','B','C','D'];
      const shuffled = shuffleArray(opts);
      const newOpts  = {};
      shuffled.forEach((orig, i) => { newOpts[opts[i]] = q.options[orig]; });
      const correctIdx = shuffled.indexOf(q.correct);
      return { ...q, options: newOpts, correct: opts[correctIdx] };
    });
  }

  renderExamHeader();
  buildPalette();
  renderQuestion();
  startTimer();
  hideLoading();
  saveSession();
}

function restoreSession(session) {
  questions     = session.questions;
  timeRemaining = session.timeRemaining;
  answers       = session.answers || {};
  markedReview  = new Set(session.markedReview || []);
  visited       = new Set(session.visited || [0]);
  currentIndex  = session.currentIndex || 0;
  renderExamHeader();
  buildPalette();
  renderQuestion();
  startTimer();
  hideLoading();
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) { overlay.classList.add('hidden'); setTimeout(() => overlay.remove(), 400); }
}

// ── Timer ─────────────────────────────────────────────────────
function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();
    saveSession();
    if (timeRemaining <= 0) { clearInterval(timerInterval); autoSubmit(); }
  }, 1000);
}

function updateTimerDisplay() {
  const el = document.getElementById('timer-value');
  if (!el) return;
  const h = Math.floor(timeRemaining / 3600);
  const m = Math.floor((timeRemaining % 3600) / 60);
  const s = timeRemaining % 60;
  el.textContent = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  el.className = 'timer-value';
  if (timeRemaining < 300) el.classList.add('danger');
  else if (timeRemaining < 600) el.classList.add('warning');
}

function pad(n) { return String(n).padStart(2, '0'); }

// ── Header ────────────────────────────────────────────────────
function renderExamHeader() {
  document.getElementById('exam-title-text').textContent = exam.name;
}

// ── Render Question ───────────────────────────────────────────
function renderQuestion() {
  const q = questions[currentIndex];
  if (!q) return;

  visited.add(currentIndex);
  document.getElementById('question-number').textContent = `Question ${currentIndex + 1} of ${questions.length}`;
  document.getElementById('question-text').innerHTML = formatText(q.question);

  const optionsContainer = document.getElementById('options-list');
  optionsContainer.innerHTML = '';

  ['A','B','C','D'].forEach(letter => {
    const isSelected = answers[currentIndex] === letter;
    const item = document.createElement('label');
    item.className = `option-item${isSelected ? ' selected' : ''}`;
    item.dataset.letter = letter;
    item.innerHTML = `
      <input type="radio" name="option" value="${letter}" ${isSelected ? 'checked' : ''}>
      <span class="option-letter" style="${isSelected ? 'background:var(--primary);color:white;border-color:var(--primary)' : ''}">${letter}</span>
      <span class="option-text">${formatText(q.options[letter])}</span>`;
    item.addEventListener('click', () => selectOption(letter));
    optionsContainer.appendChild(item);
  });

  const btnMark = document.getElementById('btn-mark-review');
  btnMark.textContent = markedReview.has(currentIndex) ? '🔖 Unmark Review' : '🔖 Mark for Review';
  document.getElementById('btn-prev').disabled = currentIndex === 0;
  document.getElementById('btn-next').textContent = currentIndex === questions.length - 1 ? '✅ Save & End' : '💾 Save & Next ▶';

  updatePaletteFocus();
  updateSidebar();
}

function formatText(text) {
  return String(text || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

// ── Select Option ─────────────────────────────────────────────
function selectOption(letter) {
  if (examSubmitted) return;
  answers[currentIndex] = letter;

  document.querySelectorAll('.option-item').forEach(item => {
    const sel = item.dataset.letter === letter;
    item.classList.toggle('selected', sel);
    const letterEl = item.querySelector('.option-letter');
    letterEl.style.background   = sel ? 'var(--primary)' : '';
    letterEl.style.color        = sel ? 'white' : '';
    letterEl.style.borderColor  = sel ? 'var(--primary)' : '';
  });

  updatePaletteBtn(currentIndex);
  updateSidebar();
  saveSession();
}

// ── Navigation ────────────────────────────────────────────────
document.getElementById('btn-prev').addEventListener('click', () => {
  if (currentIndex > 0) { currentIndex--; visited.add(currentIndex); renderQuestion(); }
});

document.getElementById('btn-next').addEventListener('click', () => {
  if (currentIndex < questions.length - 1) {
    currentIndex++; visited.add(currentIndex); renderQuestion();
  } else {
    openSubmitModal();
  }
});

document.getElementById('btn-mark-review').addEventListener('click', () => {
  if (markedReview.has(currentIndex)) { markedReview.delete(currentIndex); showToast('Removed from review', 'info'); }
  else { markedReview.add(currentIndex); showToast('Marked for review', 'info'); }
  updatePaletteBtn(currentIndex);
  renderQuestion();
  updateSidebar();
  saveSession();
});

document.getElementById('btn-clear').addEventListener('click', () => {
  delete answers[currentIndex];
  document.querySelectorAll('.option-item').forEach(item => {
    item.classList.remove('selected');
    const el = item.querySelector('.option-letter');
    el.style.background = el.style.color = el.style.borderColor = '';
  });
  updatePaletteBtn(currentIndex);
  updateSidebar();
  saveSession();
  showToast('Response cleared', 'info');
});

// ── Palette ───────────────────────────────────────────────────
function buildPalette() {
  const grid = document.getElementById('palette-grid');
  grid.innerHTML = '';
  questions.forEach((_, i) => {
    const btn = document.createElement('button');
    btn.className = 'palette-btn';
    btn.textContent = i + 1;
    btn.dataset.index = i;
    btn.dataset.status = 'not-visited';
    btn.addEventListener('click', () => { currentIndex = i; visited.add(i); renderQuestion(); });
    grid.appendChild(btn);
  });
  updateAllPaletteBtns();
}

function getQuestionStatus(i) {
  const answered = answers[i] !== undefined;
  const marked   = markedReview.has(i);
  const vis      = visited.has(i);
  if (answered && marked) return 'answered-marked';
  if (marked)             return 'marked';
  if (answered)           return 'answered';
  if (vis)                return 'not-answered';
  return 'not-visited';
}

function updatePaletteBtn(i) {
  const btn = document.querySelector(`.palette-btn[data-index="${i}"]`);
  if (btn) btn.dataset.status = getQuestionStatus(i);
}

function updateAllPaletteBtns() {
  questions.forEach((_, i) => updatePaletteBtn(i));
}

function updatePaletteFocus() {
  document.querySelectorAll('.palette-btn').forEach(btn => {
    btn.classList.toggle('active-question', parseInt(btn.dataset.index) === currentIndex);
  });
  updatePaletteBtn(currentIndex);
  const active = document.querySelector('.palette-btn.active-question');
  if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// ── Sidebar ───────────────────────────────────────────────────
function updateSidebar() {
  const answered = Object.keys(answers).length;
  document.getElementById('count-answered').textContent    = answered;
  document.getElementById('count-not-answered').textContent = questions.length - answered;
  document.getElementById('count-marked').textContent      = markedReview.size;
  document.getElementById('count-total').textContent       = questions.length;
}

// ── Submit ────────────────────────────────────────────────────
document.getElementById('btn-submit-exam').addEventListener('click', openSubmitModal);

function openSubmitModal() {
  const answered    = Object.keys(answers).length;
  const notAnswered = questions.length - answered;
  document.getElementById('modal-answered').textContent    = answered;
  document.getElementById('modal-not-answered').textContent = notAnswered;
  document.getElementById('modal-marked').textContent      = markedReview.size;
  const warning = document.getElementById('submit-warning');
  warning.style.display = notAnswered > 0 ? 'block' : 'none';
  warning.textContent = `⚠️ You have ${notAnswered} unanswered question(s). They will be marked as unattempted.`;
  document.getElementById('submit-modal-overlay').classList.add('active');
}

document.getElementById('btn-cancel-submit').addEventListener('click', () => {
  document.getElementById('submit-modal-overlay').classList.remove('active');
});

document.getElementById('btn-confirm-submit').addEventListener('click', submitExam);

function autoSubmit() {
  showToast('Time is up! Submitting exam…', 'warning');
  setTimeout(submitExam, 2000);
}

function submitExam() {
  if (examSubmitted) return;
  examSubmitted = true;
  clearInterval(timerInterval);
  document.getElementById('submit-modal-overlay').classList.remove('active');

  let correct = 0, wrong = 0, skipped = 0;
  const reviewData = questions.map((q, i) => {
    const ua = answers[i];
    let status;
    if (!ua)             { skipped++; status = 'skipped'; }
    else if (ua === q.correct) { correct++; status = 'correct'; }
    else                 { wrong++;   status = 'wrong'; }
    return { ...q, userAnswer: ua || null, status, qIndex: i + 1 };
  });

  const resultPackage = {
    examId: exam.id, examName: exam.name,
    score: correct, total: questions.length,
    correct, wrong, skipped,
    timeTaken: (exam.duration * 60) - timeRemaining,
    reviewData,
    submittedAt: new Date().toISOString()
  };

  sessionStorage.setItem('nptel_result', JSON.stringify(resultPackage));
  clearSession(exam.id);
  window.location.href = 'results.html';
}

// ── Session ───────────────────────────────────────────────────
function saveSession() {
  const session = {
    examId: exam.id, questions, timeRemaining, answers,
    markedReview: [...markedReview], visited: [...visited],
    currentIndex, submitted: false, savedAt: Date.now()
  };
  sessionStorage.setItem(`${SESSION_KEY}_${exam.id}`, JSON.stringify(session));
}

function loadSession(examId) {
  try {
    const s = sessionStorage.getItem(`${SESSION_KEY}_${examId}`);
    if (!s) return null;
    const session = JSON.parse(s);
    session.markedReview = new Set(session.markedReview || []);
    session.visited      = new Set(session.visited || []);
    session.answers      = session.answers || {};
    return session;
  } catch { return null; }
}

function clearSession(examId) {
  sessionStorage.removeItem(`${SESSION_KEY}_${examId}`);
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
