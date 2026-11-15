"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTenantGeminiKey = exports.getMe = exports.login = exports.seedDatabaseHandler = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const Tenant_1 = require("../models/Tenant");
const seed_1 = require("../utils/seed");
const seedDatabaseHandler = async (req, res) => {
    try {
        await (0, seed_1.seedDatabase)();
        res.json({ message: 'Database seeded successfully with demo users!' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.seedDatabaseHandler = seedDatabaseHandler;
const login = async (req, res) => {
    try {
        const { loginId, password } = req.body; // loginId can be email or mobile
        if (!loginId || !password) {
            res.status(400).json({ message: 'Login ID and password are required.' });
            return;
        }
        // Find user across all tenants (in production, you can check active status)
        const user = await User_1.User.findOne({
            $or: [{ email: loginId }, { mobile: loginId }]
        });
        if (!user) {
            res.status(401).json({ message: 'Invalid credentials.' });
            return;
        }
        if (user.status === 'Inactive') {
            res.status(403).json({ message: 'Your account is deactivated.' });
            return;
        }
        // Check tenant status (unless SuperAdmin)
        let tenant = null;
        if (user.role !== 'SuperAdmin') {
            tenant = await Tenant_1.Tenant.findById(user.tenantId);
            if (!tenant) {
                res.status(403).json({ message: 'Associated business account not found.' });
                return;
            }
            if (tenant.status === 'Suspended') {
                res.status(403).json({ message: 'Your business account is suspended.' });
                return;
            }
        }
        // Compare passwords
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({ message: 'Invalid credentials.' });
            return;
        }
        // Generate JWT token
        const jwtSecret = process.env.JWT_SECRET || 'dairy-smart-ai-super-secret-key';
        const payload = {
            id: user._id,
            tenantId: user.tenantId,
            role: user.role,
            permissions: user.permissions
        };
        const token = jsonwebtoken_1.default.sign(payload, jwtSecret, { expiresIn: '7d' });
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                role: user.role,
                permissions: user.permissions
            },
            tenant: tenant ? {
                id: tenant._id,
                name: tenant.name,
                ownerName: tenant.ownerName,
                status: tenant.status,
                subscriptionExpiresAt: tenant.subscriptionExpiresAt
            } : null
        });
    }
    catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Internal server error during login.' });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const user = await User_1.User.findById(req.user.id).select('-passwordHash');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const tenant = req.user.role !== 'SuperAdmin' ? await Tenant_1.Tenant.findById(req.tenantId) : null;
        res.json({
            user,
            tenant
        });
    }
    catch (error) {
        console.error('Get Me Error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};
exports.getMe = getMe;
const updateTenantGeminiKey = async (req, res) => {
    try {
        if (!req.user || !req.tenantId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { geminiApiKey } = req.body;
        await Tenant_1.Tenant.findByIdAndUpdate(req.tenantId, { geminiApiKey: geminiApiKey?.trim() || '' });
        res.json({ message: 'Gemini API Key updated successfully.' });
    }
    catch (error) {
        console.error('Update Gemini Key Error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};
exports.updateTenantGeminiKey = updateTenantGeminiKey;
