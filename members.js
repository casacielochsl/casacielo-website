const API_BASE = '/api';

const form = document.getElementById('member-login-form');
const message = document.getElementById('loginMessage');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const forgotPasswordForm = document.getElementById('forgot-password-form');
const cancelForgotBtn = document.getElementById('cancelForgotBtn');
const forgotMessage = document.getElementById('forgotMessage');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const flat = document.getElementById('flatInput').value.trim();
  const wing = document.getElementById('wingInput').value;
  const password = document.getElementById('passwordInput').value.trim();

  try {
    const res = await fetch(`${API_BASE}/auth/member-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flat, wing, password })
    });

    if (!res.ok) {
      message.textContent = 'Invalid flat number, wing, or password. Please try again.';
      message.style.color = '#ff8d8d';
      return;
    }

    const data = await res.json();
    window.location.href = `members-details.html?flat=${encodeURIComponent(data.flat)}`;
  } catch (error) {
    message.textContent = 'Something went wrong. Please try again.';
    message.style.color = '#ff8d8d';
  }
});

forgotPasswordLink?.addEventListener('click', () => {
  form.hidden = true;
  forgotPasswordLink.hidden = true;
  forgotPasswordForm.hidden = false;
  forgotMessage.hidden = true;
});

cancelForgotBtn?.addEventListener('click', () => {
  forgotPasswordForm.hidden = true;
  forgotMessage.hidden = true;
  form.hidden = false;
  forgotPasswordLink.hidden = false;
});

forgotPasswordForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const flat = document.getElementById('forgotFlat').value.trim();
  const wing = document.getElementById('forgotWing').value;
  try {
    await fetch(`${API_BASE}/auth/member-forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flat, wing })
    });
  } catch (error) {
    // fall through to the generic message below regardless of network errors
  }
  forgotMessage.hidden = false;
  forgotMessage.textContent = 'If that flat/wing exists, a reset link has been emailed to the recovery address on file.';
});
