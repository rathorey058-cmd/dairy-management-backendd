import mongoose from 'mongoose';
import { User } from '../models/User';
import { connectDB } from '../config/db';
import { seedDatabase } from './seed';

const check = async () => {
  try {
    await connectDB();
    console.log('Running Manual Seeding...');
    await seedDatabase();
    const users = await User.find({});
    console.log('Users found in database:', users.map((u: any) => ({ email: u.email, role: u.role })));
  } catch (err) {
    console.error('Error during manual check:', err);
  } finally {
    process.exit(0);
  }
};

check();
