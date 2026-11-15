"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeOnboarding = exports.updateTenantSettings = exports.getTenantSettings = void 0;
const Tenant_1 = require("../models/Tenant");
const MilkRateChart_1 = require("../models/MilkRateChart");
/**
 * Get tenant configuration, pricing, settlement cycle, and onboarding status
 */
const getTenantSettings = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        if (!tenantId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const tenant = await Tenant_1.Tenant.findById(tenantId);
        if (!tenant) {
            res.status(404).json({ message: 'Tenant not found' });
            return;
        }
        res.json({
            success: true,
            tenant: {
                id: tenant._id,
                name: tenant.name,
                ownerName: tenant.ownerName,
                mobile: tenant.mobile,
                whatsappNumber: tenant.whatsappNumber || tenant.mobile,
                email: tenant.email,
                address: tenant.address,
                logoUrl: tenant.logoUrl,
                gstNumber: tenant.gstNumber,
                defaultCurrency: tenant.defaultCurrency || 'INR',
                pricingConfig: tenant.pricingConfig || {
                    cowBaseRatePerFat: 7.5,
                    cowBaseRatePerSnf: 4.0,
                    cowSellingPrice: 60.0,
                    buffaloBaseRatePerFat: 9.0,
                    buffaloBaseRatePerSnf: 4.5,
                    buffaloSellingPrice: 80.0
                },
                settlementCycle: tenant.settlementCycle || {
                    cycleType: '10_DAY',
                    customDays: 10
                },
                hardwareConfig: tenant.hardwareConfig || {
                    cameraRtspUrl: '',
                    nvrIpAddress: '192.168.31.129',
                    cameraLocation: 'Counter & Galla',
                    audioMode: 'VISION_AUDIO',
                    microphones: [
                        { id: 'mic-1', name: 'Counter Mic (काउंटर माइक)', role: 'COUNTER', enabled: true },
                        { id: 'mic-2', name: 'Cash Drawer Mic (गल्ला माइक)', role: 'GALLA', enabled: true }
                    ]
                },
                isOnboardingCompleted: Boolean(tenant.isOnboardingCompleted),
                geminiApiKey: tenant.geminiApiKey ? '••••••••' + tenant.geminiApiKey.slice(-4) : ''
            }
        });
    }
    catch (err) {
        console.error('getTenantSettings error:', err);
        res.status(500).json({ message: 'Error retrieving tenant settings', error: err.message });
    }
};
exports.getTenantSettings = getTenantSettings;
/**
 * Update tenant profile, pricing, settlement cycle, or hardware config
 */
const updateTenantSettings = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        if (!tenantId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { name, ownerName, mobile, whatsappNumber, email, address, logoUrl, gstNumber, pricingConfig, settlementCycle, hardwareConfig, isOnboardingCompleted } = req.body;
        const updateFields = {};
        if (name)
            updateFields.name = name.trim();
        if (ownerName)
            updateFields.ownerName = ownerName.trim();
        if (mobile)
            updateFields.mobile = mobile.trim();
        if (whatsappNumber !== undefined)
            updateFields.whatsappNumber = whatsappNumber.trim();
        if (email)
            updateFields.email = email.trim();
        if (address)
            updateFields.address = address.trim();
        if (logoUrl !== undefined)
            updateFields.logoUrl = logoUrl;
        if (gstNumber !== undefined)
            updateFields.gstNumber = gstNumber.trim();
        if (pricingConfig) {
            updateFields.pricingConfig = {
                cowBaseRatePerFat: Number(pricingConfig.cowBaseRatePerFat) || 7.5,
                cowBaseRatePerSnf: Number(pricingConfig.cowBaseRatePerSnf) || 4.0,
                cowSellingPrice: Number(pricingConfig.cowSellingPrice) || 60.0,
                buffaloBaseRatePerFat: Number(pricingConfig.buffaloBaseRatePerFat) || 9.0,
                buffaloBaseRatePerSnf: Number(pricingConfig.buffaloBaseRatePerSnf) || 4.5,
                buffaloSellingPrice: Number(pricingConfig.buffaloSellingPrice) || 80.0
            };
        }
        if (settlementCycle) {
            updateFields.settlementCycle = {
                cycleType: settlementCycle.cycleType || '10_DAY',
                customDays: Number(settlementCycle.customDays) || 10
            };
        }
        if (hardwareConfig) {
            updateFields.hardwareConfig = {
                cameraRtspUrl: hardwareConfig.cameraRtspUrl || '',
                nvrIpAddress: hardwareConfig.nvrIpAddress || '192.168.31.129',
                cameraLocation: hardwareConfig.cameraLocation || 'Counter & Galla',
                audioMode: hardwareConfig.audioMode || 'VISION_AUDIO',
                microphones: hardwareConfig.microphones || [
                    { id: 'mic-1', name: 'Counter Mic (काउंटर माइक)', role: 'COUNTER', enabled: true },
                    { id: 'mic-2', name: 'Cash Drawer Mic (गल्ला माइक)', role: 'GALLA', enabled: true }
                ]
            };
        }
        if (isOnboardingCompleted !== undefined) {
            updateFields.isOnboardingCompleted = Boolean(isOnboardingCompleted);
        }
        const updatedTenant = await Tenant_1.Tenant.findByIdAndUpdate(tenantId, { $set: updateFields }, { new: true });
        // Sync or update default MilkRateChart so milk collections calculate automatically
        if (pricingConfig) {
            try {
                const cowFat = Number(pricingConfig.cowBaseRatePerFat) || 7.5;
                const bufFat = Number(pricingConfig.buffaloBaseRatePerFat) || 9.0;
                // Generate rules across standard fat 3.0 to 10.0
                const cowRules = [];
                for (let f = 3.0; f <= 5.5; f += 0.1) {
                    cowRules.push({ fat: Math.round(f * 10) / 10, rate: Math.round(f * cowFat * 10) / 10 });
                }
                const buffaloRules = [];
                for (let f = 5.0; f <= 10.0; f += 0.1) {
                    buffaloRules.push({ fat: Math.round(f * 10) / 10, rate: Math.round(f * bufFat * 10) / 10 });
                }
                await MilkRateChart_1.MilkRateChart.findOneAndUpdate({ tenantId }, {
                    tenantId,
                    name: `${updatedTenant?.name || 'Dairy'} Auto Rate Chart`,
                    pricingType: 'FAT_ONLY',
                    effectiveDate: new Date(),
                    cowRules,
                    buffaloRules,
                    mixedRules: cowRules
                }, { upsert: true, new: true });
            }
            catch (rateErr) {
                console.warn('MilkRateChart sync warning:', rateErr);
            }
        }
        res.json({
            success: true,
            message: 'Dairy profile & settings updated successfully',
            tenant: updatedTenant
        });
    }
    catch (err) {
        console.error('updateTenantSettings error:', err);
        res.status(500).json({ message: 'Error updating tenant settings', error: err.message });
    }
};
exports.updateTenantSettings = updateTenantSettings;
/**
 * Mark onboarding wizard as completed
 */
const completeOnboarding = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        if (!tenantId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        await Tenant_1.Tenant.findByIdAndUpdate(tenantId, { isOnboardingCompleted: true });
        res.json({ success: true, message: 'Onboarding completed successfully' });
    }
    catch (err) {
        res.status(500).json({ message: 'Error marking onboarding complete', error: err.message });
    }
};
exports.completeOnboarding = completeOnboarding;
