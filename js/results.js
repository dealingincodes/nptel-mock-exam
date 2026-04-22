/* ============================================================
   Results Page JavaScript
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const raw = sessionStorage.getItem('nptel_result');
  if (!raw) {
    document.getElementById('no-result').style.display = 'flex';
    document.getElementById('result-content').style.display = 'none';
    return;
  }

  const result = JSON.parse(raw);
  renderResults(result);
});

function renderResults(result) {
  document.getElementById('no-result').style.display = 'none';
  document.getElementById('result-content').style.display = 'block';

  const pct = ((result.correct / result.total) * 100).toFixed(1);
  const passed = parseFloat(pct) >= 40;

  // Header
  document.getElementById('exam-name-display').textContent = result.examName;
  document.getElementById('submitted-at').textContent = formatDate(result.submittedAt);

  // Score circle
  const circle = document.getElementById('score-circle');
  circle.innerHTML = `
    <div class="score-main">${result.score}<span class="score-total">/${result.total}</span></div>
    <div class="score-pct">${pct}%</div>
    <div class="score-verdict ${passed ? 'pass' : 'fail'}">${passed ? '🏆 PASS' : '❌ FAIL'}</div>
  `;
  circle.style.borderColor = passed ? 'var(--q-answered)' : 'var(--q-not-answered)';

  // Stats
  document.getElementById('stat-correct').textContent   = result.correct;
  document.getElementById('stat-wrong').textContent     = result.wrong;
  document.getElementById('stat-skipped').textContent   = result.skipped;
  document.getElementById('stat-accuracy').textContent  = result.correct > 0
    ? ((result.correct / (result.correct + result.wrong)) * 100).toFixed(1) + '%'
    : '0%';

  // Time taken
  const timeTaken = result.timeTaken || 0;
  const tm = Math.floor(timeTaken / 60);
  const ts = timeTaken % 60;
  document.getElementById('stat-time').textContent = `${pad(tm)}:${pad(ts)}`;

  // Progress bar
  const progressBar = document.getElementById('score-progress');
  progressBar.style.width = pct + '%';
  progressBar.style.background = passed ? 'var(--q-answered)' : 'var(--q-not-answered)';

  // Render question review
  renderReview(result.reviewData);
}

function renderReview(reviewData) {
  const tbody = document.getElementById('review-tbody');
  tbody.innerHTML = '';

  reviewData.forEach(q => {
    const tr = document.createElement('tr');
    tr.className = `review-row row-${q.status}`;

    const optionsHtml = Object.entries(q.options).map(([letter, text]) => {
      let cls = '';
      if (letter === q.correct) cls = 'highlight-correct';
      else if (letter === q.userAnswer && q.status === 'wrong') cls = 'highlight-wrong';
      return `<div class="review-option ${cls}">
        <span class="opt-letter">${letter}</span>
        <span>${escHtml(text)}</span>
      </div>`;
    }).join('');

    const statusBadge = {
      correct: '<span class="r-badge badge-correct">✓ Correct</span>',
      wrong:   '<span class="r-badge badge-wrong">✗ Wrong</span>',
      skipped: '<span class="r-badge badge-skip">– Skipped</span>'
    }[q.status];

    const userAnswerHtml = q.userAnswer
      ? `<span class="user-ans">${q.userAnswer}: ${escHtml(q.options[q.userAnswer])}</span>`
      : `<span class="user-ans skipped">Not Attempted</span>`;

    tr.innerHTML = `
      <td class="q-index">${q.qIndex}</td>
      <td class="q-text">${formatText(q.question)}</td>
      <td class="q-options">${optionsHtml}</td>
      <td class="q-user-ans">${userAnswerHtml}</td>
      <td class="q-correct-ans">
        <span class="correct-opt">${q.correct}: ${escHtml(q.options[q.correct])}</span>
      </td>
      <td class="q-status">${statusBadge}</td>
      <td class="q-exp">${q.explanation ? `<span class="exp-text">${escHtml(q.explanation)}</span>` : '<span class="no-exp">—</span>'}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Filter / Search ───────────────────────────────────────────
document.getElementById('filter-all').addEventListener('click', () => filterRows('all'));
document.getElementById('filter-correct').addEventListener('click', () => filterRows('correct'));
document.getElementById('filter-wrong').addEventListener('click', () => filterRows('wrong'));
document.getElementById('filter-skipped').addEventListener('click', () => filterRows('skipped'));

document.getElementById('search-questions').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('.review-row').forEach(row => {
    const text = row.querySelector('.q-text')?.textContent.toLowerCase() || '';
    row.style.display = text.includes(q) ? '' : 'none';
  });
});

function filterRows(status) {
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`filter-${status}`).classList.add('active');

  document.querySelectorAll('.review-row').forEach(row => {
    if (status === 'all') { row.style.display = ''; return; }
    row.style.display = row.classList.contains(`row-${status}`) ? '' : 'none';
  });
}

// ── Helpers ───────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatText(text) {
  return escHtml(text).replace(/\n/g,'<br>');
}

function pad(n) { return String(n).padStart(2, '0'); }

function formatDate(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
