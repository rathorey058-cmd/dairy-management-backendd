"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const seed_1 = require("./utils/seed");
const PORT = process.env.PORT || 5000;
const startServer = async () => {
    // 1. Bind port first so Render detects open port immediately
    app_1.default.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
    });
    // 2. Connect DB & seed once connected
    const isConnected = await (0, db_1.connectDB)();
    if (isConnected) {
        (0, seed_1.seedDatabase)().catch((err) => console.error('Database seeding warning:', err));
    }
};
startServer();
