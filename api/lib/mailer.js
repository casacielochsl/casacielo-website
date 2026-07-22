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

const sendResetEmail = ({ to, resetUrl }) => getTransporter().sendMail({
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  to,
  subject: 'Casa Cielo admin password reset',
  text: `Reset your Casa Cielo admin password using this link (valid for 30 minutes):\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
  html: `<p>Reset your Casa Cielo admin password using the link below (valid for 30 minutes):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can ignore this email.</p>`
});

module.exports = { sendResetEmail };
