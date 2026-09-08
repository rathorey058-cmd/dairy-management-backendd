import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import farmerRoutes from './routes/farmerRoutes';
import milkRoutes from './routes/milkRoutes';
import paymentRoutes from './routes/paymentRoutes';
import productionRoutes from './routes/productionRoutes';
import salesRoutes from './routes/salesRoutes';
import gallaRoutes from './routes/gallaRoutes';
import reportRoutes from './routes/reportRoutes';
import aiRoutes from './routes/aiRoutes';
import milkSaleRoutes from './routes/milkSaleRoutes';
import voiceRoutes from './routes/voiceRoutes';
import bandhiRoutes from './routes/bandhiRoutes';
import udhariRoutes from './routes/udhariRoutes';
import { seedDatabase } from './utils/seed';

dotenv.config();

const app = express();

// Middlewares
const allowedOrigins = [
  'https://dairy-management-frontend-theta.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      
      // Allow if origin is in allowedOrigins or is any Vercel preview domain
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Fallback allow all for seamless API consumption
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
  })
);
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/milk', milkRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/galla', gallaRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/milk-sales', milkSaleRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/bandhi', bandhiRoutes);
app.use('/api/udhari', udhariRoutes);

import mongoose from 'mongoose';
import { connectDB } from './config/db';

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date(), mongoState: mongoose.connection.readyState });
});

// Seed DB trigger route
app.get('/api/seed', async (req, res): Promise<void> => {
  try {
    const isConnected = await connectDB();
    if (!isConnected) {
      res.status(500).json({
        success: false,
        message: 'MongoDB connection failed. Check MONGODB_URI on Render & Whitelist 0.0.0.0/0 on MongoDB Atlas.'
      });
      return;
    }
    await seedDatabase();
    res.json({ success: true, message: 'Database seeded successfully with demo accounts (owner@krishnadairy.com / password123).' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ 
    message: err.message || 'An unexpected error occurred on the server.'
  });
});

export default app;
