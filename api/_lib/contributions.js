const toOccasion = (doc) => ({
  id: doc.id,
  name: doc.name,
  active: !!doc.active,
  createdAt: doc.createdAt
});

const toContribution = (doc) => ({
  id: doc.id,
  occasionId: doc.occasionId,
  occasionName: doc.occasionName,
  memberId: doc.memberId,
  name: doc.name,
  flat: doc.flat,
  wing: doc.wing,
  amount: doc.amount ?? 0,
  note: doc.note || '',
  createdBy: doc.createdBy,
  createdAt: doc.createdAt
});

module.exports = { toOccasion, toContribution };
