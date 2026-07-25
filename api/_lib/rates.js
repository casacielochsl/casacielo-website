const SLOT_KEYS = { Morning: 'morning', Afternoon: 'afternoon', Evening: 'evening', 'Full Day': 'fullDay' };

const toRates = (doc) => ({
  currency: doc?.currency || 'INR',
  morning: doc?.morning ?? 0,
  afternoon: doc?.afternoon ?? 0,
  evening: doc?.evening ?? 0,
  fullDay: doc?.fullDay ?? 0
});

const rateForSlot = (rates, slot) => rates[SLOT_KEYS[slot]] ?? 0;

module.exports = { SLOT_KEYS, toRates, rateForSlot };
