const { getDb, nextSequence } = require('../_lib/db');
const { readSession, requireAdminSession, ADMIN_COOKIE } = require('../_lib/auth');
const { readJsonBody, sendJson } = require('../_lib/http');
const { toNotice } = require('../_lib/notices');

module.exports = async (req, res) => {
  const db = await getDb();
  const notices = db.collection('notices');

  if (req.method === 'GET') {
    // Public: only active, not-yet-expired notices (for the homepage marquee).
    // Logged-in admins see everything, including expired/inactive, for management.
    const adminSession = readSession(req, ADMIN_COOKIE);
    const isAdmin = adminSession && adminSession.role === 'admin';
    const today = new Date().toISOString().slice(0, 10);
    const query = isAdmin ? {} : { active: true, $or: [{ date: '' }, { date: { $gte: today } }] };
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
    const doc = { id, message, date: body.date || '', active: true, createdAt: now, updatedAt: now };
    await notices.insertOne(doc);
    sendJson(res, 201, { notice: toNotice(doc) });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
};
