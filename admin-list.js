const API_BASE = '/api';

let members = [];
let adminRole = 'manager';
const tableBody = document.getElementById('memberTableBody');
const filterSearch = document.getElementById('filterSearch');
const filterType = document.getElementById('filterType');
const noticeForm = document.getElementById('notice-form');
const noticeMessageInput = document.getElementById('noticeMessage');
const noticeList = document.getElementById('noticeList');
const eventForm = document.getElementById('event-form');
const eventTitleInput = document.getElementById('eventTitle');
const eventDateInput = document.getElementById('eventDate');
const eventDescriptionInput = document.getElementById('eventDescription');
const eventImageInput = document.getElementById('eventImage');
const eventList = document.getElementById('eventList');
const bookingList = document.getElementById('bookingList');
const adminUsersNavItem = document.getElementById('adminUsersNavItem');
const adminAccountForm = document.getElementById('admin-account-form');
const adminAccountList = document.getElementById('adminAccountList');
const statMembers = document.getElementById('statMembers');
const statNotices = document.getElementById('statNotices');
const statEvents = document.getElementById('statEvents');
const statBookings = document.getElementById('statBookings');

const readFileDataUrl = (file) => new Promise((resolve) => {
  if (!file) {
    resolve(null);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => resolve({ name: file.name, type: file.type, dataUrl: reader.result });
  reader.onerror = () => resolve(null);
  reader.readAsDataURL(file);
});

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const api = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (res.status === 401) {
    window.location.href = 'admin.html';
    throw new Error('Not authenticated');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
};

// --- Sidebar navigation ---
document.querySelectorAll('.dashboard-nav-item').forEach((button) => {
  button.addEventListener('click', () => {
    const target = button.getAttribute('data-section');
    document.querySelectorAll('.dashboard-nav-item').forEach((item) => item.classList.remove('active'));
    document.querySelectorAll('.dashboard-section').forEach((section) => section.classList.remove('active'));
    button.classList.add('active');
    document.querySelector(`[data-section-panel="${target}"]`)?.classList.add('active');
  });
});

// --- Members ---
const getFilteredMembers = () => {
  const searchValue = (filterSearch?.value || '').toLowerCase().trim();
  const typeValue = (filterType?.value || '').toLowerCase();
  return members.filter((member) => {
    const record = [member.flat, member.name, member.wing, member.floor, member.memberType, member.contact, member.password].join(' ').toLowerCase();
    const matchesSearch = !searchValue || record.includes(searchValue);
    const matchesType = !typeValue || (member.memberType || 'Owner').toLowerCase() === typeValue;
    return matchesSearch && matchesType;
  });
};

const renderMembers = () => {
  if (!tableBody) return;
  const visibleMembers = getFilteredMembers();
  tableBody.innerHTML = visibleMembers.map((member) => `
    <tr>
      <td>${member.flat || '-'}</td>
      <td>${member.name || '-'}</td>
      <td>${member.wing || '-'}</td>
      <td>${member.floor || '-'}</td>
      <td>${member.memberType || 'Owner'}</td>
      <td>${member.contact || '-'}</td>
      <td>${member.password || '-'}</td>
      <td>
        <button class="action-btn" data-action="view" data-id="${member.id}">View</button>
        <button class="action-btn" data-action="edit" data-id="${member.id}">Edit</button>
        <button class="action-btn" data-action="delete" data-id="${member.id}">Delete</button>
      </td>
    </tr>
  `).join('');
};

[filterSearch, filterType].forEach((element) => {
  element?.addEventListener('input', renderMembers);
  element?.addEventListener('change', renderMembers);
});

tableBody?.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const id = Number(button.getAttribute('data-id'));
  const action = button.getAttribute('data-action');
  if (action === 'view') {
    window.location.href = `admin-member.html?id=${id}`;
  } else if (action === 'edit') {
    window.location.href = `admin-management?id=${id}&mode=edit`;
  } else if (action === 'delete') {
    try {
      await api(`/members/${id}`, { method: 'DELETE' });
      members = members.filter((entry) => entry.id !== id);
      renderMembers();
      updateStats();
    } catch (error) {
      alert(error.message || 'Failed to delete member');
    }
  }
});

// --- Notices ---
const renderNotices = (notices) => {
  if (!noticeList) return;
  if (!notices.length) {
    noticeList.innerHTML = '<div class="notice-item notice-empty">No notices yet.</div>';
    return;
  }
  noticeList.innerHTML = notices.map((notice) => `
    <div class="notice-item">
      <span class="notice-text">${escapeHtml(notice.message)}${notice.date ? `<br /><span class="form-hint">Shows until ${escapeHtml(notice.date)}</span>` : ''}</span>
      <label class="notice-toggle">
        <input type="checkbox" data-action="toggle" data-id="${notice.id}" ${notice.active ? 'checked' : ''} />
        <span>Active</span>
      </label>
      <button class="action-btn" data-action="delete" data-id="${notice.id}">Delete</button>
    </div>
  `).join('');
};

