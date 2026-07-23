const { getDb } = require('../_lib/db');
const { requireAdminSession } = require('../_lib/auth');
const { readJsonBody, sendJson } = require('../_lib/http');
const { toNotice } = require('../_lib/notices');

module.exports = async (req, res) => {
  const session = requireAdminSession(req, res);
  if (!session) return;

  const idParam = (req.query && req.query.id) || req.url.split('?')[0].split('/').filter(Boolean).pop();
  const id = Number(idParam);
  if (!id) {
    sendJson(res, 400, { error: 'Invalid notice id' });
    return;
  }

  const db = await getDb();
  const notices = db.collection('notices');

  if (req.method === 'PUT') {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid request body' });
      return;
    }

    const existing = await notices.findOne({ id });
    if (!existing) {
      sendJson(res, 404, { error: 'Notice not found' });
      return;
    }

    const update = {
      message: body.message !== undefined ? String(body.message).trim() : existing.message,
      active: body.active !== undefined ? Boolean(body.active) : existing.active,
      updatedAt: new Date()
    };

    await notices.updateOne({ id }, { $set: update });
    sendJson(res, 200, { notice: toNotice({ ...existing, ...update }) });
    return;
  }

  if (req.method === 'DELETE') {
    await notices.deleteOne({ id });
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
};
