const { getDb, nextSequence } = require('../_lib/db');
const { readSession, ADMIN_COOKIE, MEMBER_COOKIE } = require('../_lib/auth');
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

    // The member dashboard always sends ?scope=me — honor that even when
    // the viewer's browser also carries an admin session cookie, so an
    // admin who is also a registered member doesn't see every resident's
    // tickets on their own "My Complaints"/"My Requests" list.
    const ownOnly = !isAdmin || (req.query && req.query.scope === 'me');
    const query = ownOnly ? { memberId: memberSession.id } : {};
    if (req.query && req.query.kind) query.kind = req.query.kind;
    if (!ownOnly && req.query && req.query.status) query.status = req.query.status;

    const viewerRole = ownOnly ? 'member' : 'admin';
    const docs = await tickets.find(query).sort({ createdAt: -1 }).toArray();
    sendJson(res, 200, { tickets: docs.map((doc) => toTicket(doc, viewerRole)) });
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

    let attachment = null;
    if (body.attachment && typeof body.attachment.dataUrl === 'string') {
      if (body.attachment.dataUrl.length > 6_000_000) {
        sendJson(res, 400, { error: 'Attachment is too large (max ~4MB)' });
        return;
      }
      attachment = {
        name: String(body.attachment.name || 'attachment').slice(0, 200),
        type: String(body.attachment.type || '').slice(0, 100),
        dataUrl: body.attachment.dataUrl
      };
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
      attachment,
      memberId: member.id,
      memberName: member.name,
      memberFlat: member.flat,
      memberWing: member.wing,
      status: 'Open',
      adminRemarks: '',
      cost: null,
      costBorneBy: null,
      memberAccepted: false,
      memberAcceptedAt: null,
      history: [{ status: 'Open', adminRemarks: '', cost: null, costBorneBy: null, actor: 'member', at: now }],
      createdAt: now,
      updatedAt: now
    };
    await tickets.insertOne(doc);
    sendJson(res, 201, { ticket: toTicket(doc, 'member') });
    return;
  }

  if (req.method === 'PUT') {
    const id = Number(req.query && req.query.id);
    if (!id) {
      sendJson(res, 400, { error: 'A valid ticket id is required' });
      return;
    }

    const { isAdmin, isMember, memberSession } = getViewer(req);
    if (!isAdmin && !isMember) {
      sendJson(res, 401, { error: 'Not authenticated' });
      return;
    }

    const existing = await tickets.findOne({ id });
    if (!existing) {
      sendJson(res, 404, { error: 'Ticket not found' });
      return;
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid request body' });
      return;
    }

    // A member can only acknowledge a cost already assigned to them by an
    // admin — never change the status, remarks, or cost themselves.
    if (isMember) {
      if (existing.memberId !== memberSession.id) {
        sendJson(res, 403, { error: 'You can only act on your own ticket' });
        return;
      }
      if (body.action !== 'accept') {
        sendJson(res, 403, { error: 'Only an admin can update this ticket' });
        return;
      }
      if (existing.costBorneBy !== 'Member' || !(existing.cost > 0)) {
        sendJson(res, 400, { error: 'There is nothing to accept on this ticket' });
        return;
      }
      const now = new Date();
      const update = {
        memberAccepted: true,
        memberAcceptedAt: now,
        updatedAt: now,
        history: [...(existing.history || []), {
          status: existing.status, adminRemarks: existing.adminRemarks, cost: existing.cost,
          costBorneBy: existing.costBorneBy, actor: 'member', at: now
        }]
      };
      await tickets.updateOne({ id }, { $set: update });
      sendJson(res, 200, { ticket: toTicket({ ...existing, ...update }, 'member') });
      return;
    }

    const status = body.status !== undefined ? String(body.status) : existing.status;
    if (!TICKET_STATUSES.includes(status)) {
      sendJson(res, 400, { error: 'A valid status is required' });
      return;
    }

    const costBorneBy = body.costBorneBy !== undefined ? (body.costBorneBy || null) : (existing.costBorneBy || null);
    if (costBorneBy !== null && !['Society', 'Member'].includes(costBorneBy)) {
      sendJson(res, 400, { error: 'Cost Borne By must be Society or Member' });
      return;
    }
    const cost = body.cost !== undefined ? (body.cost === '' || body.cost === null ? null : Number(body.cost)) : (existing.cost ?? null);
    if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
      sendJson(res, 400, { error: 'A valid cost is required' });
      return;
    }

    // Any change to who pays (or how much) needs a fresh acceptance from
    // the member before the ticket can be closed against it.
    const costUnchanged = existing.costBorneBy === costBorneBy && existing.cost === cost;
    const memberAccepted = costUnchanged ? !!existing.memberAccepted : false;

    if (status === 'Closed' && costBorneBy === 'Member' && !memberAccepted) {
      sendJson(res, 400, { error: 'Member must accept the cost before this ticket can be closed' });
      return;
    }

    const adminRemarks = body.adminRemarks !== undefined ? String(body.adminRemarks).trim() : existing.adminRemarks;
    const now = new Date();
    const update = {
      status,
      adminRemarks,
      cost,
      costBorneBy,
      memberAccepted,
      memberAcceptedAt: memberAccepted ? existing.memberAcceptedAt : null,
      updatedAt: now,
      history: [...(existing.history || []), { status, adminRemarks, cost, costBorneBy, actor: 'admin', at: now }]
    };
    await tickets.updateOne({ id }, { $set: update });
    sendJson(res, 200, { ticket: toTicket({ ...existing, ...update }, 'admin') });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
};