let notices = [];

const fetchNotices = async () => {
  const data = await api('/notices');
  notices = data.notices;
  renderNotices(notices);
};

noticeForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = noticeMessageInput.value.trim();
  if (!message) return;
  const noticeDateInput = document.getElementById('noticeDate');
  try {
    await api('/notices', { method: 'POST', body: JSON.stringify({ message, date: noticeDateInput.value }) });
    noticeMessageInput.value = '';
    noticeDateInput.value = '';
    await fetchNotices();
    updateStats();
  } catch (error) {
    alert(error.message || 'Failed to add notice');
  }
});

noticeList?.addEventListener('change', async (event) => {
  const checkbox = event.target.closest('input[data-action="toggle"]');
  if (!checkbox) return;
  const id = Number(checkbox.getAttribute('data-id'));
  try {
    await api(`/notices/${id}`, { method: 'PUT', body: JSON.stringify({ active: checkbox.checked }) });
    await fetchNotices();
    updateStats();
  } catch (error) {
    alert(error.message || 'Failed to update notice');
    checkbox.checked = !checkbox.checked;
  }
});

noticeList?.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action="delete"]');
  if (!button) return;
  const id = Number(button.getAttribute('data-id'));
  try {
    await api(`/notices/${id}`, { method: 'DELETE' });
    await fetchNotices();
    updateStats();
  } catch (error) {
    alert(error.message || 'Failed to delete notice');
  }
});

// --- Events ---
let events = [];

const renderEvents = (eventsList) => {
  if (!eventList) return;
  if (!eventsList.length) {
    eventList.innerHTML = '<div class="notice-item notice-empty">No events yet.</div>';
    return;
  }
  eventList.innerHTML = eventsList.map((event) => `
    <div class="notice-item">
      ${event.image?.dataUrl ? `<img class="event-thumb" src="${event.image.dataUrl}" alt="" />` : ''}
      <span class="notice-text">
        <strong>${escapeHtml(event.title)}</strong>${event.date ? ` — ${escapeHtml(event.date)}` : ''}
        ${event.description ? `<br /><span class="form-hint">${escapeHtml(event.description)}</span>` : ''}
      </span>
      <label class="notice-toggle">
        <input type="checkbox" data-action="toggle" data-id="${event.id}" ${event.active ? 'checked' : ''} />
        <span>Active</span>
      </label>
      <button class="action-btn" data-action="delete" data-id="${event.id}">Delete</button>
    </div>
  `).join('');
};

const fetchEvents = async () => {
  const data = await api('/events');
  events = data.events;
  renderEvents(events);
};

eventForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = eventTitleInput.value.trim();
  if (!title) return;
  const image = await readFileDataUrl(eventImageInput.files && eventImageInput.files[0]);
  try {
    await api('/events', {
      method: 'POST',
      body: JSON.stringify({
        title,
        date: eventDateInput.value,
        description: eventDescriptionInput.value.trim(),
        image
      })
    });
    eventForm.reset();
    await fetchEvents();
    updateStats();
  } catch (error) {
    alert(error.message || 'Failed to add event');
  }
});

eventList?.addEventListener('change', async (event) => {
  const checkbox = event.target.closest('input[data-action="toggle"]');
  if (!checkbox) return;
  const id = Number(checkbox.getAttribute('data-id'));
  try {
    await api(`/events/${id}`, { method: 'PUT', body: JSON.stringify({ active: checkbox.checked }) });
    await fetchEvents();
    updateStats();
  } catch (error) {
    alert(error.message || 'Failed to update event');
    checkbox.checked = !checkbox.checked;
  }
});

eventList?.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action="delete"]');
  if (!button) return;
  const id = Number(button.getAttribute('data-id'));
  try {
    await api(`/events/${id}`, { method: 'DELETE' });
    await fetchEvents();
    updateStats();
  } catch (error) {
    alert(error.message || 'Failed to delete event');
  }
});

// --- Hall Bookings ---
let bookings = [];

const renderBookings = (bookingsList) => {
  if (!bookingList) return;
  if (!bookingsList.length) {
    bookingList.innerHTML = '<div class="notice-item notice-empty">No bookings yet.</div>';
    return;
  }
  bookingList.innerHTML = bookingsList.map((booking) => `
    <div class="notice-item">
      <span class="notice-text">
        <strong>${escapeHtml(booking.date)} — ${escapeHtml(booking.slot)}${booking.timeRange ? ` (${escapeHtml(booking.timeRange)})` : ''}</strong> · ₹${escapeHtml(booking.amount || 0)}<br />
        <span class="form-hint">Flat ${escapeHtml(booking.memberFlat)} · ${escapeHtml(booking.memberName)}${booking.purpose ? ` · ${escapeHtml(booking.purpose)}` : ''}</span>
      </span>
      <button class="action-btn" data-action="delete" data-id="${booking.id}">Cancel</button>
    </div>
  `).join('');
};

