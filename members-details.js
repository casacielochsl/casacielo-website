const API_BASE = '/api';
const SLOTS = ['Morning', 'Afternoon', 'Evening', 'Full Day'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

let myMemberId = null;
let allBookings = [];
const EMPTY_SLOT_RATE = { rate: 0, start: '', end: '' };
let hallRates = { morning: EMPTY_SLOT_RATE, afternoon: EMPTY_SLOT_RATE, evening: EMPTY_SLOT_RATE, fullDay: EMPTY_SLOT_RATE, currency: 'INR' };
const RATE_KEYS = { Morning: 'morning', Afternoon: 'afternoon', Evening: 'evening', 'Full Day': 'fullDay' };
let selectedDate = null;
const today = new Date();
let viewYear = today.getFullYear();
let viewMonth = today.getMonth();

const setText = (id, value) => {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const formatTime12h = (value) => {
  const [hourStr, minute] = String(value || '').split(':');
  const hour = Number(hourStr);
  if (!Number.isFinite(hour)) return '';
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute} ${period}`;
};

const formatSlotOption = (slot) => {
  const entry = hallRates[RATE_KEYS[slot]] || EMPTY_SLOT_RATE;
  const timeLabel = entry.start && entry.end ? ` (${formatTime12h(entry.start)}-${formatTime12h(entry.end)})` : '';
  return `${slot}${timeLabel} — ₹${entry.rate || 0}`;
};

const api = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (res.status === 401) {
    window.location.href = 'members.html';
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

// --- Dashboard (profile) ---
const renderMember = (member) => {
  myMemberId = member.id;
  setText('primaryName', member.name || member.primaryName || 'Member');
  setText('detailFlat', member.flat || '-');
  setText('detailWing', member.wing || '-');
  setText('detailFloor', member.floor || '-');
  setText('detailMemberType', member.memberType || 'Owner');
  setText('detailStatus', member.status || 'Active');
  setText('detailPhone', member.contact || member.phone || '-');
  setText('detailEmail', member.email || '-');

  setText('duesStatus', member.maintenanceStatus || '-');
  setText('duesLastPayment', member.lastPayment || '-');
  setText('duesNextDue', member.nextDue || '-');
  setText('duesVisitorPass', member.visitorPass || '-');

  const familyContainer = document.getElementById('familyMembers');
  if (familyContainer) {
    const residentRows = [
      {
        name: member.name || member.primaryName || 'Member',
        role: member.memberType || 'Owner',
        contact: member.contact || member.phone || '-',
        details: member.email || '-'
      },
      ...(Array.isArray(member.familyMembers) && member.familyMembers.length
        ? member.familyMembers.map((person) => ({
            name: person.name || '-',
            role: person.relation || person.type || 'Family Member',
            contact: person.contact || '-',
            details: person.age ? `${person.age}${person.type ? ` • ${person.type}` : ''}` : (person.type || 'Family Member')
          }))
        : (member.family ? member.family.split(',').map((entry) => ({
            name: entry.trim(),
            role: 'Family Member',
            contact: '-',
            details: 'Family Member'
          })) : []))
    ];

    familyContainer.innerHTML = `
      <div class="occupant-row occupant-row-head">
        <span>Name</span>
        <span>Role</span>
        <span>Contact</span>
        <span>Details</span>
      </div>
      ${residentRows.map((person) => `
        <div class="occupant-row">
          <strong>${person.name}</strong>
          <span>${person.role}</span>
          <span>${person.contact}</span>
          <span>${person.details}</span>
        </div>
      `).join('')}
    `;
  }

  const tenantContainer = document.getElementById('tenantSection');
  if (tenantContainer) {
    const tenant = member.tenant || null;
    if (!tenant || (!tenant.name && !tenant.contact && !tenant.email && !tenant.details && !(tenant.members || []).length && !(tenant.documents && Object.keys(tenant.documents).length))) {
      tenantContainer.innerHTML = '<div class="tenant-item">No tenant details recorded.</div>';
    } else {
      const docEntries = Object.entries(tenant.documents || {});
      tenantContainer.innerHTML = `
        <div class="tenant-item">
          <strong>${tenant.name || 'Tenant'}</strong><br />
          <span>Contact: ${tenant.contact || '—'}</span><br />
          <span>Email: ${tenant.email || '—'}</span><br />
          <span>Rent From: ${tenant.rentFrom || '—'}</span><br />
          <span>Agreement End: ${tenant.agreementEnd || '—'}</span><br />
          <span>Notes: ${tenant.details || '—'}</span>
          ${Array.isArray(tenant.renewals) && tenant.renewals.length ? `
            <div style="margin-top: 0.7rem;"><strong>Renewal History</strong></div>
            <div class="family-list">
              ${tenant.renewals.map((item) => `
                <div class="family-item">
                  <strong>${item.date || '—'}</strong><br />
                  <span>${item.note || '—'}</span>
                </div>
              `).join('')}
            </div>` : ''}
          ${Array.isArray(tenant.previousTenants) && tenant.previousTenants.length ? `
            <div style="margin-top: 0.7rem;"><strong>Previous Tenants</strong></div>
            <div class="family-list">
              ${tenant.previousTenants.map((item) => `
                <div class="family-item">
                  <strong>${item.name || '—'}</strong><br />
                  <span>${item.from || '—'} to ${item.to || '—'}</span><br />
                  <span>${item.note || '—'}</span>
                </div>
              `).join('')}
            </div>` : ''}
          ${Array.isArray(tenant.members) && tenant.members.length ? `
            <div style="margin-top: 0.7rem;"><strong>Tenant Members</strong></div>
            <div class="family-list">
              ${tenant.members.map((item) => `
                <div class="family-item">
                  <strong>${item.name || 'Member'}</strong><br />
                  <span>${item.relation || '—'} • ${item.contact || '—'}</span><br />
                  <span>Aadhaar: ${item.aadhaar || '—'} • PAN: ${item.pan || '—'}</span>
                </div>
              `).join('')}
            </div>` : ''}
          ${docEntries.length ? `
            <div class="doc-list">
              ${docEntries.map(([key, doc]) => doc && doc.dataUrl ? `<a class="doc-link" href="${doc.dataUrl}" download="${doc.name || key}">Download ${key}</a>` : '').join('')}
            </div>` : ''}
        </div>
      `;
    }
  }
};

// --- Notice Board (read-only) ---
const renderMemberNotices = (notices) => {
  const container = document.getElementById('memberNoticeList');
  if (!container) return;
  const active = notices.filter((notice) => notice.active);
  if (!active.length) {
    container.innerHTML = '<div class="notice-item notice-empty">No notices right now.</div>';
    return;
  }
  container.innerHTML = active.map((notice) => `<div class="notice-item"><span class="notice-text">${escapeHtml(notice.message)}</span></div>`).join('');
};

// --- Community Hall Booking ---
const pad2 = (n) => String(n).padStart(2, '0');
const formatDate = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

const getAvailableSlots = (dateStr) => {
  const bookingsForDay = allBookings.filter((booking) => booking.date === dateStr);
  if (bookingsForDay.some((booking) => booking.slot === 'Full Day')) return [];
  const taken = new Set(bookingsForDay.map((booking) => booking.slot));
  return SLOTS.filter((slot) => (slot === 'Full Day' ? bookingsForDay.length === 0 : !taken.has(slot)));
};

const renderCalendar = () => {
  const grid = document.getElementById('calendarGrid');
  const label = document.getElementById('calendarMonthLabel');
  if (!grid || !label) return;

  label.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  const firstWeekday = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  let html = dayLabels.map((label2) => `<div class="calendar-day-label">${label2}</div>`).join('');

  for (let i = 0; i < firstWeekday; i++) {
    html += '<div class="calendar-day is-empty"></div>';
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(viewYear, viewMonth, day);
    const isPast = dateStr < todayStr;
    const available = isPast ? [] : getAvailableSlots(dateStr);
    const isFull = !isPast && available.length === 0;
    const classes = ['calendar-day'];
    if (isPast) classes.push('is-past');
    if (isFull) classes.push('is-full');
    if (dateStr === selectedDate) classes.push('is-selected');
    const statusText = isPast ? '' : (isFull ? 'Full' : `${available.length} slot${available.length === 1 ? '' : 's'} open`);
    html += `<div class="${classes.join(' ')}" data-date="${dateStr}">
      <span class="calendar-day-num">${day}</span>
      <span class="calendar-day-status">${statusText}</span>
    </div>`;
  }

  grid.innerHTML = html;
};

const showBookingFormFor = (dateStr) => {
  selectedDate = dateStr;
  const hint = document.getElementById('bookingFormHint');
  const form = document.getElementById('booking-form');
  const dateInput = document.getElementById('bookingDate');
  const slotSelect = document.getElementById('bookingSlot');
  const message = document.getElementById('bookingMessage');
  if (message) message.textContent = '';

  const available = getAvailableSlots(dateStr);
  if (!available.length) {
    if (form) form.hidden = true;
    if (hint) hint.textContent = `No slots available on ${dateStr}.`;
    return;
  }

  if (hint) hint.textContent = `Booking for ${dateStr}:`;
  if (dateInput) dateInput.value = dateStr;
  if (slotSelect) {
    slotSelect.innerHTML = available.map((slot) => `<option value="${slot}">${formatSlotOption(slot)}</option>`).join('');
  }
  if (form) form.hidden = false;
};

document.getElementById('calendarGrid')?.addEventListener('click', (event) => {
  const cell = event.target.closest('.calendar-day');
  if (!cell || cell.classList.contains('is-empty') || cell.classList.contains('is-past')) return;
  showBookingFormFor(cell.getAttribute('data-date'));
  renderCalendar();
});

document.getElementById('calendarPrev')?.addEventListener('click', () => {
  viewMonth -= 1;
  if (viewMonth < 0) {
    viewMonth = 11;
    viewYear -= 1;
  }
  renderCalendar();
});

document.getElementById('calendarNext')?.addEventListener('click', () => {
  viewMonth += 1;
  if (viewMonth > 11) {
    viewMonth = 0;
    viewYear += 1;
  }
  renderCalendar();
});

document.getElementById('booking-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const slot = document.getElementById('bookingSlot').value;
  const purpose = document.getElementById('bookingPurpose').value.trim();
  const message = document.getElementById('bookingMessage');
  try {
    await api('/bookings', { method: 'POST', body: JSON.stringify({ date: selectedDate, slot, purpose }) });
    if (message) {
      message.textContent = 'Booked! A confirmation email has been sent to you.';
      message.style.color = '#8dffb0';
    }
    document.getElementById('bookingPurpose').value = '';
    document.getElementById('booking-form').hidden = true;
    await fetchBookings();
    renderCalendar();
    renderMyBookings();
  } catch (error) {
    if (message) {
      message.textContent = error.message || 'Failed to book the hall.';
      message.style.color = '#ff8d8d';
    }
  }
});

const renderMyBookings = () => {
  const container = document.getElementById('myBookingList');
  if (!container) return;
  const mine = allBookings.filter((booking) => booking.memberId === myMemberId).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!mine.length) {
    container.innerHTML = '<div class="booking-item notice-empty">No bookings yet.</div>';
    return;
  }
  container.innerHTML = mine.map((booking) => `
    <div class="booking-item">
      <span class="notice-text">
        <strong>${escapeHtml(booking.date)} — ${escapeHtml(booking.slot)}</strong> · ₹${escapeHtml(booking.amount || 0)}
        ${booking.purpose ? `<br /><span class="form-hint">${escapeHtml(booking.purpose)}</span>` : ''}
      </span>
      <button class="action-btn" data-action="cancel" data-id="${booking.id}">Cancel</button>
    </div>
  `).join('');
};

document.getElementById('myBookingList')?.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action="cancel"]');
  if (!button) return;
  const id = Number(button.getAttribute('data-id'));
  if (!confirm('Cancel this booking?')) return;
  try {
    await api(`/bookings/${id}`, { method: 'DELETE' });
    await fetchBookings();
    renderCalendar();
    renderMyBookings();
  } catch (error) {
    alert(error.message || 'Failed to cancel booking');
  }
});

const fetchBookings = async () => {
  const data = await api('/bookings');
  allBookings = data.bookings;
};

const fetchRates = async () => {
  const data = await api('/bookings?resource=rates');
  hallRates = data.rates;
};

const init = async () => {
  let member;
  try {
    const data = await api('/members/me');
    member = data.member;
  } catch (error) {
    return; // already redirected to members.html on 401
  }

  renderMember(member);

  try {
    const noticesData = await api('/notices');
    renderMemberNotices(noticesData.notices);
  } catch (error) {
    // non-fatal
  }

  try {
    await fetchRates();
  } catch (error) {
    // non-fatal
  }

  try {
    await fetchBookings();
    renderCalendar();
    renderMyBookings();
  } catch (error) {
    // non-fatal
  }
};

init();
