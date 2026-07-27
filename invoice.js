const API_BASE = '/api';
const params = new URLSearchParams(window.location.search);
const bookingId = Number(params.get('id'));

const setText = (id, value) => {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
};

const formatMoney = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const formatTime12h = (value) => {
  const [hourStr, minute] = String(value || '').split(':');
  const hour = Number(hourStr);
  if (!Number.isFinite(hour)) return '';
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute} ${period}`;
};

const formatTimeRange = (timeRange) => {
  if (!timeRange || !timeRange.includes('-')) return '';
  const [start, end] = timeRange.split('-');
  return `${formatTime12h(start)} - ${formatTime12h(end)}`;
};

const showError = () => {
  document.getElementById('invoiceSheet').hidden = true;
  document.getElementById('invoiceError').hidden = false;
};

const render = (booking) => {
  const invoiceNo = `INV-${String(booking.id).padStart(4, '0')}`;
  const cancelledBanner = document.getElementById('invCancelledBanner');
  if (cancelledBanner) cancelledBanner.hidden = booking.status !== 'cancelled';
  setText('invInvoiceNo', invoiceNo);
  setText('invDate', booking.date);
  setText('invMember', booking.memberName || '-');
  setText('invFlat', booking.memberFlat || '-');
  setText('invWing', booking.memberWing || '-');

  const range = formatTimeRange(booking.timeRange);
  const description = `Community Hall — ${booking.date} (${booking.slot}${range ? `, ${range}` : ''})`;
  const lineItems = document.getElementById('invLineItems');
  if (lineItems) {
    lineItems.innerHTML = `<tr><td>${description}</td><td>${formatMoney(booking.amount)}</td></tr>`;
  }
  setText('invTotal', formatMoney(booking.amount));

  if (booking.purpose) {
    setText('invPurpose', `Purpose: ${booking.purpose}`);
  }

  document.title = `Casa Cielo | Invoice ${invoiceNo}`;
};

const init = async () => {
  if (!bookingId) {
    showError();
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/bookings`, { headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) {
      showError();
      return;
    }
    const data = await res.json();
    const booking = (data.bookings || []).find((item) => item.id === bookingId);
    if (!booking) {
      showError();
      return;
    }
    render(booking);
  } catch (error) {
    showError();
  }
};

document.getElementById('printBtn')?.addEventListener('click', () => window.print());

init();
