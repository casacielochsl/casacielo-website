const { getDb } = require('../lib/db');
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

  const db = await getDb();
  const doc = await db.collection('members').findOne({ id: session.id });
  if (!doc) {
    sendJson(res, 404, { error: 'Member not found' });
    return;
  }
  sendJson(res, 200, { member: toMember(doc) });
};
