import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
export const client = new MongoClient(uri);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}
