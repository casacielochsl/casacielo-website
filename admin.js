const API_BASE = '/api';

let members = [];

const params = new URLSearchParams(window.location.search);
const editId = params.get('id');
const mode = params.get('mode');

const loginForm = document.getElementById('admin-login-form');
const adminPanel = document.getElementById('admin-panel');
const memberForm = document.getElementById('member-form');
const tableBody = document.getElementById('memberTableBody');
const formHeading = document.getElementById('formHeading');
const newMemberBtn = document.getElementById('newMemberBtn');
const cancelBtn = document.getElementById('cancelBtn');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const forgotPasswordForm = document.getElementById('forgot-password-form');
const cancelForgotBtn = document.getElementById('cancelForgotBtn');
const forgotMessage = document.getElementById('forgotMessage');

const isManagementPage = /\/admin-management(?:\.html)?\/?$/.test(window.location.pathname);

const api = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (res.status === 401) {
    window.location.href = 'admin.html';
    throw new Error('Not authenticated');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
};

const fetchMembers = async () => {
  const data = await api('/members');
  members = data.members;
};

const renderMembers = () => {
  if (!tableBody) return;
  tableBody.innerHTML = members.map((member) => `
    <tr>
      <td>${member.flat}</td>
      <td>${member.name}</td>
      <td>${member.wing}</td>
      <td>${member.floor}</td>
      <td>${member.memberType || 'Owner'}</td>
      <td>${member.contact}</td>
      <td>${member.password}</td>
      <td>
        <button class="action-btn" data-action="edit" data-id="${member.id}">Edit</button>
        <button class="action-btn" data-action="delete" data-id="${member.id}">Delete</button>
        <button class="action-btn" data-action="reset" data-id="${member.id}">Reset</button>
      </td>
    </tr>
  `).join('');
};

const formatTenantMembers = (tenantMembers = []) => {
  if (!Array.isArray(tenantMembers)) return '';
  return tenantMembers.map((member) => [member.name, member.relation, member.contact, member.aadhaar, member.pan].filter(Boolean).join(' | ')).join('\n');
};

const formatResidentGroup = (residents = []) => {
  if (!Array.isArray(residents)) return '';
  return residents.map((person) => [person.name, person.contact, person.email].filter(Boolean).join(' | ')).join('\n');
};

const parseResidentGroup = (rawValue) => rawValue
  .split(/\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const parts = line.split('|').map((part) => part.trim());
    return { name: parts[0] || '', contact: parts[1] || '', email: parts[2] || '' };
  });

const FLOORS = Array.from({ length: 18 }, (_, index) => index + 1).filter((floor) => floor !== 13);
const UNITS = ['01', '02', '03', '04', '05', '06'];
const ALL_FLATS = FLOORS.flatMap((floor) => UNITS.map((unit) => `${floor}${unit}`));

const populateFlatOptions = (currentFlat) => {
  const select = document.getElementById('flatNumber');
  if (!select) return;
  const takenFlats = new Set(members.filter((item) => item.flat !== currentFlat).map((item) => item.flat));
  const availableFlats = ALL_FLATS.filter((flat) => !takenFlats.has(flat));
  if (currentFlat && !availableFlats.includes(currentFlat)) {
    availableFlats.unshift(currentFlat);
  }
  select.innerHTML = availableFlats.map((flat) => `<option value="${flat}">${flat}</option>`).join('');
  select.value = currentFlat || availableFlats[0] || '';
};

