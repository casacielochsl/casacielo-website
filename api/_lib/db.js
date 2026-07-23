const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || process.env.casacielo_MONGODB_URI;

if (!uri) {
  throw new Error('Missing MONGODB_URI (or casacielo_MONGODB_URI) environment variable');
}

const DB_NAME = process.env.MONGODB_DB || 'casacielo';

let clientPromise;

const getClient = () => {
  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
  }
  return clientPromise;
};

const getDb = async () => {
  const client = await getClient();
  return client.db(DB_NAME);
};

// MongoDB has no native auto-increment; this keeps the numeric ids the
// frontend already relies on (data-id attributes, URL query params, etc.)
// instead of switching everything over to ObjectId strings.
const nextSequence = async (db, name) => {
  const result = await db.collection('counters').findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  const doc = result && Object.prototype.hasOwnProperty.call(result, 'value') ? result.value : result;
  return doc.seq;
};

module.exports = { getDb, nextSequence };
