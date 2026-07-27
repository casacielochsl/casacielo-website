const { getDb, nextSequence } = require('../_lib/db');
const { readSession, requireAdminSession, ADMIN_COOKIE, MEMBER_COOKIE } = require('../_lib/auth');
const { readJsonBody, sendJson } = require('../_lib/http');
const { SLOTS, toBooking, hasConflict } = require('../_lib/bookings');
const { toRates, rateForSlot, timeRangeForSlot, DEFAULT_SLOT_TIMES } = require('../_lib/rates');
const { sendBookingConfirmationEmail, sendBookingManagerNotificationEmail } = require('../_lib/mailer');

const RATES_ID = 'hallRates';

const requireAnySession = (req, res) => {
  const adminSession = readSession(req, ADMIN_COOKIE);
  if (adminSession && adminSession.role === 'admin') return 'admin';
  const memberSession = readSession(req, MEMBER_COOKIE);
  if (memberSession && memberSession.role === 'member') return 'member';
  sendJson(res, 401, { error: 'Not authenticated' });
  return null;
};

module.exports = async (req, res) => {
  const db = await getDb();
  const bookings = db.collection('bookings');

  // Rate card lives on this same route (as ?resource=rates) to avoid adding
  // another Vercel function file — Hobby plan caps at 12 and this project
  // was already at 11 before this feature.
  if (req.query && req.query.resource === 'rates') {
    if (req.method === 'GET') {
      const doc = await db.collection('settings').findOne({ _id: RATES_ID });
      sendJson(res, 200, { rates: toRates(doc) });
      return;
    }

    if (req.method === 'PUT') {
      const session = requireAdminSession(req, res);
      if (!session) return;

      let body;
      try {
        body = await readJsonBody(req);
      } catch (error) {
        sendJson(res, 400, { error: 'Invalid request body' });
        return;
      }

      const toNonNegativeNumber = (value) => {
        const num = Number(value);
        return Number.isFinite(num) && num >= 0 ? num : 0;
      };
      const isValidTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '');
      const toSlotUpdate = (slotBody, key) => ({
        rate: toNonNegativeNumber(slotBody && slotBody.rate),
        start: isValidTime(slotBody && slotBody.start) ? slotBody.start : DEFAULT_SLOT_TIMES[key].start,
        end: isValidTime(slotBody && slotBody.end) ? slotBody.end : DEFAULT_SLOT_TIMES[key].end
      });

      const update = {
        currency: (body.currency || 'INR').trim(),
        morning: toSlotUpdate(body.morning, 'morning'),
        afternoon: toSlotUpdate(body.afternoon, 'afternoon'),
        evening: toSlotUpdate(body.evening, 'evening'),
        fullDay: toSlotUpdate(body.fullDay, 'fullDay')
      };

      await db.collection('settings').updateOne({ _id: RATES_ID }, { $set: update }, { upsert: true });
      sendJson(res, 200, { rates: toRates(update) });
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  if (req.method === 'GET') {
    const viewerRole = requireAnySession(req, res);
    if (!viewerRole) return;
    const docs = await bookings.find().sort({ date: 1 }).toArray();
    sendJson(res, 200, { bookings: docs.map((doc) => toBooking(doc, viewerRole)) });
    return;
  }

  if (req.method === 'POST') {
    const adminSession = readSession(req, ADMIN_COOKIE);
    const isAdmin = !!(adminSession && adminSession.role === 'admin');
    const memberSession = readSession(req, MEMBER_COOKIE);
    const isMember = !!(memberSession && memberSession.role === 'member');

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

    const date = (body.date || '').trim();
    const slot = body.slot;
    const purpose = (body.purpose || '').trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      sendJson(res, 400, { error: 'A valid date (YYYY-MM-DD) is required' });
      return;
    }
    if (!SLOTS.includes(slot)) {
      sendJson(res, 400, { error: 'A valid slot is required' });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (date < today) {
      sendJson(res, 400, { error: 'Cannot book a date in the past' });
      return;
    }

    const existingForDate = await bookings.find({ date }).toArray();
    if (hasConflict(existingForDate, slot)) {
      sendJson(res, 409, { error: 'That slot is no longer available for the selected date' });
      return;
    }

    let member;
    if (isMember) {
      member = await db.collection('members').findOne({ id: memberSession.id });
    } else {
      const targetMemberId = Number(body.memberId);
      if (!targetMemberId) {
        sendJson(res, 400, { error: 'A member must be selected for this booking' });
        return;
      }
      member = await db.collection('members').findOne({ id: targetMemberId });
    }
    if (!member) {
      sendJson(res, 404, { error: 'Member record not found' });
      return;
    }

    const ratesDoc = await db.collection('settings').findOne({ _id: RATES_ID });
    const rates = toRates(ratesDoc);
    const amount = rateForSlot(rates, slot);
    const timeRange = timeRangeForSlot(rates, slot);

    const id = await nextSequence(db, 'bookings');
    const now = new Date();
    const doc = {
      id,
      date,
      slot,
      timeRange,
      memberId: member.id,
      memberName: member.name,
      memberFlat: member.flat,
      memberWing: member.wing,
      memberEmail: member.email,
      memberContact: member.contact,
      purpose,
      amount,
      currency: rates.currency,
      bookedBy: isAdmin ? 'admin' : 'member',
      createdAt: now,
      updatedAt: now
    };
    await bookings.insertOne(doc);

    const managerEmail = process.env.HALL_MANAGER_EMAIL || 'manishtiwari@outlook.in';
    try {
      if (member.email) {
        await sendBookingConfirmationEmail({
          to: member.email, memberName: member.name, flat: member.flat, wing: member.wing, date, slot, purpose, timeRange,
          amount, currency: rates.currency, invoiceNo: id
        });
      }
      await sendBookingManagerNotificationEmail({
        to: managerEmail, memberName: member.name, flat: member.flat, wing: member.wing, date, slot, purpose, timeRange,
        contact: member.contact, email: member.email, amount, currency: rates.currency, invoiceNo: id
      });
    } catch (error) {
      console.error('Failed to send booking emails:', error);
    }

    sendJson(res, 201, { booking: toBooking(doc, 'member') });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
};
