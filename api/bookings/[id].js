const { getDb } = require('../_lib/db');
const { readSession, ADMIN_COOKIE, MEMBER_COOKIE } = require('../_lib/auth');
const { sendJson } = require('../_lib/http');

module.exports = async (req, res) => {
  if (req.method !== 'DELETE') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const idParam = (req.query && req.query.id) || req.url.split('?')[0].split('/').filter(Boolean).pop();
  const id = Number(idParam);
  if (!id) {
    sendJson(res, 400, { error: 'Invalid booking id' });
    return;
  }

  const adminSession = readSession(req, ADMIN_COOKIE);
  const isAdmin = !!(adminSession && adminSession.role === 'admin');
  const memberSession = readSession(req, MEMBER_COOKIE);
  const isMember = !!(memberSession && memberSession.role === 'member');

  if (!isAdmin && !isMember) {
    sendJson(res, 401, { error: 'Not authenticated' });
    return;
  }

  const db = await getDb();
  const bookings = db.collection('bookings');
  const existing = await bookings.findOne({ id });
  if (!existing) {
    sendJson(res, 404, { error: 'Booking not found' });
    return;
  }

  if (!isAdmin && existing.memberId !== memberSession.id) {
    sendJson(res, 403, { error: 'You can only cancel your own bookings' });
    return;
  }

  if (existing.status === 'cancelled') {
    sendJson(res, 200, { ok: true });
    return;
  }

  // Soft-cancel rather than delete: frees the slot back up (excluded from
  // conflict checks) while keeping the record + invoice visible in both
  // the admin and member dashboards.
  await bookings.updateOne({ id }, { $set: {
    status: 'cancelled',
    cancelledAt: new Date(),
    cancelledBy: isAdmin ? 'admin' : 'member'
  } });
  sendJson(res, 200, { ok: true });
};
