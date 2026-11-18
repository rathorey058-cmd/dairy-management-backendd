import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import {
  getTenantSettings,
  updateTenantSettings,
  completeOnboarding,
  getMyPairingQuota,
  getAllTenantsPairingLimits,
  updateTenantPairingLimitByAdmin
} from '../controllers/tenantController';

const router = Router();

router.use(authenticate);

router.get('/settings', getTenantSettings);
router.put('/settings', updateTenantSettings);
router.post('/onboarding-complete', completeOnboarding);

// AI Pairing Quota & SuperAdmin Limit Controls
router.get('/my-pairing-quota', getMyPairingQuota);
router.get('/admin/pairing-limits', getAllTenantsPairingLimits);
router.put('/admin/pairing-limits/:id', updateTenantPairingLimitByAdmin);

export default router;

