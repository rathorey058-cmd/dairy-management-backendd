import https from 'https';
import net from 'net';
import os from 'os';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { CameraDevice } from '../models/CameraDevice';
import { fetchHikvisionSnapshotBuffer } from '../services/cameraService';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const CLOUD_URL = process.env.CLOUD_BACKEND_URL || 'https://dairy-management-backendd.onrender.com';
const MONGODB_URI = process.env.MONGODB_URI;

console.log('🚀 Starting DairySmart AI - Local DVR Bridge Service (Auto-IP Recovery Enabled)');
console.log(`📡 Ingestion Destination: ${CLOUD_URL}`);

let cachedAuthToken = '';
let lastDiscoveryAt = 0;

const getLocalSubnetPrefix = (): string | null => {
  const ifaces = os.networkInterfaces();
  for (const list of Object.values(ifaces)) {
    for (const info of list || []) {
      if (info.family === 'IPv4' && !info.internal && info.address.startsWith('192.168.')) {
        return info.address.split('.').slice(0, 3).join('.');
      }
    }
  }
  return null;
};

const checkPortOpen = (ip: string, port: number, timeoutMs = 300): Promise<boolean> => {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      sock.destroy();
      resolve(ok);
    };
    sock.setTimeout(timeoutMs);
    sock.once('connect', () => finish(true));
    sock.once('timeout', () => finish(false));
    sock.once('error', () => finish(false));
    sock.connect(port, ip);
  });
};

const autoDiscoverAndUpdateDvrIp = async (sampleCam: any): Promise<boolean> => {
  const now = Date.now();
  if (now - lastDiscoveryAt < 90_000) return false;
  lastDiscoveryAt = now;
  const prefix = getLocalSubnetPrefix();
  if (!prefix) return false;
  console.log(`🔎 DVR unreachable at ${sampleCam.ipAddress}. Scanning ${prefix}.2-254 for Hikvision DVR...`);

  const batchSize = 32;
  for (let start = 2; start <= 254; start += batchSize) {
    const ips = Array.from({ length: Math.min(batchSize, 255 - start) }, (_, i) => `${prefix}.${start + i}`);
    const checks = await Promise.all(ips.map(async (ip) => ((await checkPortOpen(ip, 554, 300)) ? ip : null)));
    for (const ip of checks) {
      if (!ip) continue;
      try {
        await fetchHikvisionSnapshotBuffer({ ...sampleCam.toObject(), ipAddress: ip, snapshotUrl: '' } as any);
        console.log(`✅ [AUTO-DISCOVERY] Found DVR at new IP: ${ip} (was ${sampleCam.ipAddress})`);
        await CameraDevice.updateMany(
          { tenantId: sampleCam.tenantId },
          { $set: { ipAddress: ip, status: 'ONLINE', lastChecked: new Date() } }
        );
        return true;
      } catch {
        // Not our DVR or wrong credentials
      }
    }
  }
  return false;
};

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
          if (res.statusCode === 401) {
            cachedAuthToken = '';
          }
          if (res.statusCode && res.statusCode >= 400) {
            console.warn(`⚠️ Cloud push HTTP ${res.statusCode} for camera ${cameraId}`);
          }
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
  let consecutiveAllFail = 0;
  const streamCycle = async () => {
    if (isPumping) return;
    isPumping = true;
    try {
      const cameras = await CameraDevice.find({});
      let pushedCount = 0;
      for (const cam of cameras) {
        try {
          const { buffer, contentType } = await fetchHikvisionSnapshotBuffer(cam as any);
          const base64Data = buffer.toString('base64');
          await pushFrameHttp(cam._id.toString(), base64Data, contentType);
          pushedCount++;
          console.log(`📸 Pushed live frame: ${cam.name} [Ch #${cam.channel}] (${buffer.length} bytes)`);
          await new Promise((r) => setTimeout(r, 100));
        } catch (e: any) {
          // Channel offline
        }
      }
      if (cameras.length > 0 && pushedCount === 0) {
        consecutiveAllFail++;
        if (consecutiveAllFail >= 3) {
          consecutiveAllFail = 0;
          await autoDiscoverAndUpdateDvrIp(cameras[0]);
        }
      } else {
        consecutiveAllFail = 0;
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
