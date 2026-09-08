import { Router } from 'express';
import { 
  getRecipe, updateRecipe, estimateYield, createBatch, completeBatch, getBatches, getYieldStats,
  getLiveStockStatus, recordConversion, getConversionHistory, adjustProductStock
} from '../controllers/productionController';
import { authenticate } from '../middleware/authMiddleware';
import { checkDayClosed } from '../middleware/closeDayMiddleware';

const router = Router();

router.use(authenticate);

// Live Stock & Processing
router.get('/live-stock', getLiveStockStatus);
router.post('/convert', checkDayClosed, recordConversion);
router.get('/conversions', getConversionHistory);
router.post('/adjust-stock', checkDayClosed, adjustProductStock);

// Existing Batches & Recipes
router.get('/recipe/:productId', getRecipe);
router.post('/recipe/:productId', checkDayClosed, updateRecipe);
router.post('/estimate', estimateYield);
router.post('/batches', checkDayClosed, createBatch);
router.post('/batches/:id/complete', checkDayClosed, completeBatch);
router.get('/batches', getBatches);
router.get('/stats/:productId', getYieldStats);

export default router;
