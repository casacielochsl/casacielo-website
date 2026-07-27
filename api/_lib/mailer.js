const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const ASSET_DIR = path.join(__dirname, '..', '..', 'assets');

const readAsset = (filename) => {
  try {
    return fs.readFileSync(path.join(ASSET_DIR, filename));
  } catch (error) {
    return null;
  }
};

const letterheadAttachments = () => {
  const attachments = [];
  const header = readAsset('letterhead-header.jpg');
  const footer = readAsset('letterhead-footer.jpg');
  if (header) attachments.push({ filename: 'letterhead-header.jpg', content: header, cid: 'letterhead-header' });
  if (footer) attachments.push({ filename: 'letterhead-footer.jpg', content: footer, cid: 'letterhead-footer' });
  return attachments;
};

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
  <div style="font-family: Arial, sans-serif; background:#e8edf0; padding:32px 16px;">
    <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:10px; overflow:hidden; border:1px solid #d7dee3;">
      <img src="cid:letterhead-header" alt="Casa Cielo Co-operative Housing Society Limited" style="display:block; width:100%; height:auto;" />
      <div style="padding:24px; color:#1a1a1a; line-height:1.6;">
        <h2 style="margin:0 0 12px; color:#1a1a1a;">${escapeHtml(title)}</h2>
        ${bodyHtml}
      </div>
      <img src="cid:letterhead-footer" alt="Casa Cielo Survey No. 149/1 and 150/10, F-Wing-003, Palava Phase-2, Lakeshore Green" style="display:block; width:100%; height:auto;" />
    </div>
  </div>
`;

const detailRow = (label, value) => `<tr><td style="padding:6px 12px 6px 0; color:#6b7a86; white-space:nowrap;">${escapeHtml(label)}</td><td style="padding:6px 0; font-weight:700; color:#1a1a1a;">${escapeHtml(value)}</td></tr>`;

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
  <table style="width:100%; border-collapse:collapse; margin:16px 0; border:1px solid #d7dee3; border-radius:8px; overflow:hidden;">
    <tr style="background:#eef2f5;">
      <td style="padding:8px 12px; color:#6b7a86; font-size:0.85rem; text-transform:uppercase; letter-spacing:0.06em;">Description</td>
      <td style="padding:8px 12px; color:#6b7a86; font-size:0.85rem; text-transform:uppercase; letter-spacing:0.06em; text-align:right;">Amount</td>
    </tr>
    <tr>
      <td style="padding:8px 12px; color:#1a1a1a;">Community Hall — ${escapeHtml(date)} (${escapeHtml(slot)}${range ? `, ${escapeHtml(range)}` : ''})</td>
      <td style="padding:8px 12px; text-align:right; color:#1a1a1a;">${formatMoney(amount, currency)}</td>
    </tr>
    <tr style="border-top:1px solid #d7dee3; font-weight:800;">
      <td style="padding:8px 12px; color:#1a1a1a;">Total</td>
      <td style="padding:8px 12px; text-align:right; color:#1a1a1a;">${formatMoney(amount, currency)}</td>
    </tr>
  </table>
`;
};

const sendResetEmail = ({ to, resetUrl }) => getTransporter().sendMail({
  attachments: letterheadAttachments(),
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  to,
  subject: 'Casa Cielo admin password reset',
  text: `Reset your Casa Cielo admin password using this link (valid for 30 minutes):\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
  html: emailShell('Password Reset', `
    <p>Reset your Casa Cielo admin password using the link below (valid for 30 minutes):</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>If you didn't request this, you can ignore this email.</p>
  `)
});

const sendBookingConfirmationEmail = ({ to, memberName, flat, wing, date, slot, purpose, timeRange, amount, currency, invoiceNo }) => getTransporter().sendMail({
  attachments: letterheadAttachments(),
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
  attachments: letterheadAttachments(),
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
