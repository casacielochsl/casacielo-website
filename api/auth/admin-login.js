const { sql } = require('../lib/db');
const { verifyPassword, setSessionCookie, ADMIN_COOKIE } = require('../lib/auth');
const { readJsonBody, sendJson } = require('../lib/http');

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
  const password = body.password || '';

  if (!username || !password) {
    sendJson(res, 400, { error: 'Username and password are required' });
    return;
  }

  const rows = await sql`SELECT id, username, password_hash FROM admins WHERE username = ${username} LIMIT 1`;
  const admin = rows[0];

  if (!admin || !(await verifyPassword(password, admin.password_hash))) {
    sendJson(res, 401, { error: 'Invalid admin credentials' });
    return;
  }

  setSessionCookie(req, res, ADMIN_COOKIE, { role: 'admin', sub: admin.username, id: admin.id });
  sendJson(res, 200, { ok: true });
};
