import { Router } from 'express';
import { parseWhatsAppMessage, askAssistant } from '../controllers/aiController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.post('/whatsapp-webhook', parseWhatsAppMessage);
router.post('/query', askAssistant);

export default router;
