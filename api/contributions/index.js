const { getDb, nextSequence } = require('../_lib/db');
const { readSession, requireAdminSession, ADMIN_COOKIE, MEMBER_COOKIE } = require('../_lib/auth');
const { readJsonBody, sendJson } = require('../_lib/http');
const { toOccasion, toContribution } = require('../_lib/contributions');

const getViewer = (req) => {
  const adminSession = readSession(req, ADMIN_COOKIE);
  const isAdmin = !!(adminSession && adminSession.role === 'admin');
  const memberSession = readSession(req, MEMBER_COOKIE);
  const isMember = !!(memberSession && memberSession.role === 'member');
  return { isAdmin, isMember, memberSession };
};

module.exports = async (req, res) => {
  const db = await getDb();

  // Occasions live on this same route (?resource=occasions) to avoid adding
  // another Vercel function file — Hobby plan caps at 12 and this project
  // was already at 11 before this feature.
  if (req.query && req.query.resource === 'occasions') {
    const occasions = db.collection('occasions');

    if (req.method === 'GET') {
      const { isAdmin, isMember } = getViewer(req);
      if (!isAdmin && !isMember) {
        sendJson(res, 401, { error: 'Not authenticated' });
        return;
      }
      const query = isAdmin ? {} : { active: true };
      const docs = await occasions.find(query).sort({ createdAt: -1 }).toArray();
      sendJson(res, 200, { occasions: docs.map(toOccasion) });
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

      const name = (body.name || '').trim();
      if (!name) {
        sendJson(res, 400, { error: 'Occasion name is required' });
        return;
      }

      const id = await nextSequence(db, 'occasions');
      const now = new Date();
      const doc = { id, name, active: true, createdAt: now };
      await occasions.insertOne(doc);
      sendJson(res, 201, { occasion: toOccasion(doc) });
      return;
    }

    const occasionId = Number(req.query.id);

    if (req.method === 'PUT') {
      const session = requireAdminSession(req, res);
      if (!session) return;
      if (!occasionId) {
        sendJson(res, 400, { error: 'A valid occasion id is required' });
        return;
      }

      let body;
      try {
        body = await readJsonBody(req);
      } catch (error) {
        sendJson(res, 400, { error: 'Invalid request body' });
        return;
      }

      const existing = await occasions.findOne({ id: occasionId });
      if (!existing) {
        sendJson(res, 404, { error: 'Occasion not found' });
        return;
      }

      const update = {
        name: body.name !== undefined ? String(body.name).trim() : existing.name,
        active: body.active !== undefined ? Boolean(body.active) : existing.active
      };
      await occasions.updateOne({ id: occasionId }, { $set: update });
      sendJson(res, 200, { occasion: toOccasion({ ...existing, ...update }) });
      return;
    }

    if (req.method === 'DELETE') {
      const session = requireAdminSession(req, res);
      if (!session) return;
      if (!occasionId) {
        sendJson(res, 400, { error: 'A valid occasion id is required' });
        return;
      }
      await occasions.deleteOne({ id: occasionId });
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  // --- Contributions ---
  const contributions = db.collection('contributions');

  if (req.method === 'GET') {
    const { isAdmin, isMember, memberSession } = getViewer(req);
    if (!isAdmin && !isMember) {
      sendJson(res, 401, { error: 'Not authenticated' });
      return;
    }
    const query = isAdmin ? {} : { memberId: memberSession.id };
    const docs = await contributions.find(query).sort({ createdAt: -1 }).toArray();
    sendJson(res, 200, { contributions: docs.map(toContribution) });
    return;
  }

  if (req.method === 'POST') {
    const { isAdmin, isMember, memberSession } = getViewer(req);
    if (!isAdmin && !isMember) {
      sendJson(res, 401, { error: 'Not authenticated' });
      return;
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid request body' });
      return;
    }

    const occasionId = Number(body.occasionId);
    const amount = Number(body.amount);
    const note = (body.note || '').trim();

    if (!occasionId) {
      sendJson(res, 400, { error: 'An occasion must be selected' });
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      sendJson(res, 400, { error: 'A valid contribution amount is required' });
      return;
    }

    const occasion = await db.collection('occasions').findOne({ id: occasionId });
    if (!occasion) {
      sendJson(res, 404, { error: 'Occasion not found' });
      return;
    }

    const id = await nextSequence(db, 'contributions');
    const now = new Date();
    let doc;

    if (isMember) {
      const member = await db.collection('members').findOne({ id: memberSession.id });
      if (!member) {
        sendJson(res, 404, { error: 'Member record not found' });
        return;
      }
      doc = {
        id, occasionId, occasionName: occasion.name,
        memberId: member.id, name: member.name, flat: member.flat, wing: member.wing,
        amount, note, createdBy: 'member', createdAt: now
      };
    } else {
      const name = (body.name || '').trim();
      const flat = (body.flat || '').trim();
      const wing = (body.wing || '').trim();
      if (!name || !flat || !wing) {
        sendJson(res, 400, { error: 'Name, flat, and wing are required' });
        return;
      }
      doc = {
        id, occasionId, occasionName: occasion.name,
        memberId: null, name, flat, wing,
        amount, note, createdBy: 'admin', createdAt: now
      };
    }

    await contributions.insertOne(doc);
    sendJson(res, 201, { contribution: toContribution(doc) });
    return;
  }

  if (req.method === 'DELETE') {
    const session = requireAdminSession(req, res);
    if (!session) return;
    const id = Number(req.query && req.query.id);
    if (!id) {
      sendJson(res, 400, { error: 'A valid contribution id is required' });
      return;
    }
    await contributions.deleteOne({ id });
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
};