const fetchBookings = async () => {
  const data = await api('/bookings');
  bookings = data.bookings;
  renderBookings(bookings);
};

bookingList?.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action="delete"]');
  if (!button) return;
  const id = Number(button.getAttribute('data-id'));
  if (!confirm('Cancel this hall booking?')) return;
  try {
    await api(`/bookings/${id}`, { method: 'DELETE' });
    await fetchBookings();
    updateStats();
  } catch (error) {
    alert(error.message || 'Failed to cancel booking');
  }
});

// --- Hall Rate Card ---
const rateCardForm = document.getElementById('rate-card-form');
const RATE_SLOT_KEYS = ['morning', 'afternoon', 'evening', 'fullDay'];
const rateFieldId = (key) => key.charAt(0).toUpperCase() + key.slice(1);

const fetchRates = async () => {
  const data = await api('/bookings?resource=rates');
  RATE_SLOT_KEYS.forEach((key) => {
    const suffix = rateFieldId(key);
    document.getElementById(`rate${suffix}`).value = data.rates[key].rate;
    document.getElementById(`rate${suffix}Start`).value = data.rates[key].start;
    document.getElementById(`rate${suffix}End`).value = data.rates[key].end;
  });
};

rateCardForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const body = {};
    RATE_SLOT_KEYS.forEach((key) => {
      const suffix = rateFieldId(key);
      body[key] = {
        rate: document.getElementById(`rate${suffix}`).value,
        start: document.getElementById(`rate${suffix}Start`).value,
        end: document.getElementById(`rate${suffix}End`).value
      };
    });
    await api('/bookings?resource=rates', { method: 'PUT', body: JSON.stringify(body) });
    alert('Rate card saved.');
  } catch (error) {
    alert(error.message || 'Failed to save rate card');
  }
});

// --- Admin Users (Super Admin only) ---
const renderAdminAccounts = (admins) => {
  if (!adminAccountList) return;
  if (!admins.length) {
    adminAccountList.innerHTML = '<div class="notice-item notice-empty">No admin accounts yet.</div>';
    return;
  }
  adminAccountList.innerHTML = admins.map((admin) => `
    <div class="notice-item">
      <span class="notice-text">
        <strong>${escapeHtml(admin.username)}</strong> — ${escapeHtml(admin.adminRole)}<br />
        <span class="form-hint">${escapeHtml(admin.email || 'No email on file')}</span>
      </span>
      <button class="action-btn" data-action="delete" data-id="${admin.id}">Delete</button>
    </div>
  `).join('');
};

const fetchAdminAccounts = async () => {
  const data = await api('/admins');
  renderAdminAccounts(data.admins);
};

adminAccountForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = document.getElementById('newAdminUsername').value.trim();
  const password = document.getElementById('newAdminPassword').value;
  const email = document.getElementById('newAdminEmail').value.trim();
  const roleValue = document.getElementById('newAdminRole').value;
  if (!username || !password) return;
  try {
    await api('/admins', { method: 'POST', body: JSON.stringify({ username, password, email, adminRole: roleValue }) });
    adminAccountForm.reset();
    await fetchAdminAccounts();
  } catch (error) {
    alert(error.message || 'Failed to add admin account');
  }
});

adminAccountList?.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action="delete"]');
  if (!button) return;
  const id = button.getAttribute('data-id');
  if (!confirm('Delete this admin account?')) return;
  try {
    await api(`/admins?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    await fetchAdminAccounts();
  } catch (error) {
    alert(error.message || 'Failed to delete admin account');
  }
});

// --- Dashboard stats ---
const updateStats = () => {
  if (statMembers) statMembers.textContent = members.length;
  if (statNotices) statNotices.textContent = notices.filter((n) => n.active).length;
  if (statEvents) statEvents.textContent = events.filter((e) => e.active).length;
  if (statBookings) statBookings.textContent = bookings.length;
};

const init = async () => {
  try {
    const whoami = await api('/auth/admin-whoami');
    adminRole = whoami.adminRole;
  } catch (error) {
    return; // already redirected to admin.html on 401
  }

  if (adminRole === 'super-admin' && adminUsersNavItem) {
    adminUsersNavItem.hidden = false;
    try {
      await fetchAdminAccounts();
    } catch (error) {
      // non-fatal
    }
  }

  try {
    const data = await api('/members');
    members = data.members;
    renderMembers();
  } catch (error) {
    return;
  }

  try {
    await fetchNotices();
  } catch (error) {
    // non-fatal
  }
  try {
    await fetchEvents();
  } catch (error) {
    // non-fatal
  }
  try {
    await fetchBookings();
  } catch (error) {
    // non-fatal
  }
  try {
    await fetchRates();
  } catch (error) {
    // non-fatal
  }

  updateStats();
};

init();
