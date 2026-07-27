const API_BASE = '/api';

const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const isMemberReset = params.get('role') === 'member';
const resetAction = isMemberReset ? 'member-reset-password' : 'admin-reset-password';
const redirectTarget = isMemberReset ? 'members.html' : 'admin.html';

const form = document.getElementById('reset-password-form');
const message = document.getElementById('resetMessage');

const showMessage = (text, isError) => {
  message.hidden = false;
  message.textContent = text;
  message.style.color = isError ? '#ff8d8d' : '#8dffb0';
};

if (!token) {
  showMessage('This reset link is missing its token. Request a new one from the login page.', true);
  if (form) form.hidden = true;
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    showMessage('Passwords do not match.', true);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/${resetAction}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showMessage(data.error || 'This reset link is invalid or has expired.', true);
      return;
    }
    showMessage('Password updated. Redirecting to login…', false);
    setTimeout(() => {
      window.location.href = redirectTarget;
    }, 1500);
  } catch (error) {
    showMessage('Something went wrong. Please try again.', true);
  }
});
