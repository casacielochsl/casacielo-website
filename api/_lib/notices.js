const toNotice = (doc) => ({
  id: doc.id,
  message: doc.message,
  date: doc.date || '',
  active: !!doc.active,
  createdAt: doc.createdAt
});

module.exports = { toNotice };
