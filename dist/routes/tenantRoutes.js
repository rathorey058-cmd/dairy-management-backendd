"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const tenantController_1 = require("../controllers/tenantController");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
router.get('/settings', tenantController_1.getTenantSettings);
router.put('/settings', tenantController_1.updateTenantSettings);
router.post('/onboarding-complete', tenantController_1.completeOnboarding);
// AI Pairing Quota & SuperAdmin Limit Controls
router.get('/my-pairing-quota', tenantController_1.getMyPairingQuota);
router.get('/admin/pairing-limits', tenantController_1.getAllTenantsPairingLimits);
router.put('/admin/pairing-limits/:id', tenantController_1.updateTenantPairingLimitByAdmin);
exports.default = router;
