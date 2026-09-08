import { Router } from 'express';
import { 
  createMilkSale, 
  getMilkSales, 
  getMilkSaleSummary 
} from '../controllers/milkSaleController';
import { authenticate } from '../middleware/authMiddleware';
import { checkDayClosed } from '../middleware/closeDayMiddleware';

const router = Router();

router.use(authenticate);

router.post('/', checkDayClosed, createMilkSale);
router.get('/', getMilkSales);
router.get('/summary', getMilkSaleSummary);

export default router;
