import { Router } from 'express';
import { parseVoiceCommand, executeVoiceCommand } from '../controllers/voiceController';
import { authenticate } from '../middleware/authMiddleware';
import { checkDayClosed } from '../middleware/closeDayMiddleware';

const router = Router();

router.use(authenticate);

router.post('/parse-command', parseVoiceCommand);
router.post('/execute-command', checkDayClosed, executeVoiceCommand);

export default router;
