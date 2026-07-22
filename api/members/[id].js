const { sql } = require('../lib/db');
const { hashPassword, requireAdminSession } = require('../lib/auth');
const { readJsonBody, sendJson } = require('../lib/http');
const { toMember, buildDetails } = require('../lib/members');

module.exports = async (req, res) => {
  const session = requireAdminSession(req, res);
  if (!session) return;

  const idParam = (req.query && req.query.id) || req.url.split('?')[0].split('/').filter(Boolean).pop();
  const id = Number(idParam);
  if (!id) {
    sendJson(res, 400, { error: 'Invalid member id' });
    return;
  }

  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM members WHERE id = ${id} LIMIT 1`;
    if (!rows[0]) {
      sendJson(res, 404, { error: 'Member not found' });
      return;
    }
    sendJson(res, 200, { member: toMember(rows[0]) });
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

    const existingRows = await sql`SELECT * FROM members WHERE id = ${id} LIMIT 1`;
    const existing = existingRows[0];
    if (!existing) {
      sendJson(res, 404, { error: 'Member not found' });
      return;
    }

    const passwordHash = body.password ? await hashPassword(body.password) : existing.password_hash;
    const details = buildDetails(body, existing.details || {});

    try {
      const rows = await sql`
        UPDATE members SET
          flat = ${body.flat ?? existing.flat},
          password_hash = ${passwordHash},
          name = ${body.name ?? existing.name},
          wing = ${body.wing ?? existing.wing},
          floor = ${body.floor ?? existing.floor},
          parking = ${body.parking ?? existing.parking},
          member_type = ${body.memberType ?? existing.member_type},
          contact = ${body.contact ?? existing.contact},
          email = ${body.email ?? existing.email},
          family = ${body.family ?? existing.family},
          occupancy_status = ${body.occupancyStatus ?? existing.occupancy_status},
          details = ${JSON.stringify(details)},
          updated_at = now()
        WHERE id = ${id}
        RETURNING *
      `;
      sendJson(res, 200, { member: toMember(rows[0]) });
    } catch (error) {
      if (error.code === '23505') {
        sendJson(res, 409, { error: `Flat ${body.flat} already exists` });
        return;
      }
      throw error;
    }
    return;
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM members WHERE id = ${id}`;
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
};
