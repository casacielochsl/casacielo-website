const { getDb } = require('../_lib/db');
const { hashPassword, requireAdminSession } = require('../_lib/auth');
const { readJsonBody, sendJson } = require('../_lib/http');
const { toMember, buildDetails, normalizeFlatKey } = require('../_lib/members');

module.exports = async (req, res) => {
  const session = requireAdminSession(req, res);
  if (!session) return;

  const idParam = (req.query && req.query.id) || req.url.split('?')[0].split('/').filter(Boolean).pop();
  const id = Number(idParam);
  if (!id) {
    sendJson(res, 400, { error: 'Invalid member id' });
    return;
  }

  const db = await getDb();
  const members = db.collection('members');

  if (req.method === 'GET') {
    const doc = await members.findOne({ id });
    if (!doc) {
      sendJson(res, 404, { error: 'Member not found' });
      return;
    }
    sendJson(res, 200, { member: toMember(doc) });
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

    const existing = await members.findOne({ id });
    if (!existing) {
      sendJson(res, 404, { error: 'Member not found' });
      return;
    }

    const flatKey = body.flat ? normalizeFlatKey(body.flat) : existing.flatKey;
    const newWing = body.wing ?? existing.wing;
    // Flat numbers only need to be unique within a wing, so re-check whenever either changes.
    if (flatKey !== existing.flatKey || newWing !== existing.wing) {
      const clash = await members.findOne({ flatKey, wing: newWing, id: { $ne: id } });
      if (clash) {
        sendJson(res, 409, { error: `Flat ${body.flat ?? existing.flat} in ${newWing} already exists` });
        return;
      }
    }

    const passwordHash = body.password ? await hashPassword(body.password) : existing.passwordHash;
    const details = buildDetails(body, existing.details || {});

    const update = {
      flat: body.flat ?? existing.flat,
      flatKey,
      passwordHash,
      name: body.name ?? existing.name,
      wing: body.wing ?? existing.wing,
      floor: body.floor ?? existing.floor,
      parking: body.parking ?? existing.parking,
      memberType: body.memberType ?? existing.memberType,
      contact: body.contact ?? existing.contact,
      email: body.email ?? existing.email,
      family: body.family ?? existing.family,
      occupancyStatus: body.occupancyStatus ?? existing.occupancyStatus,
      details,
      updatedAt: new Date()
    };

    await members.updateOne({ id }, { $set: update });
    sendJson(res, 200, { member: toMember({ ...existing, ...update }) });
    return;
  }

  if (req.method === 'DELETE') {
    await members.deleteOne({ id });
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
};
