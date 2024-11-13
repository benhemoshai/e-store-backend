import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  await client.connect();
  console.log('Connected to MongoDB');
}

export function getDatabase(dbName = 'e_store') {
  return client.db(dbName);
}
