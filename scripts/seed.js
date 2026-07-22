require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error('Missing DATABASE_URL (or POSTGRES_URL) environment variable. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const sql = neon(connectionString);

const DEFAULT_ADMIN = { username: 'admin', password: 'admin123' };

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
  await sql`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      flat TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      wing TEXT,
      floor TEXT,
      parking TEXT,
      member_type TEXT,
      contact TEXT,
      email TEXT,
      family TEXT,
      occupancy_status TEXT,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  console.log('Tables ready.');

  const adminPasswordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
  const adminResult = await sql`
    INSERT INTO admins (username, password_hash)
    VALUES (${DEFAULT_ADMIN.username}, ${adminPasswordHash})
    ON CONFLICT (username) DO NOTHING
    RETURNING username
  `;
  console.log(adminResult.length ? `Seeded admin user '${DEFAULT_ADMIN.username}'.` : `Admin user '${DEFAULT_ADMIN.username}' already exists, skipped.`);

  for (const member of DEFAULT_MEMBERS) {
    const passwordHash = await bcrypt.hash(member.password, 10);
    const details = { ...member.details, plainPassword: member.password };
    const result = await sql`
      INSERT INTO members (
        flat, password_hash, name, wing, floor, parking,
        member_type, contact, email, family, occupancy_status, details
      )
      VALUES (
        ${member.flat}, ${passwordHash}, ${member.name}, ${member.wing}, ${member.floor}, ${member.parking},
        ${member.memberType}, ${member.contact}, ${member.email}, ${member.family}, ${member.occupancyStatus}, ${JSON.stringify(details)}
      )
      ON CONFLICT (flat) DO NOTHING
      RETURNING flat
    `;
    console.log(result.length ? `Seeded member '${member.flat}'.` : `Member '${member.flat}' already exists, skipped.`);
  }

  console.log('Seed complete.');
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
