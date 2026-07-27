const SLOTS = ['Morning', 'Afternoon', 'Evening', 'Full Day'];

const toBooking = (doc, viewerRole) => {
  const base = {
    id: doc.id,
    date: doc.date,
    slot: doc.slot,
    memberName: doc.memberName,
    memberFlat: doc.memberFlat,
    memberWing: doc.memberWing || '',
    memberId: doc.memberId,
    purpose: doc.purpose || '',
    amount: doc.amount ?? 0,
    currency: doc.currency || 'INR',
    timeRange: doc.timeRange || '',
    bookedBy: doc.bookedBy || 'member',
    createdAt: doc.createdAt
  };
  if (viewerRole === 'admin') {
    base.memberEmail = doc.memberEmail;
    base.memberContact = doc.memberContact;
  }
  return base;
};

// Full Day blocks everything else that date; any named slot blocks Full Day
// and a duplicate of itself, but leaves the other named slots open.
const hasConflict = (existingBookingsForDate, requestedSlot) => {
  if (existingBookingsForDate.some((booking) => booking.slot === 'Full Day')) return true;
  if (requestedSlot === 'Full Day') return existingBookingsForDate.length > 0;
  return existingBookingsForDate.some((booking) => booking.slot === requestedSlot);
};

module.exports = { SLOTS, toBooking, hasConflict };
