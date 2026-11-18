"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const socket_io_1 = require("socket.io");
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const seed_1 = require("./utils/seed");
const PORT = process.env.PORT || 5000;
const httpServer = http_1.default.createServer(app_1.default);
// Keep-alive auto-pinger: Render sleeps after 15 mins of inactivity.
// Pinging every 12 mins keeps the backend permanently warm and fast.
const KEEP_ALIVE_URL = process.env.KEEP_ALIVE_URL || 'https://dairy-management-backendd.onrender.com/health';
const PING_INTERVAL_MS = 12 * 60 * 1000;
const startKeepAlivePinger = () => {
    setInterval(() => {
        https_1.default.get(KEEP_ALIVE_URL, (res) => {
            console.log(`💓 Keep-alive ping sent to ${KEEP_ALIVE_URL} - Status: ${res.statusCode}`);
        }).on('error', (err) => {
            console.warn(`Keep-alive ping notice: ${err.message}`);
        });
    }, PING_INTERVAL_MS);
};
exports.io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PATCH', 'DELETE']
    }
});
exports.io.on('connection', (socket) => {
    // Delivery Staff joins tenant room
    socket.on('delivery:join', (data) => {
        if (data?.tenantId) {
            socket.join(`tenant:${data.tenantId}`);
            console.log(`🚴 Delivery staff ${data.staffName || 'Staff'} joined tenant:${data.tenantId}`);
        }
    });
    // Owner joins to monitor fleet
    socket.on('owner:join_fleet_monitor', (tenantId) => {
        if (tenantId) {
            socket.join(`tenant:${tenantId}:fleet`);
            console.log(`👑 Owner joined live fleet room: tenant:${tenantId}:fleet`);
        }
    });
    // Delivery location ping from staff (Runs continuously even when phone screen is locked)
    socket.on('delivery:location_ping', (ping) => {
        if (ping?.tenantId) {
            // Broadcast live position to owner
            exports.io.to(`tenant:${ping.tenantId}:fleet`).emit('owner:live_fleet_update', ping);
        }
    });
    socket.on('disconnect', () => {
        // Socket disconnected
    });
});
const startServer = async () => {
    // 1. Bind port first so Render detects open port immediately
    httpServer.listen(PORT, () => {
        console.log(`🚀 Server & Socket.io running on port ${PORT}`);
        startKeepAlivePinger();
    });
    // 2. Connect DB & seed once connected
    const isConnected = await (0, db_1.connectDB)();
    if (isConnected) {
        (0, seed_1.seedDatabase)().catch((err) => console.error('Database seeding warning:', err));
    }
};
startServer();
