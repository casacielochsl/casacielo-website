const { getDb } = require('../_lib/db');
const { verifyPassword, setSessionCookie, ADMIN_COOKIE } = require('../_lib/auth');
const { readJsonBody, sendJson } = require('../_lib/http');

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

  const db = await getDb();
  const admin = await db.collection('admins').findOne({ username });

  if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
    sendJson(res, 401, { error: 'Invalid admin credentials' });
    return;
  }

  setSessionCookie(req, res, ADMIN_COOKIE, { role: 'admin', sub: admin.username, id: admin._id.toString() });
  sendJson(res, 200, { ok: true });
};
