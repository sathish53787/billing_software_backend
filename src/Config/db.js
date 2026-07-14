import dns from 'dns';
import mongoose from 'mongoose';
import { keys } from './keys.js';

const configureMongoDns = () => {
  const servers = process.env.MONGO_DNS_SERVERS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (servers?.length) {
    dns.setServers(servers);
    return;
  }
  if (process.platform === 'win32') {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  }
};

const connectDB = async () => {
  configureMongoDns();
  try {
    await mongoose.connect(keys.MONGO_DB_URL, {
      autoIndex: true,
      serverSelectionTimeoutMS: 30000,
    });
    console.log('Database connected');
  } catch (error) {
    console.log('Error connecting to MongoDB:', error);
    setTimeout(connectDB, 3000);
  }
};

export default connectDB;
