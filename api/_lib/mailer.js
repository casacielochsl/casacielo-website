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
      <div style="background:linear-gradient(135deg,#5ad0ff,#2f84ff); padding:20px 24px; color:#07111f; font-weight:800; letter-spacing:0.04em; text-transform:uppercase;">
        Casa Cielo
      </div>
      <div style="padding:24px; color:#eaf2ff; line-height:1.6;">
        <h2 style="margin:0 0 12px; color:#eaf2ff;">${escapeHtml(title)}</h2>
        ${bodyHtml}
      </div>
    </div>
  </div>
`;

const detailRow = (label, value) => `<tr><td style="padding:6px 12px 6px 0; color:#aab6cb; white-space:nowrap;">${escapeHtml(label)}</td><td style="padding:6px 0; font-weight:700;">${escapeHtml(value)}</td></tr>`;

const sendResetEmail = ({ to, resetUrl }) => getTransporter().sendMail({
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  to,
  subject: 'Casa Cielo admin password reset',
  text: `Reset your Casa Cielo admin password using this link (valid for 30 minutes):\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
  html: `<p>Reset your Casa Cielo admin password using the link below (valid for 30 minutes):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can ignore this email.</p>`
});

const sendBookingConfirmationEmail = ({ to, memberName, flat, date, slot, purpose }) => getTransporter().sendMail({
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  to,
  subject: `Community Hall booking confirmed — ${date} (${slot})`,
  text: `Hi ${memberName},\n\nYour Community Hall booking is confirmed.\nDate: ${date}\nSlot: ${slot}\nFlat: ${flat}${purpose ? `\nPurpose: ${purpose}` : ''}\n\nSee you there!\nCasa Cielo Management`,
  html: emailShell('Booking Confirmed', `
    <p>Hi ${escapeHtml(memberName)},</p>
    <p>Your Community Hall booking is confirmed:</p>
    <table style="width:100%; border-collapse:collapse; margin:16px 0;">
      ${detailRow('Date', date)}
      ${detailRow('Slot', slot)}
      ${detailRow('Flat', flat)}
      ${purpose ? detailRow('Purpose', purpose) : ''}
    </table>
    <p>See you there!</p>
  `)
});

const sendBookingManagerNotificationEmail = ({ to, memberName, flat, date, slot, purpose, contact, email }) => getTransporter().sendMail({
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  to,
  subject: `New hall booking — ${date} (${slot}) — Flat ${flat}`,
  text: `New Community Hall booking:\nMember: ${memberName} (Flat ${flat})\nDate: ${date}\nSlot: ${slot}${purpose ? `\nPurpose: ${purpose}` : ''}\nContact: ${contact || '—'}\nEmail: ${email || '—'}`,
  html: emailShell('New Hall Booking', `
    <table style="width:100%; border-collapse:collapse; margin:16px 0;">
      ${detailRow('Member', `${memberName} (Flat ${flat})`)}
      ${detailRow('Date', date)}
      ${detailRow('Slot', slot)}
      ${purpose ? detailRow('Purpose', purpose) : ''}
      ${detailRow('Contact', contact || '—')}
      ${detailRow('Email', email || '—')}
    </table>
  `)
});

module.exports = { sendResetEmail, sendBookingConfirmationEmail, sendBookingManagerNotificationEmail };
