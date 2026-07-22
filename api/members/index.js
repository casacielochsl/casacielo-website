const { getDb, nextSequence } = require('../lib/db');
const { hashPassword, requireAdminSession } = require('../lib/auth');
const { readJsonBody, sendJson } = require('../lib/http');
const { toMember, buildDetails, normalizeFlatKey } = require('../lib/members');

module.exports = async (req, res) => {
  const session = requireAdminSession(req, res);
  if (!session) return;

  const db = await getDb();
  const members = db.collection('members');

  if (req.method === 'GET') {
    const docs = await members.find().sort({ flat: 1 }).toArray();
    sendJson(res, 200, { members: docs.map(toMember) });
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

    if (!body.flat || !body.password) {
      sendJson(res, 400, { error: 'Flat number and password are required' });
      return;
    }

    const flatKey = normalizeFlatKey(body.flat);
    const clash = await members.findOne({ flatKey });
    if (clash) {
      sendJson(res, 409, { error: `Flat ${body.flat} already exists` });
      return;
    }

    const passwordHash = await hashPassword(body.password);
    const details = buildDetails(body, {});
    const id = await nextSequence(db, 'members');
    const now = new Date();

    const doc = {
      id,
      flat: body.flat,
      flatKey,
      passwordHash,
      name: body.name || '',
      wing: body.wing || '',
      floor: body.floor || '',
      parking: body.parking || '',
      memberType: body.memberType || 'Owner',
      contact: body.contact || '',
      email: body.email || '',
      family: body.family || '',
      occupancyStatus: body.occupancyStatus || 'Self Occupied',
      details,
      createdAt: now,
      updatedAt: now
    };

    await members.insertOne(doc);
    sendJson(res, 201, { member: toMember(doc) });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
};
