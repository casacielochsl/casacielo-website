require('dotenv').config();
const bcrypt = require('bcryptjs');
const { normalizeFlatKey } = require('../api/lib/members');

if (!process.env.MONGODB_URI && !process.env.casacielo_MONGODB_URI) {
  console.error('Missing MONGODB_URI (or casacielo_MONGODB_URI) environment variable. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const { getDb, nextSequence } = require('../api/lib/db');

const DEFAULT_ADMIN = { username: 'admin', password: 'admin123', email: 'manishtiwari@outlook.in' };

const DEFAULT_MEMBERS = [
  {
    flat: 'A-101',
    password: '101',
    name: 'Mr. Harsh Verma',
    wing: 'A Wing',
    floor: '1st Floor',
    parking: 'P-11',
    memberType: 'Owner',
    contact: '+91 8657871340',
    email: 'harsh.verma@example.com',
    family: 'Spouse, Daughter',
    occupancyStatus: 'Self Occupied',
    details: {
      residents: {
        owners: [{ name: 'Mr. Harsh Verma', contact: '+91 8657871340', email: 'harsh.verma@example.com' }],
        coOwners: [],
        familyMembers: []
      },
      tenant: {},
      familyMembers: [
        { name: 'Mrs. Neha Verma', relation: 'Spouse', age: '34 years', type: 'Family Member' },
        { name: 'Kavya Verma', relation: 'Daughter', age: '8 years', type: 'Family Member' }
      ],
      status: 'Active',
      maintenanceStatus: 'Paid',
      lastPayment: 'June 2026',
      nextDue: 'August 2026',
      visitorPass: 'Active'
    }
  },
  {
    flat: 'A-102',
    password: '102',
    name: 'Ms. Priya Sharma',
    wing: 'A Wing',
    floor: '1st Floor',
    parking: 'P-12',
    memberType: 'Co-Owner',
    contact: '+91 9876543210',
    email: 'priya.sharma@example.com',
    family: 'Spouse, Son',
    occupancyStatus: 'Self Occupied',
    details: {
      residents: {
        owners: [{ name: 'Ms. Priya Sharma', contact: '+91 9876543210', email: 'priya.sharma@example.com' }],
        coOwners: [],
        familyMembers: []
      },
      tenant: {},
      familyMembers: [
        { name: 'Mr. Rahul Sharma', relation: 'Spouse', age: '38 years', type: 'Family Member' },
        { name: 'Aarav Sharma', relation: 'Son', age: '6 years', type: 'Family Member' }
      ],
      status: 'Reminder Sent',
      maintenanceStatus: 'Pending',
      lastPayment: 'May 2026',
      nextDue: 'August 2026',
      visitorPass: 'Pending'
    }
  },
  {
    flat: 'B-205',
    password: '205',
    name: 'Mr. Rohan Patel',
    wing: 'B Wing',
    floor: '2nd Floor',
    parking: 'P-27',
    memberType: 'Family Member',
    contact: '+91 9999988888',
    email: 'rohan.patel@example.com',
    family: 'Spouse',
    occupancyStatus: 'Self Occupied',
    details: {
      residents: {
        owners: [{ name: 'Mr. Rohan Patel', contact: '+91 9999988888', email: 'rohan.patel@example.com' }],
        coOwners: [],
        familyMembers: []
      },
      tenant: {},
      familyMembers: [
        { name: 'Mrs. Pooja Patel', relation: 'Spouse', age: '35 years', type: 'Family Member' }
      ],
      status: 'Active',
      maintenanceStatus: 'Paid',
      lastPayment: 'June 2026',
      nextDue: 'September 2026',
      visitorPass: 'Active'
    }
  }
];

async function main() {
  const db = await getDb();

  await db.collection('admins').createIndex({ username: 1 }, { unique: true });
  await db.collection('members').createIndex({ flatKey: 1 }, { unique: true });
  await db.collection('members').createIndex({ id: 1 }, { unique: true });
  console.log('Indexes ready.');

  const adminPasswordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
  const existingAdmin = await db.collection('admins').findOne({ username: DEFAULT_ADMIN.username });
  if (existingAdmin) {
    await db.collection('admins').updateOne(
      { username: DEFAULT_ADMIN.username },
      { $set: { email: existingAdmin.email || DEFAULT_ADMIN.email } }
    );
    console.log(`Admin user '${DEFAULT_ADMIN.username}' already exists, skipped (email backfilled if it was missing).`);
  } else {
    await db.collection('admins').insertOne({
      username: DEFAULT_ADMIN.username,
      passwordHash: adminPasswordHash,
      email: DEFAULT_ADMIN.email
    });
    console.log(`Seeded admin user '${DEFAULT_ADMIN.username}'.`);
  }

  for (const member of DEFAULT_MEMBERS) {
    const flatKey = normalizeFlatKey(member.flat);
    const existingMember = await db.collection('members').findOne({ flatKey });
    if (existingMember) {
      console.log(`Member '${member.flat}' already exists, skipped.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(member.password, 10);
    const details = { ...member.details, plainPassword: member.password };
    const id = await nextSequence(db, 'members');
    const now = new Date();

    await db.collection('members').insertOne({
      id,
      flat: member.flat,
      flatKey,
      passwordHash,
      name: member.name,
      wing: member.wing,
      floor: member.floor,
      parking: member.parking,
      memberType: member.memberType,
      contact: member.contact,
      email: member.email,
      family: member.family,
      occupancyStatus: member.occupancyStatus,
      details,
      createdAt: now,
      updatedAt: now
    });
    console.log(`Seeded member '${member.flat}'.`);
  }

  console.log('Seed complete.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
