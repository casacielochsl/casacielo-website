const API_BASE = '/api';

const setText = (id, value) => {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
};

const renderMember = (member) => {
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
};

const init = async () => {
  const res = await fetch(`${API_BASE}/members/me`, {
    headers: { 'Content-Type': 'application/json' }
  });

  if (res.status === 401) {
    window.location.href = 'members.html';
    return;
  }

  if (!res.ok) {
    setText('primaryName', 'No member details found');
    return;
  }

  const data = await res.json();
  renderMember(data.member);
};

init();
