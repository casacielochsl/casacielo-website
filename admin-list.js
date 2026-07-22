const API_BASE = '/api';

let members = [];
const tableBody = document.getElementById('memberTableBody');
const filterSearch = document.getElementById('filterSearch');
const filterType = document.getElementById('filterType');

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

const getFilteredMembers = () => {
  const searchValue = (filterSearch?.value || '').toLowerCase().trim();
  const typeValue = (filterType?.value || '').toLowerCase();
  return members.filter((member) => {
    const record = [member.flat, member.name, member.wing, member.floor, member.memberType, member.contact, member.password].join(' ').toLowerCase();
    const matchesSearch = !searchValue || record.includes(searchValue);
    const matchesType = !typeValue || (member.memberType || 'Owner').toLowerCase() === typeValue;
    return matchesSearch && matchesType;
  });
};

const renderMembers = () => {
  if (!tableBody) return;
  const visibleMembers = getFilteredMembers();
  tableBody.innerHTML = visibleMembers.map((member) => `
    <tr>
      <td>${member.flat || '-'}</td>
      <td>${member.name || '-'}</td>
      <td>${member.wing || '-'}</td>
      <td>${member.floor || '-'}</td>
      <td>${member.memberType || 'Owner'}</td>
      <td>${member.contact || '-'}</td>
      <td>${member.password || '-'}</td>
      <td>
        <button class="action-btn" data-action="view" data-id="${member.id}">View</button>
        <button class="action-btn" data-action="edit" data-id="${member.id}">Edit</button>
        <button class="action-btn" data-action="delete" data-id="${member.id}">Delete</button>
      </td>
    </tr>
  `).join('');
};

[filterSearch, filterType].forEach((element) => {
  element?.addEventListener('input', renderMembers);
  element?.addEventListener('change', renderMembers);
});

tableBody?.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const id = Number(button.getAttribute('data-id'));
  const action = button.getAttribute('data-action');
  if (action === 'view') {
    window.location.href = `admin-member.html?id=${id}`;
  } else if (action === 'edit') {
    window.location.href = `admin-management?id=${id}&mode=edit`;
  } else if (action === 'delete') {
    try {
      await api(`/members/${id}`, { method: 'DELETE' });
      members = members.filter((entry) => entry.id !== id);
      renderMembers();
    } catch (error) {
      alert(error.message || 'Failed to delete member');
    }
  }
});

const init = async () => {
  try {
    const data = await api('/members');
    members = data.members;
    renderMembers();
  } catch (error) {
    // already redirected to admin.html on 401
  }
};

init();
