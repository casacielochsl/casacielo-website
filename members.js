const STORAGE_KEY = 'casaCieloMembers';
const defaultMembers = [
  {
    id: 1,
    flat: 'A-101',
    password: '101',
    name: 'Mr. Harsh Verma',
    floor: '1st Floor',
    tower: 'Tower A',
    parking: 'P-11',
    ownerName: 'Harsh Verma',
    ownerPhone: '+91 8657871340',
    ownerEmail: 'harsh.verma@example.com',
    ownerFamily: '2 Adults | 1 Child',
    maintenanceStatus: 'Paid',
    lastPayment: 'June 2026',
    nextDue: 'August 2026',
    visitorPass: 'Active',
    status: 'Active',
    memberType: 'Owner'
  },
  {
    id: 2,
    flat: 'A-102',
    password: '102',
    name: 'Ms. Priya Sharma',
    floor: '1st Floor',
    tower: 'Tower A',
    parking: 'P-12',
    ownerName: 'Priya Sharma',
    ownerPhone: '+91 9876543210',
    ownerEmail: 'priya.sharma@example.com',
    ownerFamily: '1 Adult | 2 Children',
    maintenanceStatus: 'Pending',
    lastPayment: 'May 2026',
    nextDue: 'August 2026',
    visitorPass: 'Pending',
    status: 'Reminder Sent',
    memberType: 'Co-Owner'
  },
  {
    id: 3,
    flat: 'B-205',
    password: '205',
    name: 'Mr. Rohan Patel',
    floor: '2nd Floor',
    tower: 'Tower B',
    parking: 'P-27',
    ownerName: 'Rohan Patel',
    ownerPhone: '+91 9999988888',
    ownerEmail: 'rohan.patel@example.com',
    ownerFamily: '2 Adults',
    maintenanceStatus: 'Paid',
    lastPayment: 'June 2026',
    nextDue: 'September 2026',
    visitorPass: 'Active',
    status: 'Active',
    memberType: 'Family Member'
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

const members = loadMembers();
const form = document.getElementById('member-login-form');
const message = document.getElementById('loginMessage');

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const flat = document.getElementById('flatInput').value.trim();
  const password = document.getElementById('passwordInput').value.trim();

  const member = members.find((entry) => entry.flat.toLowerCase() === flat.toLowerCase() && entry.password === password);

  if (!member) {
    message.textContent = 'Invalid flat number or password. Please try again.';
    message.style.color = '#ff8d8d';
    return;
  }

  window.location.href = `members-details.html?flat=${encodeURIComponent(member.flat)}`;
});