const showForm = (member = null) => {
  if (!memberForm) return;
  memberForm.hidden = false;
  formHeading.textContent = member ? 'Edit Member' : 'Add Member';
  document.getElementById('memberId').value = member?.id || '';
  populateFlatOptions(member?.flat || '');
  document.getElementById('memberName').value = member?.name || '';
  document.getElementById('wing').value = member?.wing || '';
  document.getElementById('floor').value = member?.floor || '';
  document.getElementById('memberType').value = member?.memberType || '';
  document.getElementById('parking').value = member?.parking || '';
  document.getElementById('memberPassword').value = member?.password || '';
  document.getElementById('contact').value = member?.contact || '';
  document.getElementById('email').value = member?.email || '';
  document.getElementById('family').value = member?.family || '';
  document.getElementById('ownerMembers').value = formatResidentGroup(member?.residents?.owners || []);
  document.getElementById('coOwnerMembers').value = formatResidentGroup(member?.residents?.coOwners || []);
  document.getElementById('familyMembers').value = formatResidentGroup(member?.residents?.familyMembers || []);
  document.getElementById('occupancyStatus').value = member?.occupancyStatus || 'Self Occupied';
  document.getElementById('tenantName').value = member?.tenant?.name || '';
  document.getElementById('tenantContact').value = member?.tenant?.contact || '';
  document.getElementById('tenantEmail').value = member?.tenant?.email || '';
  document.getElementById('tenantDetails').value = member?.tenant?.details || '';
  document.getElementById('tenantMembers').value = formatTenantMembers(member?.tenant?.members || []);
  document.getElementById('rentFrom').value = member?.tenant?.rentFrom || '';
  document.getElementById('agreementEnd').value = member?.tenant?.agreementEnd || '';
  document.getElementById('renewalHistory').value = (member?.tenant?.renewals || []).map((entry) => `${entry.date || ''} | ${entry.note || ''}`).join('\n').trim();
  document.getElementById('previousTenants').value = (member?.tenant?.previousTenants || []).map((entry) => `${entry.name || ''} | ${entry.from || ''} | ${entry.to || ''} | ${entry.note || ''}`).join('\n').trim();
};

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const user = document.getElementById('adminUser').value.trim();
  const pass = document.getElementById('adminPass').value.trim();
  try {
    const res = await fetch(`${API_BASE}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    });
    if (!res.ok) {
      alert('Invalid admin credentials');
      return;
    }
    window.location.href = 'admin-list.html';
  } catch (error) {
    alert('Invalid admin credentials');
  }
});

forgotPasswordLink?.addEventListener('click', () => {
  loginForm.hidden = true;
  forgotPasswordLink.hidden = true;
  forgotPasswordForm.hidden = false;
  forgotMessage.hidden = true;
});

cancelForgotBtn?.addEventListener('click', () => {
  forgotPasswordForm.hidden = true;
  forgotMessage.hidden = true;
  loginForm.hidden = false;
  forgotPasswordLink.hidden = false;
});

forgotPasswordForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = document.getElementById('forgotUsername').value.trim();
  try {
    await fetch(`${API_BASE}/auth/admin-forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
  } catch (error) {
    // fall through to the generic message below regardless of network errors
  }
  forgotMessage.hidden = false;
  forgotMessage.textContent = 'If that account exists, a reset link has been emailed to its recovery address.';
});

const init = async () => {
  if (isManagementPage) {
    try {
      await fetchMembers();
    } catch (error) {
      return;
    }
    const managementMode = params.get('mode');
    const managementId = params.get('id');
    if (managementMode === 'create') {
      showForm();
      memberForm.hidden = false;
    } else if (managementMode === 'edit' && managementId) {
      const member = members.find((item) => item.id === Number(managementId));
      if (member) {
        showForm(member);
        memberForm.hidden = false;
      } else if (formHeading) {
        formHeading.textContent = 'Member not found';
        memberForm.hidden = false;
      }
    }
  } else if (mode === 'create') {
    if (loginForm) loginForm.hidden = true;
    if (adminPanel) adminPanel.hidden = false;
    try {
      await fetchMembers();
    } catch (error) {
      return;
    }
    renderMembers();
    showForm();
    if (memberForm) memberForm.hidden = false;
  } else if (mode === 'edit' && editId) {
    if (loginForm) loginForm.hidden = true;
    if (adminPanel) adminPanel.hidden = false;
    try {
      await fetchMembers();
    } catch (error) {
      return;
    }
    renderMembers();
    const member = members.find((item) => item.id === Number(editId));
    if (member) {
      showForm(member);
      if (memberForm) memberForm.hidden = false;
    }
  }
};

init();

newMemberBtn?.addEventListener('click', () => showForm());
cancelBtn?.addEventListener('click', () => {
  memberForm.reset();
  window.location.href = 'admin-list.html';
});

const readFileDataUrl = (file) => new Promise((resolve) => {
  if (!file) {
    resolve(null);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, dataUrl: reader.result });
  reader.onerror = () => resolve(null);
  reader.readAsDataURL(file);
});

const parseTenantMembers = (rawValue) => rawValue
  .split(/\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const parts = line.split('|').map((part) => part.trim());
    return {
      name: parts[0] || '',
      relation: parts[1] || '',
      contact: parts[2] || '',
      aadhaar: parts[3] || '',
      pan: parts[4] || ''
    };
  });

