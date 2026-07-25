const SLOT_KEYS = { Morning: 'morning', Afternoon: 'afternoon', Evening: 'evening', 'Full Day': 'fullDay' };

const DEFAULT_SLOT_TIMES = {
  morning: { start: '09:00', end: '13:00' },
  afternoon: { start: '14:00', end: '18:00' },
  evening: { start: '18:00', end: '22:00' },
  fullDay: { start: '09:00', end: '22:00' }
};

const toSlotRate = (doc, key) => ({
  rate: doc?.[key]?.rate ?? 0,
  start: doc?.[key]?.start || DEFAULT_SLOT_TIMES[key].start,
  end: doc?.[key]?.end || DEFAULT_SLOT_TIMES[key].end
});

const toRates = (doc) => ({
  currency: doc?.currency || 'INR',
  morning: toSlotRate(doc, 'morning'),
  afternoon: toSlotRate(doc, 'afternoon'),
  evening: toSlotRate(doc, 'evening'),
  fullDay: toSlotRate(doc, 'fullDay')
});

const rateForSlot = (rates, slot) => rates[SLOT_KEYS[slot]]?.rate ?? 0;
const timeRangeForSlot = (rates, slot) => {
  const entry = rates[SLOT_KEYS[slot]];
  return entry ? `${entry.start}-${entry.end}` : '';
};

module.exports = { SLOT_KEYS, DEFAULT_SLOT_TIMES, toRates, rateForSlot, timeRangeForSlot };
