const toNotice = (doc) => ({
  id: doc.id,
  message: doc.message,
  active: !!doc.active,
  createdAt: doc.createdAt
});

module.exports = { toNotice };
