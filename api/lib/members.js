const toMember = (row) => {
  const details = row.details || {};
  return {
    id: row.id,
    flat: row.flat,
    name: row.name || '',
    wing: row.wing || '',
    tower: row.wing || '',
    floor: row.floor || '',
    parking: row.parking || '',
    memberType: row.member_type || 'Owner',
    contact: row.contact || '',
    email: row.email || '',
    family: row.family || '',
    occupancyStatus: row.occupancy_status || 'Self Occupied',
    password: details.plainPassword || '',
    residents: details.residents || { owners: [], coOwners: [], familyMembers: [] },
    tenant: details.tenant || {},
    familyMembers: details.familyMembers || [],
    status: details.status || 'Active',
    maintenanceStatus: details.maintenanceStatus || '',
    lastPayment: details.lastPayment || '',
    nextDue: details.nextDue || '',
    visitorPass: details.visitorPass || ''
  };
};

const buildDetails = (body, existingDetails = {}) => ({
  ...existingDetails,
  plainPassword: body.password !== undefined ? body.password : existingDetails.plainPassword,
  residents: body.residents !== undefined ? body.residents : existingDetails.residents,
  tenant: body.tenant !== undefined ? body.tenant : existingDetails.tenant,
  familyMembers: body.familyMembers !== undefined ? body.familyMembers : existingDetails.familyMembers,
  status: body.status !== undefined ? body.status : existingDetails.status,
  maintenanceStatus: body.maintenanceStatus !== undefined ? body.maintenanceStatus : existingDetails.maintenanceStatus,
  lastPayment: body.lastPayment !== undefined ? body.lastPayment : existingDetails.lastPayment,
  nextDue: body.nextDue !== undefined ? body.nextDue : existingDetails.nextDue,
  visitorPass: body.visitorPass !== undefined ? body.visitorPass : existingDetails.visitorPass
});

module.exports = { toMember, buildDetails };
