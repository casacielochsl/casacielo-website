const { sql } = require('../lib/db');
const { verifyPassword, setSessionCookie, MEMBER_COOKIE } = require('../lib/auth');
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

  const flat = (body.flat || '').trim();
  const password = body.password || '';

  if (!flat || !password) {
    sendJson(res, 400, { error: 'Flat number and password are required' });
    return;
  }

  const rows = await sql`SELECT id, flat, password_hash FROM members WHERE lower(flat) = lower(${flat}) LIMIT 1`;
  const member = rows[0];

  if (!member || !(await verifyPassword(password, member.password_hash))) {
    sendJson(res, 401, { error: 'Invalid flat number or password' });
    return;
  }

  setSessionCookie(req, res, MEMBER_COOKIE, { role: 'member', id: member.id, flat: member.flat });
  sendJson(res, 200, { ok: true, flat: member.flat });
};
