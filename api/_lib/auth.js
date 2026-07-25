const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const { sendJson } = require('./http');

const AUTH_SECRET = process.env.AUTH_SECRET;

if (!AUTH_SECRET) {
  throw new Error('Missing AUTH_SECRET environment variable');
}

const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60; // 12 hours
const RESET_TOKEN_MAX_AGE_SECONDS = 30 * 60; // 30 minutes
const ADMIN_COOKIE = 'cc_admin_session';
const MEMBER_COOKIE = 'cc_member_session';

const hashPassword = (plain) => bcrypt.hash(plain, 10);
const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

const isSecureRequest = (req) => (req.headers['x-forwarded-proto'] || '').includes('https');

const setSessionCookie = (req, res, cookieName, payload) => {
  const token = jwt.sign(payload, AUTH_SECRET, { expiresIn: SESSION_MAX_AGE_SECONDS });
  res.setHeader('Set-Cookie', cookie.serialize(cookieName, token, {
    httpOnly: true,
    secure: isSecureRequest(req),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS
  }));
};

const readSession = (req, cookieName) => {
  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies[cookieName];
  if (!token) return null;
  try {
    return jwt.verify(token, AUTH_SECRET);
  } catch (error) {
    return null;
  }
};

const requireAdminSession = (req, res) => {
  const session = readSession(req, ADMIN_COOKIE);
  if (!session || session.role !== 'admin') {
    sendJson(res, 401, { error: 'Not authenticated' });
    return null;
  }
  return session;
};

const signResetToken = (adminId) => jwt.sign({ role: 'admin-reset', id: adminId }, AUTH_SECRET, { expiresIn: RESET_TOKEN_MAX_AGE_SECONDS });

const verifyResetToken = (token) => {
  try {
    const payload = jwt.verify(token, AUTH_SECRET);
    return payload.role === 'admin-reset' ? payload : null;
  } catch (error) {
    return null;
  }
};

const requireSuperAdmin = (req, res) => {
  const session = requireAdminSession(req, res);
  if (!session) return null;
  if (session.adminRole !== 'super-admin') {
    sendJson(res, 403, { error: 'Super Admin access required' });
    return null;
  }
  return session;
};

const requireMemberSession = (req, res) => {
  const session = readSession(req, MEMBER_COOKIE);
  if (!session || session.role !== 'member') {
    sendJson(res, 401, { error: 'Not authenticated' });
    return null;
  }
  return session;
};

module.exports = {
  ADMIN_COOKIE,
  MEMBER_COOKIE,
  hashPassword,
  verifyPassword,
  setSessionCookie,
  readSession,
  requireAdminSession,
  requireSuperAdmin,
  requireMemberSession,
  signResetToken,
  verifyResetToken
};
