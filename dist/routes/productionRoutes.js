"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const productionController_1 = require("../controllers/productionController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const closeDayMiddleware_1 = require("../middleware/closeDayMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
// Live Stock & Processing
router.get('/live-stock', productionController_1.getLiveStockStatus);
router.post('/convert', closeDayMiddleware_1.checkDayClosed, productionController_1.recordConversion);
router.get('/conversions', productionController_1.getConversionHistory);
router.post('/adjust-stock', closeDayMiddleware_1.checkDayClosed, productionController_1.adjustProductStock);
// Existing Batches & Recipes
router.get('/recipe/:productId', productionController_1.getRecipe);
router.post('/recipe/:productId', closeDayMiddleware_1.checkDayClosed, productionController_1.updateRecipe);
router.post('/estimate', productionController_1.estimateYield);
router.post('/batches', closeDayMiddleware_1.checkDayClosed, productionController_1.createBatch);
router.post('/batches/:id/complete', closeDayMiddleware_1.checkDayClosed, productionController_1.completeBatch);
router.get('/batches', productionController_1.getBatches);
router.get('/stats/:productId', productionController_1.getYieldStats);
exports.default = router;
