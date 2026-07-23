const { getDb, nextSequence } = require('../_lib/db');
const { readSession, requireAdminSession, ADMIN_COOKIE } = require('../_lib/auth');
const { readJsonBody, sendJson } = require('../_lib/http');
const { toNotice } = require('../_lib/notices');

module.exports = async (req, res) => {
  const db = await getDb();
  const notices = db.collection('notices');

  if (req.method === 'GET') {
    // Public: only active notices (for the homepage marquee). Logged-in admins see everything.
    const adminSession = readSession(req, ADMIN_COOKIE);
    const query = adminSession && adminSession.role === 'admin' ? {} : { active: true };
    const docs = await notices.find(query).sort({ createdAt: -1 }).toArray();
    sendJson(res, 200, { notices: docs.map(toNotice) });
    return;
  }

  if (req.method === 'POST') {
    const session = requireAdminSession(req, res);
    if (!session) return;

    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid request body' });
      return;
    }

    const message = (body.message || '').trim();
    if (!message) {
      sendJson(res, 400, { error: 'Notice message is required' });
      return;
    }

    const id = await nextSequence(db, 'notices');
    const now = new Date();
    const doc = { id, message, active: true, createdAt: now, updatedAt: now };
    await notices.insertOne(doc);
    sendJson(res, 201, { notice: toNotice(doc) });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
};
