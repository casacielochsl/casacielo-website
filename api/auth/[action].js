const { ObjectId } = require('mongodb');
const { getDb } = require('../_lib/db');
const {
  verifyPassword, hashPassword, setSessionCookie, ADMIN_COOKIE, MEMBER_COOKIE,
  signResetToken, verifyResetToken, requireAdminSession
} = require('../_lib/auth');
const { sendResetEmail } = require('../_lib/mailer');
const { readJsonBody, sendJson } = require('../_lib/http');
const { normalizeFlatKey } = require('../_lib/members');

const buildOrigin = (req) => {
  const proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
};

const adminLogin = async (req, res) => {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { error: 'Invalid request body' });
    return;
  }

  const username = (body.username || '').trim();
  const password = body.password || '';

  if (!username || !password) {
    sendJson(res, 400, { error: 'Username and password are required' });
    return;
  }

  const db = await getDb();
  const admin = await db.collection('admins').findOne({ username });

  if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
    sendJson(res, 401, { error: 'Invalid admin credentials' });
    return;
  }

  setSessionCookie(req, res, ADMIN_COOKIE, {
    role: 'admin',
    adminRole: admin.adminRole || 'manager',
    sub: admin.username,
    id: admin._id.toString()
  });
  sendJson(res, 200, { ok: true });
};

const memberLogin = async (req, res) => {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { error: 'Invalid request body' });
    return;
  }

  const flat = (body.flat || '').trim();
  const password = body.password || '';

  if (!flat || !password) {
    sendJson(res, 400, { error: 'Flat number and password are required' });
    return;
  }

  const db = await getDb();
  const member = await db.collection('members').findOne({ flatKey: normalizeFlatKey(flat) });

  if (!member || !(await verifyPassword(password, member.passwordHash))) {
    sendJson(res, 401, { error: 'Invalid flat number or password' });
    return;
  }

  setSessionCookie(req, res, MEMBER_COOKIE, { role: 'member', id: member.id, flat: member.flat });
  sendJson(res, 200, { ok: true, flat: member.flat });
};

const adminForgotPassword = async (req, res) => {
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

const adminResetPassword = async (req, res) => {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { error: 'Invalid request body' });
    return;
  }

  const { token, password } = body;

  if (!token || !password || password.length < 6) {
    sendJson(res, 400, { error: 'A valid token and a password of at least 6 characters are required' });
    return;
  }

  const payload = verifyResetToken(token);
  if (!payload) {
    sendJson(res, 401, { error: 'This reset link is invalid or has expired' });
    return;
  }

  let objectId;
  try {
    objectId = new ObjectId(payload.id);
  } catch (error) {
    sendJson(res, 401, { error: 'This reset link is invalid or has expired' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const db = await getDb();
  await db.collection('admins').updateOne({ _id: objectId }, { $set: { passwordHash } });

  sendJson(res, 200, { ok: true });
};

const adminWhoami = async (req, res) => {
  const session = requireAdminSession(req, res);
  if (!session) return;
  sendJson(res, 200, { username: session.sub, adminRole: session.adminRole || 'manager' });
};

const ACTIONS = {
  'admin-login': { method: 'POST', handler: adminLogin },
  'member-login': { method: 'POST', handler: memberLogin },
  'admin-forgot-password': { method: 'POST', handler: adminForgotPassword },
  'admin-reset-password': { method: 'POST', handler: adminResetPassword },
  'admin-whoami': { method: 'GET', handler: adminWhoami }
};

module.exports = async (req, res) => {
  const action = (req.query && req.query.action) || req.url.split('?')[0].split('/').filter(Boolean).pop();
  const entry = ACTIONS[action];

  if (!entry) {
    sendJson(res, 404, { error: 'Unknown auth action' });
    return;
  }

  if (req.method !== entry.method) {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  await entry.handler(req, res);
};
