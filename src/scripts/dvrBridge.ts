import https from 'https';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { CameraDevice } from '../models/CameraDevice';
import { fetchHikvisionSnapshotBuffer } from '../services/cameraService';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const CLOUD_URL = process.env.CLOUD_BACKEND_URL || 'https://dairy-management-backendd.onrender.com';
const MONGODB_URI = process.env.MONGODB_URI;

console.log('🚀 Starting DairySmart AI - Local DVR Bridge Service');
console.log(`📡 Ingestion Destination: ${CLOUD_URL}`);

const pushFrameHttp = (cameraId: string, base64Data: string, contentType: string): Promise<void> => {
  return new Promise((resolve) => {
    try {
      const postData = JSON.stringify({ base64Data, contentType });
      const u = new URL(`${CLOUD_URL}/api/cameras/${cameraId}/push-frame`);

      const req = https.request(
        {
          hostname: u.hostname,
          port: u.port || 443,
          path: u.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          },
          timeout: 8000
        },
        (res) => {
          res.resume();
          resolve();
        }
      );

      req.on('error', () => resolve());
      req.on('timeout', () => {
        req.destroy();
        resolve();
      });

      req.write(postData);
      req.end();
    } catch (e) {
      resolve();
    }
  });
};

const runBridge = async () => {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in server/.env');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('🍃 Connected to MongoDB Atlas');

  let isPumping = false;
  const streamCycle = async () => {
    if (isPumping) return;
    isPumping = true;
    try {
      const cameras = await CameraDevice.find({});
      for (const cam of cameras) {
        try {
          const { buffer, contentType } = await fetchHikvisionSnapshotBuffer(cam as any);
          const base64Data = buffer.toString('base64');
          await pushFrameHttp(cam._id.toString(), base64Data, contentType);
          console.log(`📸 Pushed live frame: ${cam.name} [Ch #${cam.channel}] (${buffer.length} bytes)`);
          await new Promise((r) => setTimeout(r, 100));
        } catch (e: any) {
          // Channel offline
        }
      }
    } catch (err: any) {
      console.warn('Bridge cycle notice:', err.message);
    } finally {
      isPumping = false;
    }
  };

  console.log('🎥 Live streaming DVR frames to Cloud (Render & Vercel)...');
  setInterval(streamCycle, 2000);
  streamCycle();
};

runBridge().catch((e) => {
  console.error('Fatal bridge error:', e);
});
