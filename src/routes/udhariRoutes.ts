import { Router } from 'express';
import { 
  getDueCustomers, 
  getCustomerLedgerStatement, 
  collectDuePayment 
} from '../controllers/udhariController';
import { authenticate } from '../middleware/authMiddleware';
import { checkDayClosed } from '../middleware/closeDayMiddleware';

const router = Router();

router.use(authenticate);

router.get('/customers', getDueCustomers);
router.get('/customer/:customerId/ledger', getCustomerLedgerStatement);
router.post('/collect', checkDayClosed, collectDuePayment);

export default router;
