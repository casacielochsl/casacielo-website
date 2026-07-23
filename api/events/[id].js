const { getDb } = require('../_lib/db');
const { requireAdminSession } = require('../_lib/auth');
const { readJsonBody, sendJson } = require('../_lib/http');
const { toEvent } = require('../_lib/events');

module.exports = async (req, res) => {
  const session = requireAdminSession(req, res);
  if (!session) return;

  const idParam = (req.query && req.query.id) || req.url.split('?')[0].split('/').filter(Boolean).pop();
  const id = Number(idParam);
  if (!id) {
    sendJson(res, 400, { error: 'Invalid event id' });
    return;
  }

  const db = await getDb();
  const events = db.collection('events');

  if (req.method === 'PUT') {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid request body' });
      return;
    }

    const existing = await events.findOne({ id });
    if (!existing) {
      sendJson(res, 404, { error: 'Event not found' });
      return;
    }

    const update = {
      title: body.title !== undefined ? String(body.title).trim() : existing.title,
      description: body.description !== undefined ? String(body.description).trim() : existing.description,
      date: body.date !== undefined ? body.date : existing.date,
      image: body.image !== undefined ? body.image : existing.image,
      active: body.active !== undefined ? Boolean(body.active) : existing.active,
      updatedAt: new Date()
    };

    await events.updateOne({ id }, { $set: update });
    sendJson(res, 200, { event: toEvent({ ...existing, ...update }) });
    return;
  }

  if (req.method === 'DELETE') {
    await events.deleteOne({ id });
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
};
