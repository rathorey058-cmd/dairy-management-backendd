"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const farmerRoutes_1 = __importDefault(require("./routes/farmerRoutes"));
const milkRoutes_1 = __importDefault(require("./routes/milkRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const productionRoutes_1 = __importDefault(require("./routes/productionRoutes"));
const salesRoutes_1 = __importDefault(require("./routes/salesRoutes"));
const gallaRoutes_1 = __importDefault(require("./routes/gallaRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const aiRoutes_1 = __importDefault(require("./routes/aiRoutes"));
const milkSaleRoutes_1 = __importDefault(require("./routes/milkSaleRoutes"));
const voiceRoutes_1 = __importDefault(require("./routes/voiceRoutes"));
const bandhiRoutes_1 = __importDefault(require("./routes/bandhiRoutes"));
const udhariRoutes_1 = __importDefault(require("./routes/udhariRoutes"));
const cameraRoutes_1 = __importDefault(require("./routes/cameraRoutes"));
const tenantRoutes_1 = __importDefault(require("./routes/tenantRoutes"));
const seed_1 = require("./utils/seed");
dotenv_1.default.config();
const app = (0, express_1.default)();
// Middlewares
const allowedOrigins = [
    'https://dairy-management-frontend-theta.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173',
    process.env.CLIENT_URL,
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, Postman)
        if (!origin)
            return callback(null, true);
        // Allow if origin is in allowedOrigins or is any Vercel preview domain
        if (allowedOrigins.includes(origin) ||
            origin.endsWith('.vercel.app') ||
            origin.includes('localhost') ||
            origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        return callback(null, true); // Fallback allow all for seamless API consumption
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/farmers', farmerRoutes_1.default);
app.use('/api/milk', milkRoutes_1.default);
app.use('/api/payments', paymentRoutes_1.default);
app.use('/api/production', productionRoutes_1.default);
app.use('/api/sales', salesRoutes_1.default);
app.use('/api/galla', gallaRoutes_1.default);
app.use('/api/reports', reportRoutes_1.default);
app.use('/api/ai', aiRoutes_1.default);
app.use('/api/milk-sales', milkSaleRoutes_1.default);
app.use('/api/voice', voiceRoutes_1.default);
app.use('/api/bandhi', bandhiRoutes_1.default);
app.use('/api/udhari', udhariRoutes_1.default);
app.use('/api/cameras', cameraRoutes_1.default);
app.use('/api/tenant', tenantRoutes_1.default);
app.use('/api/tenants', tenantRoutes_1.default);
const mongoose_1 = __importDefault(require("mongoose"));
const db_1 = require("./config/db");
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date(), mongoState: mongoose_1.default.connection.readyState });
});
// Seed DB trigger route
app.get('/api/seed', async (req, res) => {
    try {
        const isConnected = await (0, db_1.connectDB)();
        if (!isConnected) {
            res.status(500).json({
                success: false,
                message: 'MongoDB connection failed. Check MONGODB_URI on Render & Whitelist 0.0.0.0/0 on MongoDB Atlas.'
            });
            return;
        }
        await (0, seed_1.seedDatabase)();
        res.json({ success: true, message: 'Database seeded successfully with demo accounts (owner@krishnadairy.com / password123).' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
        message: err.message || 'An unexpected error occurred on the server.'
    });
});
exports.default = app;
