import { Router } from 'express';
import { closeDay, getClosingStatus, generateDailyExcel, getDailyClosingHistory } from '../controllers/reportController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.post('/close-day', closeDay);
router.get('/status/:date', getClosingStatus);
router.get('/closings', getDailyClosingHistory);
router.get('/export/daily', generateDailyExcel);

export default router;
