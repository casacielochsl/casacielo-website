const STORAGE_KEY = 'casaCieloMembers';
const loadMembers = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch (error) {
    console.warn('Unable to load saved members:', error);
  }
  return [];
};

const params = new URLSearchParams(window.location.search);
const id = Number(params.get('id'));
const members = loadMembers();
const member = members.find((item) => item.id === id);

const setText = (id, value) => {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
};

const renderGroup = (containerId, items, title) => {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!Array.isArray(items) || !items.length) {
    container.innerHTML = '<div class="family-item">No records available.</div>';
    return;
  }
  container.innerHTML = `
    <div class="resident-group-card">
      <div class="resident-group-head">${title}</div>
      ${items.map((item) => `
        <div class="resident-line">
          <div class="resident-name">${item.name || '—'}</div>
          <div class="resident-meta">Contact: ${item.contact || '—'}</div>
          <div class="resident-meta">Email: ${item.email || '—'}</div>
        </div>
      `).join('')}
    </div>
  `;
};

if (member) {
  setText('cardHeading', `${member.flat || 'Flat'} • ${member.name || 'Member'}`);
  setText('cardFlat', member.flat || '-');
  setText('cardWing', member.wing || '-');
  setText('cardFloor', member.floor || '-');
  setText('cardOccupancy', member.occupancyStatus || 'Self Occupied');
  setText('cardContact', member.contact || '-');
  setText('cardEmail', member.email || '-');
  renderGroup('ownerGroup', member.residents?.owners || [], 'Owner');
  renderGroup('coOwnerGroup', member.residents?.coOwners || [], 'Co-Owner');
  renderGroup('familyGroup', member.residents?.familyMembers || [], 'Family Member');

  const tenantContainer = document.getElementById('tenantGroup');
  if (tenantContainer) {
    const tenant = member.tenant || null;
    if (!tenant || (!tenant.name && !tenant.contact && !tenant.email && !tenant.details && !(tenant.members || []).length)) {
      tenantContainer.innerHTML = '<div class="family-item">No tenant records available.</div>';
    } else {
      tenantContainer.innerHTML = `
        <div class="resident-group-card">
          <div class="resident-group-head">Tenant</div>
          <div class="resident-line">
            <div class="resident-name">${tenant.name || 'Tenant'}</div>
            <div class="resident-meta">Contact: ${tenant.contact || '—'}</div>
            <div class="resident-meta">Email: ${tenant.email || '—'}</div>
          </div>
          <div class="resident-line">
            <div class="resident-meta">Rent From: ${tenant.rentFrom || '—'}</div>
            <div class="resident-meta">Agreement End: ${tenant.agreementEnd || '—'}</div>
            <div class="resident-meta">Notes: ${tenant.details || '—'}</div>
          </div>
        </div>
      `;
    }
  }
} else {
  setText('cardHeading', 'Member card not found');
}
