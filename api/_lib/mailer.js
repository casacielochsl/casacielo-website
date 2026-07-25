const nodemailer = require('nodemailer');

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const emailShell = (title, bodyHtml) => `
  <div style="font-family: Arial, sans-serif; background:#07111f; padding:32px 16px;">
    <div style="max-width:520px; margin:0 auto; background:#0f2038; border-radius:16px; overflow:hidden; border:1px solid rgba(255,255,255,0.12);">
      <div style="background-color:#2f84ff; background-image:linear-gradient(135deg,#5ad0ff,#2f84ff); padding:20px 24px; color:#ffffff; font-weight:800; letter-spacing:0.04em; text-transform:uppercase;">
        <span style="color:#ffffff;">Casa Cielo</span>
      </div>
      <div style="padding:24px; color:#eaf2ff; line-height:1.6;">
        <h2 style="margin:0 0 12px; color:#eaf2ff;">${escapeHtml(title)}</h2>
        ${bodyHtml}
      </div>
    </div>
  </div>
`;

const detailRow = (label, value) => `<tr><td style="padding:6px 12px 6px 0; color:#aab6cb; white-space:nowrap;">${escapeHtml(label)}</td><td style="padding:6px 0; font-weight:700;">${escapeHtml(value)}</td></tr>`;

const formatMoney = (amount, currency) => {
  const symbol = currency === 'INR' ? '₹' : `${currency} `;
  return `${symbol}${Number(amount || 0).toLocaleString('en-IN')}`;
};

const formatTime12h = (value) => {
  const [hourStr, minute] = String(value || '').split(':');
  const hour = Number(hourStr);
  if (!Number.isFinite(hour)) return value || '';
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute} ${period}`;
};

const formatTimeRange = (timeRange) => {
  if (!timeRange || !timeRange.includes('-')) return '';
  const [start, end] = timeRange.split('-');
  return `${formatTime12h(start)} - ${formatTime12h(end)}`;
};

const invoiceTable = ({ date, slot, timeRange, amount, currency }) => {
  const range = formatTimeRange(timeRange);
  return `
  <table style="width:100%; border-collapse:collapse; margin:16px 0; border:1px solid rgba(255,255,255,0.12); border-radius:8px; overflow:hidden;">
    <tr style="background:rgba(255,255,255,0.06);">
      <td style="padding:8px 12px; color:#aab6cb; font-size:0.85rem; text-transform:uppercase; letter-spacing:0.06em;">Description</td>
      <td style="padding:8px 12px; color:#aab6cb; font-size:0.85rem; text-transform:uppercase; letter-spacing:0.06em; text-align:right;">Amount</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;">Community Hall — ${escapeHtml(date)} (${escapeHtml(slot)}${range ? `, ${escapeHtml(range)}` : ''})</td>
      <td style="padding:8px 12px; text-align:right;">${formatMoney(amount, currency)}</td>
    </tr>
    <tr style="border-top:1px solid rgba(255,255,255,0.12); font-weight:800;">
      <td style="padding:8px 12px;">Total</td>
      <td style="padding:8px 12px; text-align:right;">${formatMoney(amount, currency)}</td>
    </tr>
  </table>
`;
};

const sendResetEmail = ({ to, resetUrl }) => getTransporter().sendMail({
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  to,
  subject: 'Casa Cielo admin password reset',
  text: `Reset your Casa Cielo admin password using this link (valid for 30 minutes):\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
  html: `<p>Reset your Casa Cielo admin password using the link below (valid for 30 minutes):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can ignore this email.</p>`
});

const sendBookingConfirmationEmail = ({ to, memberName, flat, wing, date, slot, purpose, timeRange, amount, currency, invoiceNo }) => getTransporter().sendMail({
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  to,
  subject: `Hall Booking Invoice #INV-${String(invoiceNo).padStart(4, '0')} — ${date} (${slot})`,
  text: `Hi ${memberName},\n\nYour Community Hall booking is confirmed.\nInvoice #: INV-${String(invoiceNo).padStart(4, '0')}\nDate: ${date}\nSlot: ${slot}${timeRange ? ` (${formatTimeRange(timeRange)})` : ''}\nFlat: ${flat}${wing ? ` (${wing})` : ''}${purpose ? `\nPurpose: ${purpose}` : ''}\nAmount: ${formatMoney(amount, currency)}\n\nSee you there!\nCasa Cielo Management`,
  html: emailShell('Booking Confirmed', `
    <p>Hi ${escapeHtml(memberName)},</p>
    <p>Your Community Hall booking is confirmed:</p>
    <table style="width:100%; border-collapse:collapse; margin:16px 0;">
      ${detailRow('Invoice #', `INV-${String(invoiceNo).padStart(4, '0')}`)}
      ${detailRow('Date', date)}
      ${detailRow('Slot', timeRange ? `${slot} (${formatTimeRange(timeRange)})` : slot)}
      ${detailRow('Flat', flat)}
      ${wing ? detailRow('Wing', wing) : ''}
      ${purpose ? detailRow('Purpose', purpose) : ''}
    </table>
    ${invoiceTable({ date, slot, timeRange, amount, currency })}
    <p>See you there!</p>
  `)
});

const sendBookingManagerNotificationEmail = ({ to, memberName, flat, wing, date, slot, purpose, timeRange, contact, email, amount, currency, invoiceNo }) => getTransporter().sendMail({
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  to,
  subject: `New hall booking — ${date} (${slot}) — Flat ${flat}`,
  text: `New Community Hall booking:\nInvoice #: INV-${String(invoiceNo).padStart(4, '0')}\nMember: ${memberName} (Flat ${flat}${wing ? `, ${wing}` : ''})\nDate: ${date}\nSlot: ${slot}${timeRange ? ` (${formatTimeRange(timeRange)})` : ''}${purpose ? `\nPurpose: ${purpose}` : ''}\nAmount: ${formatMoney(amount, currency)}\nContact: ${contact || '—'}\nEmail: ${email || '—'}`,
  html: emailShell('New Hall Booking', `
    <table style="width:100%; border-collapse:collapse; margin:16px 0;">
      ${detailRow('Invoice #', `INV-${String(invoiceNo).padStart(4, '0')}`)}
      ${detailRow('Member', `${memberName} (Flat ${flat}${wing ? `, ${wing}` : ''})`)}
      ${detailRow('Date', date)}
      ${detailRow('Slot', timeRange ? `${slot} (${formatTimeRange(timeRange)})` : slot)}
      ${purpose ? detailRow('Purpose', purpose) : ''}
      ${detailRow('Contact', contact || '—')}
      ${detailRow('Email', email || '—')}
    </table>
    ${invoiceTable({ date, slot, timeRange, amount, currency })}
  `)
});

module.exports = { sendResetEmail, sendBookingConfirmationEmail, sendBookingManagerNotificationEmail };
