const { getDb } = require('../_lib/db');
const { requireMemberSession } = require('../_lib/auth');
const { sendJson } = require('../_lib/http');
const { toMember } = require('../_lib/members');

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
