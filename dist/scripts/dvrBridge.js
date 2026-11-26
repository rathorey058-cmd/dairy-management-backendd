"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = __importDefault(require("https"));
const net_1 = __importDefault(require("net"));
const os_1 = __importDefault(require("os"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const CameraDevice_1 = require("../models/CameraDevice");
const cameraService_1 = require("../services/cameraService");
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const CLOUD_URL = process.env.CLOUD_BACKEND_URL || 'https://dairy-management-backendd.onrender.com';
const MONGODB_URI = process.env.MONGODB_URI;
console.log('🚀 Starting DairySmart AI - Local DVR Bridge Service (Auto-IP Recovery Enabled)');
console.log(`📡 Ingestion Destination: ${CLOUD_URL}`);
let cachedAuthToken = '';
let lastDiscoveryAt = 0;
const getLocalSubnetPrefix = () => {
    const ifaces = os_1.default.networkInterfaces();
    for (const list of Object.values(ifaces)) {
        for (const info of list || []) {
            if (info.family === 'IPv4' && !info.internal && info.address.startsWith('192.168.')) {
                return info.address.split('.').slice(0, 3).join('.');
            }
        }
    }
    return null;
};
const checkPortOpen = (ip, port, timeoutMs = 300) => {
    return new Promise((resolve) => {
        const sock = new net_1.default.Socket();
        let done = false;
        const finish = (ok) => {
            if (done)
                return;
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
const autoDiscoverAndUpdateDvrIp = async (sampleCam) => {
    const now = Date.now();
    if (now - lastDiscoveryAt < 90_000)
        return false;
    lastDiscoveryAt = now;
    const prefix = getLocalSubnetPrefix();
    if (!prefix)
        return false;
    console.log(`🔎 DVR unreachable at ${sampleCam.ipAddress}. Scanning ${prefix}.2-254 for Hikvision DVR...`);
    const batchSize = 32;
    for (let start = 2; start <= 254; start += batchSize) {
        const ips = Array.from({ length: Math.min(batchSize, 255 - start) }, (_, i) => `${prefix}.${start + i}`);
        const checks = await Promise.all(ips.map(async (ip) => ((await checkPortOpen(ip, 554, 300)) ? ip : null)));
        for (const ip of checks) {
            if (!ip)
                continue;
            try {
                await (0, cameraService_1.fetchHikvisionSnapshotBuffer)({ ...sampleCam.toObject(), ipAddress: ip, snapshotUrl: '' });
                console.log(`✅ [AUTO-DISCOVERY] Found DVR at new IP: ${ip} (was ${sampleCam.ipAddress})`);
                await CameraDevice_1.CameraDevice.updateMany({ tenantId: sampleCam.tenantId }, { $set: { ipAddress: ip, status: 'ONLINE', lastChecked: new Date() } });
                return true;
            }
            catch {
                // Not our DVR or wrong credentials
            }
        }
    }
    return false;
};
const getAuthToken = () => {
    return new Promise((resolve) => {
        if (cachedAuthToken)
            return resolve(cachedAuthToken);
        try {
            const postData = JSON.stringify({
                loginId: 'owner@krishnadairy.com',
                password: 'password123'
            });
            const u = new URL(`${CLOUD_URL}/api/auth/login`);
            const req = https_1.default.request({
                hostname: u.hostname,
                port: u.port || 443,
                path: u.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 10000
            }, (res) => {
                let body = '';
                res.on('data', (d) => (body += d));
                res.on('end', () => {
                    try {
                        const data = JSON.parse(body);
                        if (data.token) {
                            cachedAuthToken = data.token;
                            console.log('🔑 Authenticated with Cloud Backend successfully');
                        }
                    }
                    catch (e) { }
                    resolve(cachedAuthToken);
                });
            });
            req.on('error', () => resolve(''));
            req.write(postData);
            req.end();
        }
        catch (e) {
            resolve('');
        }
    });
};
const pushFrameHttp = async (cameraId, base64Data, contentType, channel, tenantId) => {
    const token = await getAuthToken();
    return new Promise((resolve) => {
        try {
            const postData = JSON.stringify({ base64Data, contentType, channel, tenantId });
            const u = new URL(`${CLOUD_URL}/api/cameras/${cameraId}/push-frame`);
            const headers = {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const req = https_1.default.request({
                hostname: u.hostname,
                port: u.port || 443,
                path: u.pathname,
                method: 'POST',
                headers,
                timeout: 8000
            }, (res) => {
                if (res.statusCode === 401) {
                    cachedAuthToken = '';
                }
                if (res.statusCode && res.statusCode >= 400) {
                    console.warn(`⚠️ Cloud push HTTP ${res.statusCode} for camera ${cameraId}`);
                }
                res.resume();
                resolve();
            });
            req.on('error', () => resolve());
            req.on('timeout', () => {
                req.destroy();
                resolve();
            });
            req.write(postData);
            req.end();
        }
        catch (e) {
            resolve();
        }
    });
};
const runBridge = async () => {
    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI is not set in server/.env');
        process.exit(1);
    }
    await mongoose_1.default.connect(MONGODB_URI);
    console.log('🍃 Connected to MongoDB Atlas');
    let isPumping = false;
    let consecutiveAllFail = 0;
    const streamCycle = async () => {
        if (isPumping)
            return;
        isPumping = true;
        try {
            const cameras = await CameraDevice_1.CameraDevice.find({});
            let pushedCount = 0;
            for (const cam of cameras) {
                try {
                    const { buffer, contentType } = await (0, cameraService_1.fetchHikvisionSnapshotBuffer)(cam);
                    const base64Data = buffer.toString('base64');
                    await pushFrameHttp(cam._id.toString(), base64Data, contentType, cam.channel || 1, cam.tenantId ? String(cam.tenantId) : undefined);
                    pushedCount++;
                    console.log(`📸 Pushed live frame: ${cam.name} [Ch #${cam.channel}] (${buffer.length} bytes)`);
                    await new Promise((r) => setTimeout(r, 100));
                }
                catch (e) {
                    // Channel offline
                }
            }
            if (cameras.length > 0 && pushedCount === 0) {
                consecutiveAllFail++;
                if (consecutiveAllFail >= 3) {
                    consecutiveAllFail = 0;
                    await autoDiscoverAndUpdateDvrIp(cameras[0]);
                }
            }
            else {
                consecutiveAllFail = 0;
            }
        }
        catch (err) {
            console.warn('Bridge cycle notice:', err.message);
        }
        finally {
            isPumping = false;
        }
    };
    console.log('🎥 Live streaming DVR frames to Cloud (Render & Vercel)...');
    setInterval(streamCycle, 2000);
    streamCycle();
};
const acquireSingleBridgeLock = (port = 47892) => {
    return new Promise((resolve) => {
        const lockSrv = net_1.default.createServer();
        lockSrv.once('error', () => {
            console.log(`ℹ️ Another DVR Bridge instance is already running (lock port ${port}). Exiting duplicate cleanly.`);
            process.exit(0);
        });
        lockSrv.listen(port, '127.0.0.1', () => resolve(true));
    });
};
acquireSingleBridgeLock().then(() => {
    runBridge().catch((e) => {
        console.error('Fatal bridge error:', e);
    });
});
