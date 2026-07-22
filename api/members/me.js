const { sql } = require('../lib/db');
const { requireMemberSession } = require('../lib/auth');
const { sendJson } = require('../lib/http');
const { toMember } = require('../lib/members');

module.exports = async (req, res) => {
  const session = requireMemberSession(req, res);
  if (!session) return;

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const rows = await sql`SELECT * FROM members WHERE id = ${session.id} LIMIT 1`;
  if (!rows[0]) {
    sendJson(res, 404, { error: 'Member not found' });
    return;
  }
  sendJson(res, 200, { member: toMember(rows[0]) });
};
