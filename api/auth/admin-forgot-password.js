const { getDb } = require('../lib/db');
const { signResetToken } = require('../lib/auth');
const { sendResetEmail } = require('../lib/mailer');
const { readJsonBody, sendJson } = require('../lib/http');

const buildOrigin = (req) => {
  const proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { error: 'Invalid request body' });
    return;
  }

  const username = (body.username || '').trim();
  const genericResponse = { ok: true, message: 'If that account exists, a reset link has been emailed to its recovery address.' };

  if (!username) {
    sendJson(res, 200, genericResponse);
    return;
  }

  const db = await getDb();
  const admin = await db.collection('admins').findOne({ username });

  if (admin && admin.email) {
    const token = signResetToken(admin._id.toString());
    const resetUrl = `${buildOrigin(req)}/reset-password.html?token=${token}`;
    try {
      await sendResetEmail({ to: admin.email, resetUrl });
    } catch (error) {
      console.error('Failed to send admin reset email:', error);
    }
  }

  sendJson(res, 200, genericResponse);
};
