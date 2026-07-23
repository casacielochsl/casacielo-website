const toEvent = (doc) => ({
  id: doc.id,
  title: doc.title,
  description: doc.description || '',
  date: doc.date || '',
  image: doc.image || null,
  active: !!doc.active,
  createdAt: doc.createdAt
});

module.exports = { toEvent };
