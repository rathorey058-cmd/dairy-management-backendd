import { Router } from 'express';
import { giveAdvance, makePayment, settleAccount, getSettlementById } from '../controllers/paymentController';
import { authenticate } from '../middleware/authMiddleware';
import { checkDayClosed } from '../middleware/closeDayMiddleware';

const router = Router();

router.use(authenticate);

router.post('/advance', checkDayClosed, giveAdvance);
router.post('/pay', checkDayClosed, makePayment);
router.post('/settle', checkDayClosed, settleAccount);
router.get('/settlement/:id', getSettlementById);

export default router;
