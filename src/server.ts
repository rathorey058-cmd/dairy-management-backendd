import app from './app';
import { connectDB } from './config/db';
import { seedDatabase } from './utils/seed';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // 1. Bind port first so Render detects open port immediately
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });

  // 2. Connect DB & seed once connected
  const isConnected = await connectDB();
  if (isConnected) {
    seedDatabase().catch((err) => console.error('Database seeding warning:', err));
  }
};

startServer();

