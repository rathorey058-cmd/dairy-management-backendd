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
app.use(cors());
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Run seeding in background
seedDatabase().catch(err => console.error('Database seeding failed:', err));

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ 
    message: err.message || 'An unexpected error occurred on the server.'
  });
});

export default app;
