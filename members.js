const API_BASE = '/api';

const form = document.getElementById('member-login-form');
const message = document.getElementById('loginMessage');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const flat = document.getElementById('flatInput').value.trim();
  const password = document.getElementById('passwordInput').value.trim();

  try {
    const res = await fetch(`${API_BASE}/auth/member-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flat, password })
    });

    if (!res.ok) {
      message.textContent = 'Invalid flat number or password. Please try again.';
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
