import { Router } from 'express';
import { 
  getBandhis, 
  createBandhi, 
  updateBandhi, 
  getDailyDeliverySheet, 
  saveDailyDeliverySheet 
} from '../controllers/bandhiController';
import { authenticate } from '../middleware/authMiddleware';
import { checkDayClosed } from '../middleware/closeDayMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', getBandhis);
router.post('/', checkDayClosed, createBandhi);
router.put('/:id', checkDayClosed, updateBandhi);

router.get('/delivery-sheet', getDailyDeliverySheet);
router.post('/delivery-sheet', checkDayClosed, saveDailyDeliverySheet);

export default router;
