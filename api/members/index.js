const { sql } = require('../lib/db');
const { hashPassword, requireAdminSession } = require('../lib/auth');
const { readJsonBody, sendJson } = require('../lib/http');
const { toMember, buildDetails } = require('../lib/members');

module.exports = async (req, res) => {
  const session = requireAdminSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM members ORDER BY flat ASC`;
    sendJson(res, 200, { members: rows.map(toMember) });
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

    const passwordHash = await hashPassword(body.password);
    const details = buildDetails(body, {});

    try {
      const rows = await sql`
        INSERT INTO members (
          flat, password_hash, name, wing, floor, parking,
          member_type, contact, email, family, occupancy_status, details
        )
        VALUES (
          ${body.flat}, ${passwordHash}, ${body.name || ''}, ${body.wing || ''}, ${body.floor || ''}, ${body.parking || ''},
          ${body.memberType || 'Owner'}, ${body.contact || ''}, ${body.email || ''}, ${body.family || ''}, ${body.occupancyStatus || 'Self Occupied'}, ${JSON.stringify(details)}
        )
        RETURNING *
      `;
      sendJson(res, 201, { member: toMember(rows[0]) });
    } catch (error) {
      if (error.code === '23505') {
        sendJson(res, 409, { error: `Flat ${body.flat} already exists` });
        return;
      }
      throw error;
    }
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
};
