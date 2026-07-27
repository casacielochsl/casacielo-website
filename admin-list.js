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
const adminBookingForm = document.getElementById('admin-booking-form');
const adminBookingMemberSelect = document.getElementById('adminBookingMember');
const adminUsersNavItem = document.getElementById('adminUsersNavItem');
const adminAccountForm = document.getElementById('admin-account-form');
const adminAccountList = document.getElementById('adminAccountList');
const statMembers = document.getElementById('statMembers');
const statNotices = document.getElementById('statNotices');
const statEvents = document.getElementById('statEvents');
const statBookings = document.getElementById('statBookings');
const statComplaints = document.getElementById('statComplaints');
const statRequests = document.getElementById('statRequests');
const occasionForm = document.getElementById('occasion-form');
const occasionList = document.getElementById('occasionList');
const contributionForm = document.getElementById('contribution-form');
const contribOccasionSelect = document.getElementById('contribOccasion');
const reportOccasionFilter = document.getElementById('reportOccasionFilter');
const contributionTableBody = document.getElementById('contributionTableBody');
const statTotalCollection = document.getElementById('statTotalCollection');
const statAWingCollection = document.getElementById('statAWingCollection');
const statFWingCollection = document.getElementById('statFWingCollection');

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
    const record = [member.flat, member.name, member.wing, member.floor, member.memberType, member.contact].join(' ').toLowerCase();
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
      <td>
        <button class="action-btn" data-action="view" data-id="${member.id}">View</button>
        <button class="action-btn" data-action="edit" data-id="${member.id}">Edit</button>
        <button class="action-btn" data-action="delete" data-id="${member.id}">Delete</button>
      </td>
    </tr>
  `).join('');
  populateAdminBookingMemberSelect();
};

const populateAdminBookingMemberSelect = () => {
  if (!adminBookingMemberSelect) return;
  const previousValue = adminBookingMemberSelect.value;
  adminBookingMemberSelect.innerHTML = members
    .map((member) => `<option value="${member.id}">${escapeHtml(member.flat)} — ${escapeHtml(member.name)}</option>`)
    .join('');
  if (previousValue) adminBookingMemberSelect.value = previousValue;
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
  bookingList.innerHTML = bookingsList.map((booking) => {
    const isCancelled = booking.status === 'cancelled';
    return `
    <div class="notice-item${isCancelled ? ' is-cancelled' : ''}">
      <span class="notice-text">
        <strong>${escapeHtml(booking.date)} — ${escapeHtml(booking.slot)}${booking.timeRange ? ` (${escapeHtml(booking.timeRange)})` : ''}</strong> · ₹${escapeHtml(booking.amount || 0)}${isCancelled ? ' · <span class="cancelled-tag">Cancelled</span>' : (booking.bookedBy === 'admin' ? ' · <span class="form-hint">booked by admin</span>' : '')}<br />
        <span class="form-hint">Flat ${escapeHtml(booking.memberFlat)} · ${escapeHtml(booking.memberName)}${booking.purpose ? ` · ${escapeHtml(booking.purpose)}` : ''}</span>
      </span>
      <a class="action-btn" href="invoice.html?id=${booking.id}" target="_blank" rel="noopener">Invoice</a>
      ${isCancelled ? '' : `<button class="action-btn" data-action="delete" data-id="${booking.id}">Cancel</button>`}
    </div>
  `;
  }).join('');
};

const fetchBookings = async () => {
  const data = await api('/bookings');
  bookings = data.bookings;
  renderBookings(bookings);
};

adminBookingForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const memberId = Number(adminBookingMemberSelect.value);
  const date = document.getElementById('adminBookingDate').value;
  const slot = document.getElementById('adminBookingSlot').value;
  const purpose = document.getElementById('adminBookingPurpose').value.trim();
  if (!memberId) {
    alert('Select a member to book for.');
    return;
  }
  try {
    await api('/bookings', { method: 'POST', body: JSON.stringify({ memberId, date, slot, purpose }) });
    adminBookingForm.reset();
    await fetchBookings();
    updateStats();
    alert('Booking created. Confirmation and invoice emails have been sent.');
  } catch (error) {
    alert(error.message || 'Failed to create booking');
  }
});

bookingList?.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action="delete"]');
  if (!button) return;
  const id = Number(button.getAttribute('data-id'));
  if (!confirm('Cancel this hall booking?')) return;
  try {
    await api(`/bookings?id=${id}`, { method: 'DELETE' });
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

// --- Occasions ---
let occasions = [];

const renderOccasions = () => {
  if (!occasionList) return;
  if (!occasions.length) {
    occasionList.innerHTML = '<div class="notice-item notice-empty">No occasions yet.</div>';
  } else {
    occasionList.innerHTML = occasions.map((occasion) => `
      <div class="notice-item">
        <span class="notice-text">${escapeHtml(occasion.name)}</span>
        <label class="notice-toggle">
          <input type="checkbox" data-action="toggle-occasion" data-id="${occasion.id}" ${occasion.active ? 'checked' : ''} />
          <span>Active</span>
        </label>
        <button class="action-btn" data-action="delete-occasion" data-id="${occasion.id}">Delete</button>
      </div>
    `).join('');
  }

  const activeOccasions = occasions.filter((occasion) => occasion.active);
  if (contribOccasionSelect) {
    contribOccasionSelect.innerHTML = activeOccasions.map((occasion) => `<option value="${occasion.id}">${escapeHtml(occasion.name)}</option>`).join('');
  }
  if (reportOccasionFilter) {
    const previousValue = reportOccasionFilter.value;
    reportOccasionFilter.innerHTML = '<option value="">All Occasions</option>' + occasions.map((occasion) => `<option value="${occasion.id}">${escapeHtml(occasion.name)}</option>`).join('');
    reportOccasionFilter.value = previousValue;
  }
};

const fetchOccasions = async () => {
  const data = await api('/contributions?resource=occasions');
  occasions = data.occasions;
  renderOccasions();
};

occasionForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const nameInput = document.getElementById('occasionName');
  const name = nameInput.value.trim();
  if (!name) return;
  try {
    await api('/contributions?resource=occasions', { method: 'POST', body: JSON.stringify({ name }) });
    nameInput.value = '';
    await fetchOccasions();
  } catch (error) {
    alert(error.message || 'Failed to add occasion');
  }
});

occasionList?.addEventListener('change', async (event) => {
  const checkbox = event.target.closest('input[data-action="toggle-occasion"]');
  if (!checkbox) return;
  const id = checkbox.getAttribute('data-id');
  try {
    await api(`/contributions?resource=occasions&id=${id}`, { method: 'PUT', body: JSON.stringify({ active: checkbox.checked }) });
    await fetchOccasions();
  } catch (error) {
    alert(error.message || 'Failed to update occasion');
    checkbox.checked = !checkbox.checked;
  }
});

occasionList?.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action="delete-occasion"]');
  if (!button) return;
  const id = button.getAttribute('data-id');
  if (!confirm('Delete this occasion? Existing contribution records for it are kept.')) return;
  try {
    await api(`/contributions?resource=occasions&id=${id}`, { method: 'DELETE' });
    await fetchOccasions();
  } catch (error) {
    alert(error.message || 'Failed to delete occasion');
  }
});

// --- Contributions / Collection report ---
let contributions = [];

const renderContributionReport = () => {
  const filterId = reportOccasionFilter?.value || '';
  const visible = filterId ? contributions.filter((c) => String(c.occasionId) === filterId) : contributions;

  const total = visible.reduce((sum, c) => sum + (c.amount || 0), 0);
  const aWingTotal = visible.filter((c) => c.wing === 'A-Wing').reduce((sum, c) => sum + (c.amount || 0), 0);
  const fWingTotal = visible.filter((c) => c.wing === 'F-Wing').reduce((sum, c) => sum + (c.amount || 0), 0);
  if (statTotalCollection) statTotalCollection.textContent = `₹${total.toLocaleString('en-IN')}`;
  if (statAWingCollection) statAWingCollection.textContent = `₹${aWingTotal.toLocaleString('en-IN')}`;
  if (statFWingCollection) statFWingCollection.textContent = `₹${fWingTotal.toLocaleString('en-IN')}`;

  if (!contributionTableBody) return;
  contributionTableBody.innerHTML = visible.map((c) => `
    <tr>
      <td>${escapeHtml(c.flat)}</td>
      <td>${escapeHtml(c.wing)}</td>
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.occasionName)}</td>
      <td>₹${escapeHtml(c.amount)}</td>
      <td>${c.createdBy === 'member' ? 'Member' : 'Manual'}</td>
      <td>
        <a class="action-btn" href="receipt.html?id=${c.id}" target="_blank" rel="noopener">Receipt</a>
        <button class="action-btn" data-action="edit-contribution" data-id="${c.id}">Edit</button>
        <button class="action-btn" data-action="delete-contribution" data-id="${c.id}">Delete</button>
      </td>
    </tr>
  `).join('');
};

const fetchContributions = async () => {
  const data = await api('/contributions');
  contributions = data.contributions;
  renderContributionReport();
};

reportOccasionFilter?.addEventListener('change', renderContributionReport);

const contribEditIdInput = document.getElementById('contribEditId');
const contribSubmitBtn = document.getElementById('contribSubmitBtn');
const contribCancelEditBtn = document.getElementById('contribCancelEditBtn');

const exitContributionEditMode = () => {
  contribEditIdInput.value = '';
  contributionForm.reset();
  contribSubmitBtn.textContent = 'Log Contribution';
  contribCancelEditBtn.hidden = true;
};

contributionForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const editId = contribEditIdInput.value;
  const occasionId = Number(contribOccasionSelect.value);
  const name = document.getElementById('contribName').value.trim();
  const flat = document.getElementById('contribFlat').value.trim();
  const wing = document.getElementById('contribWing').value;
  const amount = document.getElementById('contribAmount').value;
  const note = document.getElementById('contribNote').value.trim();
  if (!occasionId) {
    alert('Add an occasion first.');
    return;
  }
  try {
    if (editId) {
      await api(`/contributions?id=${editId}`, { method: 'PUT', body: JSON.stringify({ occasionId, name, flat, wing, amount, note }) });
    } else {
      await api('/contributions', { method: 'POST', body: JSON.stringify({ occasionId, name, flat, wing, amount, note }) });
    }
    exitContributionEditMode();
    await fetchContributions();
  } catch (error) {
    alert(error.message || 'Failed to save contribution');
  }
});

contribCancelEditBtn?.addEventListener('click', exitContributionEditMode);

contributionTableBody?.addEventListener('click', async (event) => {
  const deleteButton = event.target.closest('button[data-action="delete-contribution"]');
  if (deleteButton) {
    const id = deleteButton.getAttribute('data-id');
    if (!confirm('Delete this contribution record?')) return;
    try {
      await api(`/contributions?id=${id}`, { method: 'DELETE' });
      await fetchContributions();
    } catch (error) {
      alert(error.message || 'Failed to delete contribution');
    }
    return;
  }

  const editButton = event.target.closest('button[data-action="edit-contribution"]');
  if (editButton) {
    const id = Number(editButton.getAttribute('data-id'));
    const contribution = contributions.find((c) => c.id === id);
    if (!contribution) return;
    contribEditIdInput.value = String(contribution.id);
    contribOccasionSelect.value = String(contribution.occasionId);
    document.getElementById('contribName').value = contribution.name || '';
    document.getElementById('contribFlat').value = contribution.flat || '';
    document.getElementById('contribWing').value = contribution.wing || '';
    document.getElementById('contribAmount').value = contribution.amount || '';
    document.getElementById('contribNote').value = contribution.note || '';
    contribSubmitBtn.textContent = 'Update Contribution';
    contribCancelEditBtn.hidden = false;
    contributionForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});

// --- Export to Excel (.xlsx) ---
document.getElementById('exportContributionsBtn')?.addEventListener('click', async () => {
  const filterId = reportOccasionFilter?.value || '';
  const visible = filterId ? contributions.filter((c) => String(c.occasionId) === filterId) : contributions;
  if (!visible.length) {
    alert('No contributions to export.');
    return;
  }
  if (typeof ExcelJS === 'undefined') {
    alert('Export library failed to load. Please refresh and try again.');
    return;
  }

  const occasionLabel = filterId ? (occasions.find((o) => String(o.id) === filterId)?.name || 'Occasion') : 'All Occasions';
  const header = ['Flat', 'Wing', 'Name', 'Occasion', 'Amount', 'Source', 'Note', 'Date'];
  const total = visible.reduce((sum, c) => sum + (c.amount || 0), 0);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Contributions');
  sheet.columns = [
    { width: 10 }, { width: 8 }, { width: 24 }, { width: 20 },
    { width: 12 }, { width: 10 }, { width: 24 }, { width: 12 }
  ];

  sheet.mergeCells(1, 1, 1, header.length);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = 'CASA CIELO CO-OPERATIVE HOUSING SOCIETY LIMITED';
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: 'center' };

  sheet.mergeCells(2, 1, 2, header.length);
  const headingCell = sheet.getCell(2, 1);
  headingCell.value = `${occasionLabel} Contribution`;
  headingCell.font = { bold: true, size: 12 };
  headingCell.alignment = { horizontal: 'center' };

  const headerRow = sheet.getRow(4);
  headerRow.values = header;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
  });

  visible.forEach((c, i) => {
    const row = sheet.getRow(5 + i);
    row.values = [
      c.flat, c.wing, c.name, c.occasionName, c.amount,
      c.createdBy === 'member' ? 'Member' : 'Manual',
      c.note || '',
      c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : ''
    ];
    row.getCell(5).numFmt = '#,##0.00';
  });

  const totalRowIndex = 6 + visible.length;
  const totalRow = sheet.getRow(totalRowIndex);
  totalRow.getCell(4).value = 'Total';
  totalRow.getCell(4).font = { bold: true };
  totalRow.getCell(5).value = total;
  totalRow.getCell(5).font = { bold: true };
  totalRow.getCell(5).numFmt = '#,##0.00';

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `contributions-${occasionLabel.replace(/\s+/g, '-').toLowerCase()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

// --- Dashboard stats ---
const updateStats = () => {
  if (statMembers) statMembers.textContent = members.length;
  if (statNotices) statNotices.textContent = notices.filter((n) => n.active).length;
  if (statEvents) statEvents.textContent = events.filter((e) => e.active).length;
  if (statBookings) statBookings.textContent = bookings.length;
  const isOpenTicket = (t) => t.status === 'Open' || t.status === 'In Progress';
  if (statComplaints) statComplaints.textContent = complaints.filter(isOpenTicket).length;
  if (statRequests) statRequests.textContent = requests.filter(isOpenTicket).length;
};

// --- Complaints & Requests (shared "tickets" endpoint, split by kind) ---
let complaints = [];
let requests = [];

const renderTicketTable = (tableBodyId, ticketList, statusFilterValue) => {
  const tableBody = document.getElementById(tableBodyId);
  if (!tableBody) return;
  const visible = statusFilterValue ? ticketList.filter((t) => t.status === statusFilterValue) : ticketList;
  const action = tableBodyId === 'complaintTableBody' ? 'edit-complaint' : 'edit-request';
  tableBody.innerHTML = visible.map((t) => `
    <tr>
      <td>${t.createdAt ? new Date(t.createdAt).toISOString().slice(0, 10) : '-'}</td>
      <td>${escapeHtml(t.memberFlat)}</td>
      <td>${escapeHtml(t.memberWing)}</td>
      <td>${escapeHtml(t.memberName)}</td>
      <td>${escapeHtml(t.category)}</td>
      <td>${escapeHtml(t.subject)}</td>
      <td><span class="status-tag status-${String(t.status).toLowerCase().replace(/\s+/g, '-')}">${escapeHtml(t.status)}</span></td>
      <td>
        <a class="action-btn" href="workorder.html?id=${t.id}&role=admin" target="_blank" rel="noopener">Work Order</a>
        <button class="action-btn" data-action="${action}" data-id="${t.id}">Update</button>
      </td>
    </tr>
  `).join('');
};

const fetchComplaints = async () => {
  const data = await api('/tickets?kind=complaint');
  complaints = data.tickets;
  renderTicketTable('complaintTableBody', complaints, document.getElementById('complaintStatusFilter')?.value || '');
};

const fetchRequests = async () => {
  const data = await api('/tickets?kind=request');
  requests = data.tickets;
  renderTicketTable('requestTableBody', requests, document.getElementById('requestStatusFilter')?.value || '');
};

document.getElementById('complaintStatusFilter')?.addEventListener('change', (event) => {
  renderTicketTable('complaintTableBody', complaints, event.target.value);
});
document.getElementById('requestStatusFilter')?.addEventListener('change', (event) => {
  renderTicketTable('requestTableBody', requests, event.target.value);
});

const wireTicketUpdateForm = (kind, tableBodyId, list, refresh) => {
  const formId = `${kind}-update-form`;
  const editIdInput = document.getElementById(`${kind}EditId`);
  const statusSelect = document.getElementById(`${kind}Status`);
  const remarksInput = document.getElementById(`${kind}Remarks`);
  const costBorneBySelect = document.getElementById(`${kind}CostBorneBy`);
  const costInput = document.getElementById(`${kind}Cost`);
  const cancelBtn = document.getElementById(`${kind}CancelEditBtn`);
  const form = document.getElementById(formId);
  const tableBody = document.getElementById(tableBodyId);

  const exitEditMode = () => {
    editIdInput.value = '';
    form.reset();
  };

  tableBody?.addEventListener('click', (event) => {
    const button = event.target.closest(`button[data-action="edit-${kind}"]`);
    if (!button) return;
    const id = Number(button.getAttribute('data-id'));
    const ticket = list().find((t) => t.id === id);
    if (!ticket) return;
    editIdInput.value = String(ticket.id);
    statusSelect.value = ticket.status;
    remarksInput.value = ticket.adminRemarks || '';
    costBorneBySelect.value = ticket.costBorneBy || '';
    costInput.value = ticket.cost != null ? ticket.cost : '';
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = editIdInput.value;
    if (!id) {
      alert(`Select a ${kind} to update using its Update button.`);
      return;
    }
    try {
      await api(`/tickets?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: statusSelect.value,
          adminRemarks: remarksInput.value.trim(),
          costBorneBy: costBorneBySelect.value || null,
          cost: costInput.value === '' ? null : Number(costInput.value)
        })
      });
      exitEditMode();
      await refresh();
    } catch (error) {
      alert(error.message || `Failed to update ${kind}`);
    }
  });

  cancelBtn?.addEventListener('click', exitEditMode);
};

wireTicketUpdateForm('complaint', 'complaintTableBody', () => complaints, fetchComplaints);
wireTicketUpdateForm('request', 'requestTableBody', () => requests, fetchRequests);

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
  try {
    await fetchOccasions();
    await fetchContributions();
  } catch (error) {
    // non-fatal
  }
  try {
    await fetchComplaints();
    await fetchRequests();
  } catch (error) {
    // non-fatal
  }

  updateStats();
};

init();
