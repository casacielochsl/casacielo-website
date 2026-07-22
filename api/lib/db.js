const { neon } = require('@neondatabase/serverless');

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error('Missing DATABASE_URL (or POSTGRES_URL) environment variable');
}

const sql = neon(connectionString);

module.exports = { sql };
