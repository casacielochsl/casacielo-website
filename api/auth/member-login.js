const { getDb } = require('../_lib/db');
const { verifyPassword, setSessionCookie, MEMBER_COOKIE } = require('../_lib/auth');
const { readJsonBody, sendJson } = require('../_lib/http');
const { normalizeFlatKey } = require('../_lib/members');

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
