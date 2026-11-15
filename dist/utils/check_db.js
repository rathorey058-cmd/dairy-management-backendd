"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = require("../models/User");
const db_1 = require("../config/db");
const seed_1 = require("./seed");
const check = async () => {
    try {
        await (0, db_1.connectDB)();
        console.log('Running Manual Seeding...');
        await (0, seed_1.seedDatabase)();
        const users = await User_1.User.find({});
        console.log('Users found in database:', users.map((u) => ({ email: u.email, role: u.role })));
    }
    catch (err) {
        console.error('Error during manual check:', err);
    }
    finally {
        process.exit(0);
    }
};
check();
