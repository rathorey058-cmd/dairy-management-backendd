import { Router } from 'express';
import { createMilkEntry, getMilkCollections, getMilkSummary, createRateChart, getRateCharts } from '../controllers/milkController';
import { authenticate } from '../middleware/authMiddleware';
import { checkDayClosed } from '../middleware/closeDayMiddleware';

const router = Router();

router.use(authenticate);

router.post('/collections', checkDayClosed, createMilkEntry);
router.get('/collections', getMilkCollections);
router.get('/collections/summary', getMilkSummary);
router.post('/rate-charts', checkDayClosed, createRateChart);
router.get('/rate-charts', getRateCharts);

export default router;
