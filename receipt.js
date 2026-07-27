const API_BASE = '/api';
const params = new URLSearchParams(window.location.search);
const contributionId = Number(params.get('id'));

const setText = (id, value) => {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
};

const formatMoney = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const showError = () => {
  document.getElementById('receiptSheet').hidden = true;
  document.getElementById('receiptError').hidden = false;
};

const render = (contribution) => {
  const receiptNo = `RCPT-${String(contribution.id).padStart(4, '0')}`;
  setText('rcptNumber', receiptNo);
  setText('rcptDate', contribution.createdAt ? new Date(contribution.createdAt).toISOString().slice(0, 10) : '-');
  setText('rcptName', contribution.name || '-');
  setText('rcptFlat', contribution.flat || '-');
  setText('rcptWing', contribution.wing || '-');

  const description = `Contribution — ${contribution.occasionName || 'Occasion'}`;
  const lineItems = document.getElementById('rcptLineItems');
  if (lineItems) {
    lineItems.innerHTML = `<tr><td>${description}</td><td>${formatMoney(contribution.amount)}</td></tr>`;
  }
  setText('rcptTotal', formatMoney(contribution.amount));

  if (contribution.note) {
    setText('rcptNote', `Note: ${contribution.note}`);
  }

  document.title = `Casa Cielo | Receipt ${receiptNo}`;
};

const init = async () => {
  if (!contributionId) {
    showError();
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/contributions`, { headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) {
      showError();
      return;
    }
    const data = await res.json();
    const contribution = (data.contributions || []).find((item) => item.id === contributionId);
    if (!contribution) {
      showError();
      return;
    }
    render(contribution);
  } catch (error) {
    showError();
  }
};

document.getElementById('printBtn')?.addEventListener('click', () => window.print());

init();
