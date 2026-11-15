"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const salesController_1 = require("../controllers/salesController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const closeDayMiddleware_1 = require("../middleware/closeDayMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
// Product Menu & Barcode Routes
router.get('/products', salesController_1.getProducts);
router.post('/products', closeDayMiddleware_1.checkDayClosed, salesController_1.createProduct);
router.put('/products/:id', closeDayMiddleware_1.checkDayClosed, salesController_1.updateProduct);
router.get('/products/barcode/:barcode', salesController_1.getProductByBarcode);
// Sales & Orders & Customers
router.get('/orders', salesController_1.getOrders);
router.post('/invoice', closeDayMiddleware_1.checkDayClosed, salesController_1.createInvoice);
router.post('/customer/:id/payment', closeDayMiddleware_1.checkDayClosed, salesController_1.receiveCustomerPayment);
router.get('/customers', salesController_1.getCustomers);
exports.default = router;
