import { io } from 'socket.io-client';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { CameraDevice } from '../models/CameraDevice';
import { fetchHikvisionSnapshotBuffer } from '../services/cameraService';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const CLOUD_URL = process.env.CLOUD_BACKEND_URL || 'https://dairy-management-backendd.onrender.com';
const MONGODB_URI = process.env.MONGODB_URI;

console.log('🚀 Starting DairySmart AI - Local DVR Bridge Service');
console.log(`📡 Connecting to Cloud Server: ${CLOUD_URL}`);

const socket = io(CLOUD_URL, {
  transports: ['websocket', 'polling'],
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000
});

socket.on('connect', () => {
  console.log('✅ Connected to Cloud Socket Bridge:', socket.id);
  socket.emit('dvr:register_bridge', { timestamp: Date.now() });
});

socket.on('disconnect', () => {
  console.warn('⚠️ Disconnected from Cloud Socket Bridge. Reconnecting...');
});

const runBridge = async () => {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in server/.env');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('🍃 Connected to MongoDB Atlas for camera list');

  const streamCycle = async () => {
    try {
      const cameras = await CameraDevice.find({ status: 'ONLINE' });
      for (const cam of cameras) {
        try {
          const { buffer, contentType } = await fetchHikvisionSnapshotBuffer(cam as any);
          const base64Data = buffer.toString('base64');
          socket.emit('dvr:push_frame', {
            cameraId: cam._id.toString(),
            channel: cam.channel || 1,
            base64Data,
            contentType
          });
          // Small micro-delay between camera channels to avoid flooding LAN router
          await new Promise((r) => setTimeout(r, 150));
        } catch (e: any) {
          // Camera frame fetch error (offline or busy)
        }
      }
    } catch (err: any) {
      console.warn('Bridge cycle warning:', err.message);
    }
  };

  // Run cycle every 2.5 seconds
  console.log('🎥 Live streaming DVR frames to Cloud (Vercel)...');
  setInterval(streamCycle, 2500);
  streamCycle();
};

runBridge().catch((e) => {
  console.error('Fatal bridge error:', e);
});