const parseRenewalHistory = (rawValue) => rawValue
  .split(/\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const parts = line.split('|').map((part) => part.trim());
    return { date: parts[0] || '', note: parts.slice(1).join(' | ') || '' };
  });

const parsePreviousTenants = (rawValue) => rawValue
  .split(/\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const parts = line.split('|').map((part) => part.trim());
    return { name: parts[0] || '', from: parts[1] || '', to: parts[2] || '', note: parts.slice(3).join(' | ') || '' };
  });

document.getElementById('member-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = Number(document.getElementById('memberId').value || 0);
  const tenantDocs = {};
  const existingMember = members.find((item) => item.id === id);

  const documentInputs = [
    ['tenantAgreement', 'agreement'],
    ['tenantPoliceVerification', 'policeVerification'],
    ['tenantAadhaar', 'aadhaar'],
    ['tenantPan', 'pan'],
    ['tenantPhoto', 'photo']
  ];

  for (const [inputId, key] of documentInputs) {
    const file = document.getElementById(inputId).files && document.getElementById(inputId).files[0];
    if (file) {
      tenantDocs[key] = await readFileDataUrl(file);
    } else if (existingMember?.tenant?.documents?.[key]) {
      tenantDocs[key] = existingMember.tenant.documents[key];
    }
  }

  const memberData = {
    flat: document.getElementById('flatNumber').value.trim(),
    name: document.getElementById('memberName').value.trim(),
    wing: document.getElementById('wing').value.trim(),
    floor: document.getElementById('floor').value.trim(),
    parking: document.getElementById('parking').value.trim(),
    password: document.getElementById('memberPassword').value.trim(),
    contact: document.getElementById('contact').value.trim(),
    email: document.getElementById('email').value.trim(),
    family: document.getElementById('family').value.trim(),
    memberType: document.getElementById('memberType').value.trim() || 'Owner',
    residents: {
      owners: parseResidentGroup(document.getElementById('ownerMembers').value),
      coOwners: parseResidentGroup(document.getElementById('coOwnerMembers').value),
      familyMembers: parseResidentGroup(document.getElementById('familyMembers').value)
    },
    occupancyStatus: document.getElementById('occupancyStatus').value || 'Self Occupied',
    tenant: {
      name: document.getElementById('tenantName').value.trim(),
      contact: document.getElementById('tenantContact').value.trim(),
      email: document.getElementById('tenantEmail').value.trim(),
      details: document.getElementById('tenantDetails').value.trim(),
      members: parseTenantMembers(document.getElementById('tenantMembers').value),
      rentFrom: document.getElementById('rentFrom').value,
      agreementEnd: document.getElementById('agreementEnd').value,
      renewals: parseRenewalHistory(document.getElementById('renewalHistory').value),
      previousTenants: parsePreviousTenants(document.getElementById('previousTenants').value),
      documents: tenantDocs
    }
  };

  try {
    if (id) {
      await api(`/members/${id}`, { method: 'PUT', body: JSON.stringify(memberData) });
    } else {
      await api('/members', { method: 'POST', body: JSON.stringify(memberData) });
    }
  } catch (error) {
    alert(error.message || 'Failed to save member');
    return;
  }

  memberForm.reset();
  window.location.href = 'admin-list.html';
});

tableBody?.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const id = Number(button.getAttribute('data-id'));
  const action = button.getAttribute('data-action');
  if (action === 'view') {
    window.location.href = `admin-member.html?id=${id}`;
  } else if (action === 'edit') {
    const member = members.find((item) => item.id === id);
    showForm(member);
  } else if (action === 'delete') {
    try {
      await api(`/members/${id}`, { method: 'DELETE' });
      members = members.filter((item) => item.id !== id);
      renderMembers();
    } catch (error) {
      alert(error.message || 'Failed to delete member');
    }
  } else if (action === 'reset') {
    try {
      const data = await api(`/members/${id}`, { method: 'PUT', body: JSON.stringify({ password: 'reset123' }) });
      const index = members.findIndex((item) => item.id === id);
      if (index >= 0) members[index] = data.member;
      alert(`Password reset for ${data.member.flat}. New password: reset123`);
      renderMembers();
    } catch (error) {
      alert(error.message || 'Failed to reset password');
    }
  }
});
