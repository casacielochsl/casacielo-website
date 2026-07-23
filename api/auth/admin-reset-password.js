const { ObjectId } = require('mongodb');
const { getDb } = require('../_lib/db');
const { hashPassword, verifyResetToken } = require('../_lib/auth');
const { readJsonBody, sendJson } = require('../_lib/http');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { error: 'Invalid request body' });
    return;
  }

  const { token, password } = body;

  if (!token || !password || password.length < 6) {
    sendJson(res, 400, { error: 'A valid token and a password of at least 6 characters are required' });
    return;
  }

  const payload = verifyResetToken(token);
  if (!payload) {
    sendJson(res, 401, { error: 'This reset link is invalid or has expired' });
    return;
  }

  let objectId;
  try {
    objectId = new ObjectId(payload.id);
  } catch (error) {
    sendJson(res, 401, { error: 'This reset link is invalid or has expired' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const db = await getDb();
  await db.collection('admins').updateOne({ _id: objectId }, { $set: { passwordHash } });

  sendJson(res, 200, { ok: true });
};
