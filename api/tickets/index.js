const { getDb, nextSequence } = require('../_lib/db');
const { readSession, requireAdminSession, ADMIN_COOKIE, MEMBER_COOKIE } = require('../_lib/auth');
const { readJsonBody, sendJson } = require('../_lib/http');
const { COMPLAINT_CATEGORIES, REQUEST_TYPES, TICKET_STATUSES, toTicket } = require('../_lib/tickets');

const getViewer = (req) => {
  const adminSession = readSession(req, ADMIN_COOKIE);
  const isAdmin = !!(adminSession && adminSession.role === 'admin');
  const memberSession = readSession(req, MEMBER_COOKIE);
  const isMember = !!(memberSession && memberSession.role === 'member');
  return { isAdmin, isMember, memberSession };
};

module.exports = async (req, res) => {
  const db = await getDb();
  const tickets = db.collection('tickets');

  if (req.method === 'GET') {
    const { isAdmin, isMember, memberSession } = getViewer(req);
    if (!isAdmin && !isMember) {
      sendJson(res, 401, { error: 'Not authenticated' });
      return;
    }

    const query = isAdmin ? {} : { memberId: memberSession.id };
    if (req.query && req.query.kind) query.kind = req.query.kind;
    if (isAdmin && req.query && req.query.status) query.status = req.query.status;

    const docs = await tickets.find(query).sort({ createdAt: -1 }).toArray();
    sendJson(res, 200, { tickets: docs.map(toTicket) });
    return;
  }

  if (req.method === 'POST') {
    const { isMember, memberSession } = getViewer(req);
    if (!isMember) {
      sendJson(res, 401, { error: 'Not authenticated as a member' });
      return;
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid request body' });
      return;
    }

    const kind = body.kind === 'request' ? 'request' : body.kind === 'complaint' ? 'complaint' : null;
    if (!kind) {
      sendJson(res, 400, { error: 'A valid kind (complaint or request) is required' });
      return;
    }

    const validCategories = kind === 'complaint' ? COMPLAINT_CATEGORIES : REQUEST_TYPES;
    const category = (body.category || '').trim();
    if (!validCategories.includes(category)) {
      sendJson(res, 400, { error: 'A valid category is required' });
      return;
    }

    const subject = (body.subject || '').trim();
    const description = (body.description || '').trim();
    if (!subject) {
      sendJson(res, 400, { error: 'A subject is required' });
      return;
    }

    const member = await db.collection('members').findOne({ id: memberSession.id });
    if (!member) {
      sendJson(res, 404, { error: 'Member record not found' });
      return;
    }

    const id = await nextSequence(db, 'tickets');
    const now = new Date();
    const doc = {
      id,
      kind,
      category,
      subject,
      description,
      memberId: member.id,
      memberName: member.name,
      memberFlat: member.flat,
      memberWing: member.wing,
      status: 'Open',
      adminRemarks: '',
      createdAt: now,
      updatedAt: now
    };
    await tickets.insertOne(doc);
    sendJson(res, 201, { ticket: toTicket(doc) });
    return;
  }

  if (req.method === 'PUT') {
    const session = requireAdminSession(req, res);
    if (!session) return;

    const id = Number(req.query && req.query.id);
    if (!id) {
      sendJson(res, 400, { error: 'A valid ticket id is required' });
      return;
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid request body' });
      return;
    }

    const existing = await tickets.findOne({ id });
    if (!existing) {
      sendJson(res, 404, { error: 'Ticket not found' });
      return;
    }

    const status = body.status !== undefined ? String(body.status) : existing.status;
    if (!TICKET_STATUSES.includes(status)) {
      sendJson(res, 400, { error: 'A valid status is required' });
      return;
    }

    const update = {
      status,
      adminRemarks: body.adminRemarks !== undefined ? String(body.adminRemarks).trim() : existing.adminRemarks,
      updatedAt: new Date()
    };
    await tickets.updateOne({ id }, { $set: update });
    sendJson(res, 200, { ticket: toTicket({ ...existing, ...update }) });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
};
