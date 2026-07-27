const API_BASE = '/api';
const params = new URLSearchParams(window.location.search);
const ticketId = Number(params.get('id'));
const viewerRole = params.get('role') === 'admin' ? 'admin' : 'member';

const setText = (id, value) => {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const formatMoney = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;
const formatDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '-');
const formatDateTime = (value) => (value ? new Date(value).toISOString().slice(0, 16).replace('T', ' ') : '-');

const showError = () => {
  document.getElementById('workorderSheet').hidden = true;
  document.getElementById('workorderError').hidden = false;
};

const render = (ticket) => {
  const woNo = `${ticket.kind === 'complaint' ? 'CMP' : 'REQ'}-${String(ticket.id).padStart(4, '0')}`;
  setText('woNumber', woNo);
  setText('woDate', formatDate(ticket.createdAt));
  setText('woStatus', ticket.status);
  setText('woName', ticket.memberName || '-');
  setText('woFlat', ticket.memberFlat || '-');
  setText('woWing', ticket.memberWing || '-');
  setText('woKindHeading', ticket.kind === 'complaint' ? 'Complaint Details' : 'Request Details');
  setText('woCategory', ticket.category || '-');
  setText('woSubject', ticket.subject || '-');
  setText('woDescription', ticket.description || '-');

  const attachmentSection = document.getElementById('woAttachmentSection');
  const attachmentBox = document.getElementById('woAttachment');
  if (ticket.attachment && ticket.attachment.dataUrl) {
    attachmentSection.hidden = false;
    if ((ticket.attachment.type || '').startsWith('image/')) {
      attachmentBox.innerHTML = `<img src="${ticket.attachment.dataUrl}" alt="Attachment" style="max-width:100%;border:1px solid var(--border);border-radius:8px;" />`;
    } else {
      attachmentBox.innerHTML = `<a class="no-print" href="${ticket.attachment.dataUrl}" download="${escapeHtml(ticket.attachment.name || 'attachment')}">${escapeHtml(ticket.attachment.name || 'Download attachment')}</a>`;
    }
  } else {
    attachmentSection.hidden = true;
  }

  const costSection = document.getElementById('woCostSection');
  if (ticket.costBorneBy && ticket.cost != null) {
    costSection.hidden = false;
    setText('woCostBorneBy', ticket.costBorneBy);
    setText('woCost', formatMoney(ticket.cost));
    setText('woAcceptance', ticket.memberAccepted
      ? `Accepted on ${formatDate(ticket.memberAcceptedAt)}`
      : (ticket.costBorneBy === 'Member' ? 'Pending member acceptance' : 'Not required'));
  } else {
    costSection.hidden = true;
  }

  const historyBody = document.getElementById('woHistory');
  if (historyBody) {
    const entries = ticket.history && ticket.history.length
      ? ticket.history
      : [{ status: ticket.status, adminRemarks: ticket.adminRemarks, actor: 'member', at: ticket.createdAt }];
    historyBody.innerHTML = entries.map((entry) => `
      <tr>
        <td>${formatDateTime(entry.at)}</td>
        <td>${escapeHtml(entry.status)}${entry.cost != null && entry.costBorneBy ? ` (${escapeHtml(entry.costBorneBy)}: ${formatMoney(entry.cost)})` : ''}</td>
        <td>${escapeHtml(entry.adminRemarks || entry.note || '')}</td>
        <td>${entry.actor === 'member' ? 'Member' : 'Society'}</td>
      </tr>
    `).join('');
  }

  const acceptBtn = document.getElementById('acceptBtn');
  if (acceptBtn) {
    const eligible = viewerRole === 'member' && ticket.costBorneBy === 'Member' && ticket.cost != null && !ticket.memberAccepted;
    acceptBtn.hidden = !eligible;
  }

  document.title = `Casa Cielo | Work Order ${woNo}`;
};

const load = async () => {
  try {
    const res = await fetch(`${API_BASE}/tickets`, { headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) {
      showError();
      return;
    }
    const data = await res.json();
    const ticket = (data.tickets || []).find((item) => item.id === ticketId);
    if (!ticket) {
      showError();
      return;
    }
    render(ticket);
  } catch (error) {
    showError();
  }
};

document.getElementById('printBtn')?.addEventListener('click', () => window.print());

document.getElementById('acceptBtn')?.addEventListener('click', async () => {
  try {
    const res = await fetch(`${API_BASE}/tickets?id=${ticketId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept' })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || 'Failed to accept.');
      return;
    }
    render(data.ticket);
  } catch (error) {
    alert('Failed to accept.');
  }
});

if (!ticketId) {
  showError();
} else {
  load();
}
