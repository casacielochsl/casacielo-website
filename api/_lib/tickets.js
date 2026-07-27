const COMPLAINT_CATEGORIES = [
  'Plumbing',
  'Electrical',
  'Housekeeping / Cleanliness',
  'Security',
  'Parking',
  'Lift / Elevator',
  'Common Area Maintenance',
  'Water Supply',
  'Pest Control',
  'Noise / Nuisance',
  'Garden / Landscaping',
  'Other'
];

const REQUEST_TYPES = [
  'No Objection Certificate (NOC)',
  'No Dues Certificate',
  'Society Exit / Membership Transfer',
  'Maintenance Bill Deviation',
  'New Tenant Registration',
  'Tenant Deregistration',
  'Shifting Request (Move In / Move Out)',
  'Parking Allotment',
  'Renovation / Interior Work Permission',
  'Nomination Form',
  'Duplicate Share Certificate',
  'Address Proof Letter',
  'Other'
];

const TICKET_STATUSES = ['Open', 'In Progress', 'Resolved', 'Rejected', 'Closed'];

const toTicket = (doc) => ({
  id: doc.id,
  kind: doc.kind,
  category: doc.category,
  subject: doc.subject,
  description: doc.description,
  memberId: doc.memberId,
  memberName: doc.memberName,
  memberFlat: doc.memberFlat,
  memberWing: doc.memberWing,
  status: doc.status,
  adminRemarks: doc.adminRemarks || '',
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

module.exports = { COMPLAINT_CATEGORIES, REQUEST_TYPES, TICKET_STATUSES, toTicket };
