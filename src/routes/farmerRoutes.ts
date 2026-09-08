import { Router } from 'express';
import { getFarmers, createFarmer, getFarmerById, getFarmerLedger, getFarmerMilkHistory } from '../controllers/farmerController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', getFarmers);
router.post('/', createFarmer);
router.get('/:id', getFarmerById);
router.get('/:id/ledger', getFarmerLedger);
router.get('/:id/milk', getFarmerMilkHistory);

export default router;
