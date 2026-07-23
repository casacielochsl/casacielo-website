const { getDb, nextSequence } = require('../_lib/db');
const { readSession, requireAdminSession, ADMIN_COOKIE } = require('../_lib/auth');
const { readJsonBody, sendJson } = require('../_lib/http');
const { toEvent } = require('../_lib/events');

module.exports = async (req, res) => {
  const db = await getDb();
  const events = db.collection('events');

  if (req.method === 'GET') {
    // Public: only active events (for the homepage). Logged-in admins see everything.
    const adminSession = readSession(req, ADMIN_COOKIE);
    const query = adminSession && adminSession.role === 'admin' ? {} : { active: true };
    const docs = await events.find(query).sort({ date: 1 }).toArray();
    sendJson(res, 200, { events: docs.map(toEvent) });
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

    const title = (body.title || '').trim();
    if (!title) {
      sendJson(res, 400, { error: 'Event title is required' });
      return;
    }

    const id = await nextSequence(db, 'events');
    const now = new Date();
    const doc = {
      id,
      title,
      description: (body.description || '').trim(),
      date: body.date || '',
      image: body.image || null,
      active: true,
      createdAt: now,
      updatedAt: now
    };
    await events.insertOne(doc);
    sendJson(res, 201, { event: toEvent(doc) });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
};
