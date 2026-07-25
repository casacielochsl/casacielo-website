const VALID_ROLES = ['manager', 'super-admin'];

const toAdminSummary = (doc) => ({
  id: doc._id.toString(),
  username: doc.username,
  email: doc.email || '',
  adminRole: doc.adminRole || 'manager'
});

module.exports = { VALID_ROLES, toAdminSummary };
