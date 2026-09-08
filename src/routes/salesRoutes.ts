import { Router } from 'express';
import { 
  createInvoice, 
  receiveCustomerPayment, 
  getCustomers,
  getProducts,
  createProduct,
  updateProduct,
  getProductByBarcode,
  getOrders
} from '../controllers/salesController';
import { authenticate } from '../middleware/authMiddleware';
import { checkDayClosed } from '../middleware/closeDayMiddleware';

const router = Router();

router.use(authenticate);

// Product Menu & Barcode Routes
router.get('/products', getProducts);
router.post('/products', checkDayClosed, createProduct);
router.put('/products/:id', checkDayClosed, updateProduct);
router.get('/products/barcode/:barcode', getProductByBarcode);

// Sales & Orders & Customers
router.get('/orders', getOrders);
router.post('/invoice', checkDayClosed, createInvoice);
router.post('/customer/:id/payment', checkDayClosed, receiveCustomerPayment);
router.get('/customers', getCustomers);

export default router;
