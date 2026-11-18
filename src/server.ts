import http from 'http';
import https from 'https';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import { connectDB } from './config/db';
import { seedDatabase } from './utils/seed';

const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);

// Keep-alive auto-pinger: Render sleeps after 15 mins of inactivity.
// Pinging every 12 mins keeps the backend permanently warm and fast.
const KEEP_ALIVE_URL = process.env.KEEP_ALIVE_URL || 'https://dairy-management-backendd.onrender.com/health';
const PING_INTERVAL_MS = 12 * 60 * 1000;

const startKeepAlivePinger = () => {
  setInterval(() => {
    https.get(KEEP_ALIVE_URL, (res) => {
      console.log(`💓 Keep-alive ping sent to ${KEEP_ALIVE_URL} - Status: ${res.statusCode}`);
    }).on('error', (err) => {
      console.warn(`Keep-alive ping notice: ${err.message}`);
    });
  }, PING_INTERVAL_MS);
};

// Live DVR Cloud Frame Cache (CameraId -> Buffer)
export const liveDvrFrameCache = new Map<string, { buffer: Buffer; contentType: string; timestamp: number }>();

export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

io.on('connection', (socket) => {
  // Local Shop DVR Bridge connects & registers
  socket.on('dvr:register_bridge', (data: { tenantId?: string }) => {
    console.log(`📹 Local Shop DVR Bridge connected on socket ${socket.id}`);
  });

  // Local Shop DVR Bridge pushes live snapshots for channels
  socket.on('dvr:push_frame', (frame: {
    cameraId: string;
    channel?: number;
    base64Data: string;
    contentType?: string;
  }) => {
    if (frame?.cameraId && frame?.base64Data) {
      try {
        const rawBase64 = frame.base64Data.includes('base64,')
          ? frame.base64Data.split('base64,')[1]
          : frame.base64Data;
        const buf = Buffer.from(rawBase64, 'base64');
        liveDvrFrameCache.set(frame.cameraId, {
          buffer: buf,
          contentType: frame.contentType || 'image/jpeg',
          timestamp: Date.now()
        });
      } catch (err) {
        console.warn('Frame cache decode error:', err);
      }
    }
  });

  // Delivery Staff joins tenant room
  socket.on('delivery:join', (data: { tenantId: string; staffId: string; staffName: string }) => {
    if (data?.tenantId) {
      socket.join(`tenant:${data.tenantId}`);
      console.log(`🚴 Delivery staff ${data.staffName || 'Staff'} joined tenant:${data.tenantId}`);
    }
  });

  // Owner joins to monitor fleet
  socket.on('owner:join_fleet_monitor', (tenantId: string) => {
    if (tenantId) {
      socket.join(`tenant:${tenantId}:fleet`);
      console.log(`👑 Owner joined live fleet room: tenant:${tenantId}:fleet`);
    }
  });

  // Delivery location ping from staff (Runs continuously even when phone screen is locked)
  socket.on('delivery:location_ping', (ping: {
    tenantId: string;
    staffId: string;
    staffName: string;
    lat: number;
    lng: number;
    speed?: number;
    batteryLevel?: number;
    timestamp: number;
  }) => {
    if (ping?.tenantId) {
      // Broadcast live position to owner
      io.to(`tenant:${ping.tenantId}:fleet`).emit('owner:live_fleet_update', ping);
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
  const isConnected = await connectDB();
  if (isConnected) {
    seedDatabase().catch((err) => console.error('Database seeding warning:', err));
  }
};

startServer();
