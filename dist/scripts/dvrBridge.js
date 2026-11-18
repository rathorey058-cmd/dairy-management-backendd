"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_client_1 = require("socket.io-client");
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const CameraDevice_1 = require("../models/CameraDevice");
const cameraService_1 = require("../services/cameraService");
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const CLOUD_URL = process.env.CLOUD_BACKEND_URL || 'https://dairy-management-backendd.onrender.com';
const MONGODB_URI = process.env.MONGODB_URI;
console.log('🚀 Starting DairySmart AI - Local DVR Bridge Service');
console.log(`📡 Connecting to Cloud Server: ${CLOUD_URL}`);
const socket = (0, socket_io_client_1.io)(CLOUD_URL, {
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
    await mongoose_1.default.connect(MONGODB_URI);
    console.log('🍃 Connected to MongoDB Atlas for camera list');
    const streamCycle = async () => {
        try {
            const cameras = await CameraDevice_1.CameraDevice.find({ status: 'ONLINE' });
            for (const cam of cameras) {
                try {
                    const { buffer, contentType } = await (0, cameraService_1.fetchHikvisionSnapshotBuffer)(cam);
                    const base64Data = buffer.toString('base64');
                    socket.emit('dvr:push_frame', {
                        cameraId: cam._id.toString(),
                        channel: cam.channel || 1,
                        base64Data,
                        contentType
                    });
                    // Small micro-delay between camera channels to avoid flooding LAN router
                    await new Promise((r) => setTimeout(r, 150));
                }
                catch (e) {
                    // Camera frame fetch error (offline or busy)
                }
            }
        }
        catch (err) {
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
