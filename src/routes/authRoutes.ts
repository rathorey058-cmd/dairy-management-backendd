import { Router } from 'express';
import { login, getMe, updateTenantGeminiKey } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/tenant/gemini-key', authenticate, updateTenantGeminiKey);

export default router;
