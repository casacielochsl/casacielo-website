const STORAGE_KEY = 'casaCieloMembers';
const defaultMembers = [
  {
    id: 1,
    flat: 'A-101',
    name: 'Mr. Harsh Verma',
    wing: 'A Wing',
    floor: '1st Floor',
    status: 'Active',
    contact: '+91 8657871340',
    email: 'harsh.verma@example.com',
    memberType: 'Owner',
    familyMembers: [
      { name: 'Mrs. Neha Verma', relation: 'Spouse', age: '34 years', type: 'Family Member' },
      { name: 'Kavya Verma', relation: 'Daughter', age: '8 years', type: 'Family Member' }
    ]
  },
  {
    id: 2,
    flat: 'A-102',
    name: 'Ms. Priya Sharma',
    wing: 'A Wing',
    floor: '1st Floor',
    status: 'Reminder Sent',
    contact: '+91 9876543210',
    email: 'priya.sharma@example.com',
    memberType: 'Co-Owner',
    familyMembers: [
      { name: 'Mr. Rahul Sharma', relation: 'Spouse', age: '38 years', type: 'Family Member' },
      { name: 'Aarav Sharma', relation: 'Son', age: '6 years', type: 'Family Member' }
    ]
  },
  {
    id: 3,
    flat: 'B-205',
    name: 'Mr. Rohan Patel',
    wing: 'B Wing',
    floor: '2nd Floor',
    status: 'Active',
    contact: '+91 9999988888',
    email: 'rohan.patel@example.com',
    memberType: 'Family Member',
    familyMembers: [
      { name: 'Mrs. Pooja Patel', relation: 'Spouse', age: '35 years', type: 'Family Member' }
    ]
  }
];

const loadMembers = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Unable to load saved members:', error);
  }
  return defaultMembers;
};

const params = new URLSearchParams(window.location.search);
const flat = params.get('flat');
const members = loadMembers();
const member = flat ? members.find((item) => item.flat.toUpperCase() === flat.toUpperCase()) : null;

const setText = (id, value) => {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
};

if (member) {
  setText('primaryName', member.name || member.primaryName || 'Member');
  setText('detailFlat', member.flat || '-');
  setText('detailWing', member.wing || '-');
  setText('detailFloor', member.floor || '-');
  setText('detailMemberType', member.memberType || 'Owner');
  setText('detailStatus', member.status || 'Active');
  setText('detailPhone', member.contact || member.phone || '-');
  setText('detailEmail', member.email || '-');

  const familyContainer = document.getElementById('familyMembers');
  if (familyContainer) {
    const residentRows = [
      {
        name: member.name || member.primaryName || 'Member',
        role: member.memberType || 'Owner',
        contact: member.contact || member.phone || '-',
        details: member.email || '-'
      },
      ...(Array.isArray(member.familyMembers) && member.familyMembers.length
        ? member.familyMembers.map((person) => ({
            name: person.name || '-',
            role: person.relation || person.type || 'Family Member',
            contact: person.contact || '-',
            details: person.age ? `${person.age}${person.type ? ` • ${person.type}` : ''}` : (person.type || 'Family Member')
          }))
        : (member.family ? member.family.split(',').map((entry) => ({
            name: entry.trim(),
            role: 'Family Member',
            contact: '-',
            details: 'Family Member'
          })) : []))
    ];

    familyContainer.innerHTML = `
      <div class="occupant-row occupant-row-head">
        <span>Name</span>
        <span>Role</span>
        <span>Contact</span>
        <span>Details</span>
      </div>
      ${residentRows.map((person) => `
        <div class="occupant-row">
          <strong>${person.name}</strong>
          <span>${person.role}</span>
          <span>${person.contact}</span>
          <span>${person.details}</span>
        </div>
      `).join('')}
    `;
  }

  const tenantContainer = document.getElementById('tenantSection');
  if (tenantContainer) {
    const tenant = member.tenant || null;
    if (!tenant || (!tenant.name && !tenant.contact && !tenant.email && !tenant.details && !(tenant.members || []).length && !(tenant.documents && Object.keys(tenant.documents).length))) {
      tenantContainer.innerHTML = '<div class="tenant-item">No tenant details recorded.</div>';
    } else {
      const docEntries = Object.entries(tenant.documents || {});
      tenantContainer.innerHTML = `
        <div class="tenant-item">
          <strong>${tenant.name || 'Tenant'}</strong><br />
          <span>Contact: ${tenant.contact || '—'}</span><br />
          <span>Email: ${tenant.email || '—'}</span><br />
          <span>Rent From: ${tenant.rentFrom || '—'}</span><br />
          <span>Agreement End: ${tenant.agreementEnd || '—'}</span><br />
          <span>Notes: ${tenant.details || '—'}</span>
          ${Array.isArray(tenant.renewals) && tenant.renewals.length ? `
            <div style="margin-top: 0.7rem;"><strong>Renewal History</strong></div>
            <div class="family-list">
              ${tenant.renewals.map((item) => `
                <div class="family-item">
                  <strong>${item.date || '—'}</strong><br />
                  <span>${item.note || '—'}</span>
                </div>
              `).join('')}
            </div>` : ''}
          ${Array.isArray(tenant.previousTenants) && tenant.previousTenants.length ? `
            <div style="margin-top: 0.7rem;"><strong>Previous Tenants</strong></div>
            <div class="family-list">
              ${tenant.previousTenants.map((item) => `
                <div class="family-item">
                  <strong>${item.name || '—'}</strong><br />
                  <span>${item.from || '—'} to ${item.to || '—'}</span><br />
                  <span>${item.note || '—'}</span>
                </div>
              `).join('')}
            </div>` : ''}
          ${Array.isArray(tenant.members) && tenant.members.length ? `
            <div style="margin-top: 0.7rem;"><strong>Tenant Members</strong></div>
            <div class="family-list">
              ${tenant.members.map((item) => `
                <div class="family-item">
                  <strong>${item.name || 'Member'}</strong><br />
                  <span>${item.relation || '—'} • ${item.contact || '—'}</span><br />
                  <span>Aadhaar: ${item.aadhaar || '—'} • PAN: ${item.pan || '—'}</span>
                </div>
              `).join('')}
            </div>` : ''}
          ${docEntries.length ? `
            <div class="doc-list">
              ${docEntries.map(([key, doc]) => doc && doc.dataUrl ? `<a class="doc-link" href="${doc.dataUrl}" download="${doc.name || key}">Download ${key}</a>` : '').join('')}
            </div>` : ''}
        </div>
      `;
    }
  }
} else {
  setText('primaryName', 'No member details found');
}
