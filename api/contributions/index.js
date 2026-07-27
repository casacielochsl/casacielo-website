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
    // The member dashboard's "My Contributions" list always sends
    // ?scope=me — honor that even when the viewer's browser also carries
    // an admin session cookie (an admin who is also a registered member
    // would otherwise see every resident's contributions on their own
    // "My Contributions" list, since cookie-presence alone can't tell
    // which dashboard the request came from).
    const ownOnly = !isAdmin || (req.query && req.query.scope === 'me');
    const query = ownOnly ? { memberId: memberSession.id } : {};
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

    // The admin's manual-entry form always sends `name` explicitly; the
    // member's own contribution form never does. Use that as the intent
    // signal rather than "is this browser's member cookie present" — an
    // admin who is also a registered member could have both session
    // cookies at once, and cookie-presence alone would silently attribute
    // a manual entry to the admin's own member profile instead.
    if (body.name !== undefined) {
      if (!isAdmin) {
        sendJson(res, 403, { error: 'Only an admin can log a manual contribution' });
        return;
      }
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
    } else {
      if (!isMember) {
        sendJson(res, 401, { error: 'Not authenticated as a member' });
        return;
      }
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
    }

    await contributions.insertOne(doc);
    sendJson(res, 201, { contribution: toContribution(doc) });
    return;
  }

  if (req.method === 'PUT') {
    const session = requireAdminSession(req, res);
    if (!session) return;
    const id = Number(req.query && req.query.id);
    if (!id) {
      sendJson(res, 400, { error: 'A valid contribution id is required' });
      return;
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid request body' });
      return;
    }

    const existing = await contributions.findOne({ id });
    if (!existing) {
      sendJson(res, 404, { error: 'Contribution not found' });
      return;
    }

    let occasionName = existing.occasionName;
    let occasionId = existing.occasionId;
    if (body.occasionId !== undefined) {
      const newOccasionId = Number(body.occasionId);
      const occasion = await db.collection('occasions').findOne({ id: newOccasionId });
      if (!occasion) {
        sendJson(res, 404, { error: 'Occasion not found' });
        return;
      }
      occasionId = newOccasionId;
      occasionName = occasion.name;
    }

    const amount = body.amount !== undefined ? Number(body.amount) : existing.amount;
    if (!Number.isFinite(amount) || amount <= 0) {
      sendJson(res, 400, { error: 'A valid contribution amount is required' });
      return;
    }

    const update = {
      occasionId,
      occasionName,
      name: body.name !== undefined ? String(body.name).trim() : existing.name,
      flat: body.flat !== undefined ? String(body.flat).trim() : existing.flat,
      wing: body.wing !== undefined ? String(body.wing).trim() : existing.wing,
      amount,
      note: body.note !== undefined ? String(body.note).trim() : existing.note
    };

    await contributions.updateOne({ id }, { $set: update });
    sendJson(res, 200, { contribution: toContribution({ ...existing, ...update }) });
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
