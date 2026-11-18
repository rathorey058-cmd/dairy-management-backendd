"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = __importDefault(require("https"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const CameraDevice_1 = require("../models/CameraDevice");
const cameraService_1 = require("../services/cameraService");
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const CLOUD_URL = process.env.CLOUD_BACKEND_URL || 'https://dairy-management-backendd.onrender.com';
const MONGODB_URI = process.env.MONGODB_URI;
console.log('🚀 Starting DairySmart AI - Local DVR Bridge Service');
console.log(`📡 Ingestion Destination: ${CLOUD_URL}`);
const pushFrameHttp = (cameraId, base64Data, contentType) => {
    return new Promise((resolve) => {
        try {
            const postData = JSON.stringify({ base64Data, contentType });
            const u = new URL(`${CLOUD_URL}/api/cameras/${cameraId}/push-frame`);
            const req = https_1.default.request({
                hostname: u.hostname,
                port: u.port || 443,
                path: u.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 8000
            }, (res) => {
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
    const streamCycle = async () => {
        if (isPumping)
            return;
        isPumping = true;
        try {
            const cameras = await CameraDevice_1.CameraDevice.find({});
            for (const cam of cameras) {
                try {
                    const { buffer, contentType } = await (0, cameraService_1.fetchHikvisionSnapshotBuffer)(cam);
                    const base64Data = buffer.toString('base64');
                    await pushFrameHttp(cam._id.toString(), base64Data, contentType);
                    console.log(`📸 Pushed live frame: ${cam.name} [Ch #${cam.channel}] (${buffer.length} bytes)`);
                    await new Promise((r) => setTimeout(r, 100));
                }
                catch (e) {
                    // Channel offline
                }
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
runBridge().catch((e) => {
    console.error('Fatal bridge error:', e);
});
