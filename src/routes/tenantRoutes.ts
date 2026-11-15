import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import {
  getTenantSettings,
  updateTenantSettings,
  completeOnboarding
} from '../controllers/tenantController';

const router = Router();

router.use(authenticate);

router.get('/settings', getTenantSettings);
router.put('/settings', updateTenantSettings);
router.post('/onboarding-complete', completeOnboarding);

export default router;

