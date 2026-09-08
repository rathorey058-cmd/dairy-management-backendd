import { Router } from 'express';
import { login, getMe, updateTenantGeminiKey, seedDatabaseHandler } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.get('/seed', seedDatabaseHandler);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/tenant/gemini-key', authenticate, updateTenantGeminiKey);

export default router;
