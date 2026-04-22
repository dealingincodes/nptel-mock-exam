/* ============================================================
   Admin Password Gate
   ============================================================ */

const ADMIN_PASSWORD   = 'mock1234';
const AUTH_SESSION_KEY = 'nptel_admin_auth';

function isAuthenticated() {
  return sessionStorage.getItem(AUTH_SESSION_KEY) === 'yes';
}

function authenticate(pw) {
  return pw === ADMIN_PASSWORD;
}

function showPasswordGate() {
  // Hide main content
  document.querySelector('.admin-layout').style.display = 'none';

  const gate = document.createElement('div');
  gate.id = 'admin-gate';
  gate.innerHTML = `
    <div class="gate-bg"></div>
    <div class="gate-card">
      <div class="gate-logo">
        <div class="gate-logo-icon">N</div>
        <div>
          <div class="gate-logo-title">NPTEL Mock Exam</div>
          <div class="gate-logo-sub">Admin Panel</div>
        </div>
      </div>
      <h2 class="gate-heading">🔐 Admin Access</h2>
      <p class="gate-desc">Enter the admin password to manage exams.</p>
      <div class="gate-input-wrap">
        <span class="gate-input-icon">🔑</span>
        <input type="password" id="gate-password" class="gate-input" placeholder="Enter password" autocomplete="off">
        <button class="gate-toggle" id="gate-toggle-pw" title="Show/Hide">👁</button>
      </div>
      <div class="gate-error" id="gate-error" style="display:none;">❌ Incorrect password. Try again.</div>
      <button class="gate-btn" id="gate-submit">Unlock Admin Panel →</button>
      <a href="index.html" class="gate-back">← Back to Home</a>
    </div>`;
  document.body.appendChild(gate);

  // Focus password input
  setTimeout(() => document.getElementById('gate-password').focus(), 100);

  // Submit on button click
  document.getElementById('gate-submit').addEventListener('click', tryLogin);

  // Submit on Enter key
  document.getElementById('gate-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') tryLogin();
    document.getElementById('gate-error').style.display = 'none';
  });

  // Toggle password visibility
  document.getElementById('gate-toggle-pw').addEventListener('click', () => {
    const inp = document.getElementById('gate-password');
    inp.type  = inp.type === 'password' ? 'text' : 'password';
  });
}

function tryLogin() {
  const pw  = document.getElementById('gate-password').value;
  const err = document.getElementById('gate-error');
  const btn = document.getElementById('gate-submit');

  if (!pw) { err.textContent = '❌ Please enter a password.'; err.style.display = 'block'; return; }

  btn.textContent = 'Verifying…';
  btn.disabled    = true;

  setTimeout(() => {
    if (authenticate(pw)) {
      sessionStorage.setItem(AUTH_SESSION_KEY, 'yes');
      document.getElementById('admin-gate').style.opacity = '0';
      document.getElementById('admin-gate').style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        document.getElementById('admin-gate').remove();
        document.querySelector('.admin-layout').style.display = 'flex';
      }, 300);
    } else {
      err.textContent = '❌ Incorrect password. Try again.';
      err.style.display = 'block';
      document.getElementById('gate-password').value = '';
      document.getElementById('gate-password').focus();
      btn.textContent = 'Unlock Admin Panel →';
      btn.disabled    = false;
      // Shake animation
      document.querySelector('.gate-card').classList.add('shake');
      setTimeout(() => document.querySelector('.gate-card').classList.remove('shake'), 500);
    }
  }, 400);
}

// ── Gate Styles ───────────────────────────────────────────────
(function injectGateStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #admin-gate {
      position: fixed; inset: 0; z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
    }
    .gate-bg {
      position: absolute; inset: 0;
      background: linear-gradient(135deg, #001a40 0%, #003580 50%, #1a4fa0 100%);
    }
    .gate-bg::before {
      content: '';
      position: absolute; inset: 0;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }
    .gate-card {
      position: relative; z-index: 1;
      background: rgba(255,255,255,0.07);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 20px;
      padding: 40px 36px;
      width: 100%; max-width: 420px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.4);
      text-align: center;
      transition: transform 0.1s;
    }
    .gate-logo {
      display: flex; align-items: center; gap: 12px;
      justify-content: center; margin-bottom: 28px;
    }
    .gate-logo-icon {
      width: 46px; height: 46px; border-radius: 10px;
      background: #f57c00; color: white;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 900; font-family: 'Inter', Arial, sans-serif;
    }
    .gate-logo-title { color: white; font-size: 16px; font-weight: 700; text-align: left; }
    .gate-logo-sub   { color: rgba(255,255,255,0.6); font-size: 12px; text-align: left; }
    .gate-heading {
      font-size: 22px; font-weight: 800; color: white; margin-bottom: 8px;
    }
    .gate-desc {
      font-size: 14px; color: rgba(255,255,255,0.7); margin-bottom: 24px;
    }
    .gate-input-wrap {
      position: relative; margin-bottom: 12px;
    }
    .gate-input-icon {
      position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
      font-size: 16px; pointer-events: none;
    }
    .gate-input {
      width: 100%; padding: 13px 48px 13px 42px;
      background: rgba(255,255,255,0.1);
      border: 1.5px solid rgba(255,255,255,0.2);
      border-radius: 10px; color: white; font-size: 15px;
      font-family: 'Inter', Arial, sans-serif; outline: none;
      transition: border-color 0.2s, background 0.2s;
    }
    .gate-input::placeholder { color: rgba(255,255,255,0.4); }
    .gate-input:focus { border-color: #f57c00; background: rgba(255,255,255,0.15); }
    .gate-toggle {
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px;
      opacity: 0.7; transition: opacity 0.2s;
    }
    .gate-toggle:hover { opacity: 1; }
    .gate-error {
      background: rgba(231,76,60,0.25); border: 1px solid rgba(231,76,60,0.4);
      color: #fca5a5; border-radius: 8px; padding: 10px 14px;
      font-size: 13px; margin-bottom: 12px; text-align: left;
    }
    .gate-btn {
      width: 100%; padding: 14px;
      background: linear-gradient(135deg, #f57c00, #e65100);
      color: white; border: none; border-radius: 10px;
      font-size: 15px; font-weight: 700; cursor: pointer;
      font-family: 'Inter', Arial, sans-serif;
      transition: all 0.2s; margin-bottom: 16px;
      box-shadow: 0 4px 14px rgba(245,124,0,0.4);
    }
    .gate-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(245,124,0,0.5); }
    .gate-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
    .gate-back {
      color: rgba(255,255,255,0.5); font-size: 13px; text-decoration: none;
      display: block; transition: color 0.2s;
    }
    .gate-back:hover { color: rgba(255,255,255,0.9); }
    @keyframes shake {
      0%,100% { transform: translateX(0); }
      20%      { transform: translateX(-8px); }
      40%      { transform: translateX(8px); }
      60%      { transform: translateX(-6px); }
      80%      { transform: translateX(6px); }
    }
    .gate-card.shake { animation: shake 0.4s ease; }
  `;
  document.head.appendChild(style);
})();

// ── Run on load ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthenticated()) showPasswordGate();
});
