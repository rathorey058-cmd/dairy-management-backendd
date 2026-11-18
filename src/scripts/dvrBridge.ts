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

let cachedAuthToken = '';

const getAuthToken = (): Promise<string> => {
  return new Promise((resolve) => {
    if (cachedAuthToken) return resolve(cachedAuthToken);
    try {
      const postData = JSON.stringify({
        loginId: 'owner@krishnadairy.com',
        password: 'password123'
      });
      const u = new URL(`${CLOUD_URL}/api/auth/login`);
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
          timeout: 10000
        },
        (res) => {
          let body = '';
          res.on('data', (d) => (body += d));
          res.on('end', () => {
            try {
              const data = JSON.parse(body);
              if (data.token) {
                cachedAuthToken = data.token;
                console.log('🔑 Authenticated with Cloud Backend successfully');
              }
            } catch (e) {}
            resolve(cachedAuthToken);
          });
        }
      );
      req.on('error', () => resolve(''));
      req.write(postData);
      req.end();
    } catch (e) {
      resolve('');
    }
  });
};

const pushFrameHttp = async (cameraId: string, base64Data: string, contentType: string): Promise<void> => {
  const token = await getAuthToken();
  return new Promise((resolve) => {
    try {
      const postData = JSON.stringify({ base64Data, contentType });
      const u = new URL(`${CLOUD_URL}/api/cameras/${cameraId}/push-frame`);

      const headers: Record<string, string | number> = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const req = https.request(
        {
          hostname: u.hostname,
          port: u.port || 443,
          path: u.pathname,
          method: 'POST',
          headers,
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
