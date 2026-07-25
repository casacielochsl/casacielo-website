require('dotenv').config();
const bcrypt = require('bcryptjs');

if (!process.env.MONGODB_URI && !process.env.casacielo_MONGODB_URI) {
  console.error('Missing MONGODB_URI (or casacielo_MONGODB_URI) environment variable. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const { getDb } = require('../api/_lib/db');

const DEFAULT_ADMIN = { username: 'admin', password: 'admin123', email: 'manishtiwari@outlook.in', adminRole: 'super-admin' };

async function main() {
  const db = await getDb();

  await db.collection('admins').createIndex({ username: 1 }, { unique: true });
  await db.collection('members').createIndex({ flatKey: 1 }, { unique: true });
  await db.collection('members').createIndex({ id: 1 }, { unique: true });
  await db.collection('bookings').createIndex({ id: 1 }, { unique: true });
  await db.collection('bookings').createIndex({ date: 1 });
  console.log('Indexes ready.');

  const adminPasswordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
  const existingAdmin = await db.collection('admins').findOne({ username: DEFAULT_ADMIN.username });
  if (existingAdmin) {
    await db.collection('admins').updateOne(
      { username: DEFAULT_ADMIN.username },
      { $set: { email: existingAdmin.email || DEFAULT_ADMIN.email, adminRole: existingAdmin.adminRole || DEFAULT_ADMIN.adminRole } }
    );
    console.log(`Admin user '${DEFAULT_ADMIN.username}' already exists, skipped (email/role backfilled if missing).`);
  } else {
    await db.collection('admins').insertOne({
      username: DEFAULT_ADMIN.username,
      passwordHash: adminPasswordHash,
      email: DEFAULT_ADMIN.email,
      adminRole: DEFAULT_ADMIN.adminRole
    });
    console.log(`Seeded admin user '${DEFAULT_ADMIN.username}'.`);
  }

  console.log('Seed complete. No sample members are created — add real members through the admin panel.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
