import { Router } from 'express';
import { getGallaStatus, forecastGallaAndProfit } from '../controllers/gallaController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/status', getGallaStatus);
router.get('/forecast', forecastGallaAndProfit);

export default router;
