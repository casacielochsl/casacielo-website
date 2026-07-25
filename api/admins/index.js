const { ObjectId } = require('mongodb');
const { getDb } = require('../_lib/db');
const { hashPassword, requireSuperAdmin } = require('../_lib/auth');
const { readJsonBody, sendJson } = require('../_lib/http');
const { VALID_ROLES, toAdminSummary } = require('../_lib/admins');

module.exports = async (req, res) => {
  const session = requireSuperAdmin(req, res);
  if (!session) return;

  const db = await getDb();
  const admins = db.collection('admins');

  if (req.method === 'GET') {
    const docs = await admins.find().sort({ username: 1 }).toArray();
    sendJson(res, 200, { admins: docs.map(toAdminSummary) });
    return;
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid request body' });
      return;
    }

    const username = (body.username || '').trim();
    const password = body.password || '';
    const email = (body.email || '').trim();
    const adminRole = VALID_ROLES.includes(body.adminRole) ? body.adminRole : 'manager';

    if (!username || !password) {
      sendJson(res, 400, { error: 'Username and password are required' });
      return;
    }

    const existing = await admins.findOne({ username });
    if (existing) {
      sendJson(res, 409, { error: `Admin username '${username}' already exists` });
      return;
    }

    const passwordHash = await hashPassword(password);
    const doc = { username, passwordHash, email, adminRole };
    const result = await admins.insertOne(doc);
    sendJson(res, 201, { admin: toAdminSummary({ ...doc, _id: result.insertedId }) });
    return;
  }

  const idParam = req.query && req.query.id;
  let targetId;
  try {
    targetId = new ObjectId(idParam);
  } catch (error) {
    sendJson(res, 400, { error: 'A valid admin id is required (?id=)' });
    return;
  }

  if (req.method === 'PUT') {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid request body' });
      return;
    }

    const existing = await admins.findOne({ _id: targetId });
    if (!existing) {
      sendJson(res, 404, { error: 'Admin not found' });
      return;
    }

    const update = {
      email: body.email !== undefined ? String(body.email).trim() : existing.email,
      adminRole: VALID_ROLES.includes(body.adminRole) ? body.adminRole : existing.adminRole
    };

    if (update.adminRole !== 'super-admin' && existing.adminRole === 'super-admin') {
      const superAdminCount = await admins.countDocuments({ adminRole: 'super-admin' });
      if (superAdminCount <= 1) {
        sendJson(res, 400, { error: 'Cannot demote the last remaining Super Admin' });
        return;
      }
    }

    await admins.updateOne({ _id: targetId }, { $set: update });
    sendJson(res, 200, { admin: toAdminSummary({ ...existing, ...update }) });
    return;
  }

  if (req.method === 'DELETE') {
    if (targetId.toString() === session.id) {
      sendJson(res, 400, { error: 'You cannot delete your own admin account' });
      return;
    }

    const existing = await admins.findOne({ _id: targetId });
    if (!existing) {
      sendJson(res, 404, { error: 'Admin not found' });
      return;
    }

    if (existing.adminRole === 'super-admin') {
      const superAdminCount = await admins.countDocuments({ adminRole: 'super-admin' });
      if (superAdminCount <= 1) {
        sendJson(res, 400, { error: 'Cannot delete the last remaining Super Admin' });
        return;
      }
    }

    await admins.deleteOne({ _id: targetId });
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
};
