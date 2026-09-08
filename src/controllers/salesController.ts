import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { Order } from '../models/Order';
import { CustomerLedger } from '../models/CustomerLedger';
import { CashTransaction } from '../models/CashTransaction';
import { InventoryTransaction } from '../models/InventoryTransaction';

export const createInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, items, paymentMode, notes } = req.body;

    if (!items || items.length === 0 || !paymentMode) {
      res.status(400).json({ message: 'Cart items and payment mode are required.' });
      return;
    }

    // 1. Process items and verify stock
    const processedItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, tenantId: req.tenantId });
      if (!product) {
        res.status(404).json({ message: `Product not found: ${item.productId}` });
        return;
      }

      if (product.stockQty < item.quantity) {
        res.status(400).json({ 
          message: `Insufficient stock for product ${product.name}. Available: ${product.stockQty}, Requested: ${item.quantity}` 
        });
        return;
      }

      const itemAmount = Math.round((product.sellingPrice * item.quantity) * 100) / 100;
      totalAmount += itemAmount;

      processedItems.push({
        product: product._id,
        quantity: item.quantity,
        rate: product.sellingPrice,
        amount: itemAmount
      });

      // Deduct stockQty
      product.stockQty = Math.round((product.stockQty - item.quantity) * 100) / 100;
      await product.save();

      // Write Inventory transaction
      await InventoryTransaction.create({
        tenantId: req.tenantId,
        product: product._id,
        isRawMilk: false,
        type: 'Sales',
        quantity: -item.quantity,
        date: new Date(),
        notes: `Sold via Invoice`
      });
    }

    totalAmount = Math.round(totalAmount * 100) / 100;

    // 2. Validate customer & Credit limit
    let customerDoc = null;
    if (customerId) {
      customerDoc = await Customer.findOne({ _id: customerId, tenantId: req.tenantId });
      if (!customerDoc) {
        res.status(404).json({ message: 'Customer profile not found.' });
        return;
      }

      if (paymentMode === 'Credit') {
        const potentialOutstanding = customerDoc.outstandingBalance + totalAmount;
        if (potentialOutstanding > customerDoc.creditLimit) {
          res.status(400).json({ 
            message: `Credit limit exceeded! Customer outstanding limit is ₹${customerDoc.creditLimit}, current balance is ₹${customerDoc.outstandingBalance}. Cannot book ₹${totalAmount} invoice.` 
          });
          return;
        }

        customerDoc.outstandingBalance = Math.round(potentialOutstanding * 100) / 100;
        await customerDoc.save();

        // Save Customer ledger invoice entry (positive amount increases outstanding)
        await CustomerLedger.create({
          tenantId: req.tenantId,
          customer: customerId,
          date: new Date(),
          description: `Invoice booked (Credit)`,
          type: 'INVOICE',
          amount: totalAmount,
          balance: customerDoc.outstandingBalance
        });
      }
    } else {
      if (paymentMode === 'Credit') {
        res.status(400).json({ message: 'Credit sales require a registered customer.' });
        return;
      }
    }

    // 3. Create Order
    const order = new Order({
      tenantId: req.tenantId,
      customer: customerId || undefined,
      customerName: customerDoc ? customerDoc.name : 'Counter Guest',
      items: processedItems,
      totalAmount,
      orderDate: new Date(),
      status: 'Delivered', // CounterPOS is fulfilled immediately
      paymentMode,
      paymentStatus: paymentMode === 'Credit' ? 'Unpaid' : 'Paid',
      source: 'Counter',
      notes
    });

    await order.save();

    // 4. Update Cash Galla if paymentMode is Cash
    if (paymentMode === 'Cash') {
      await CashTransaction.create({
        tenantId: req.tenantId,
        date: new Date(),
        type: 'CASH_SALE',
        amount: totalAmount,
        description: `Counter Cash Sale: Order #${order._id.toString().slice(-6).toUpperCase()}`,
        referenceId: order._id
      });
    }

    res.status(201).json(order);
  } catch (error) {
    console.error('Create Invoice Error:', error);
    res.status(500).json({ message: 'Error processing POS billing.' });
  }
};

export const receiveCustomerPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // customer ID
    const { amount, paymentMode, referenceNumber, notes } = req.body;

    if (!amount || amount <= 0 || !paymentMode) {
      res.status(400).json({ message: 'Valid amount and payment mode are required.' });
      return;
    }

    const customer = await Customer.findOne({ _id: id, tenantId: req.tenantId });
    if (!customer) {
      res.status(404).json({ message: 'Customer not found.' });
      return;
    }

    // Deduct from customer outstanding balance
    customer.outstandingBalance = Math.round((customer.outstandingBalance - amount) * 100) / 100;
    await customer.save();

    // Write to Customer ledger (negative amount decreases outstanding)
    const ledger = new CustomerLedger({
      tenantId: req.tenantId,
      customer: customer._id,
      date: new Date(),
      description: `Payment received via ${paymentMode}`,
      type: 'PAYMENT',
      amount: -amount,
      balance: customer.outstandingBalance,
      notes
    });
    await ledger.save();

    // Record Cash Galla transaction if paid in Cash
    if (paymentMode === 'Cash') {
      await CashTransaction.create({
        tenantId: req.tenantId,
        date: new Date(),
        type: 'CUSTOMER_COLLECTION',
        amount: amount,
        description: `Customer Collection - ${customer.name}`,
        referenceId: ledger._id
      });
    }

    res.status(200).json(ledger);
  } catch (error) {
    console.error('Receive Customer Payment Error:', error);
    res.status(500).json({ message: 'Error receiving customer payment.' });
  }
};

export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const customers = await Customer.find({ tenantId: req.tenantId }).sort({ name: 1 });
    res.json(customers);
  } catch (error) {
    console.error('Get Customers Error:', error);
    res.status(500).json({ message: 'Error loading customers list.' });
  }
};

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, search, barcode } = req.query;
    const filter: any = { tenantId: req.tenantId, status: 'Active' };

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (barcode) {
      filter.barcode = barcode;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(filter).sort({ name: 1 });
    res.json(products);
  } catch (error) {
    console.error('Get Products Error:', error);
    res.status(500).json({ message: 'Error loading product menu list.' });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, unit, sellingPrice, costPrice, stockQty, barcode } = req.body;

    if (!name || !category || !unit || sellingPrice === undefined) {
      res.status(400).json({ message: 'Name, Category, Unit, and Selling Price are required.' });
      return;
    }

    const product = new Product({
      tenantId: req.tenantId,
      name,
      category,
      unit,
      sellingPrice: Number(sellingPrice),
      costPrice: Number(costPrice) || 0,
      stockQty: Number(stockQty) || 0,
      barcode: barcode ? String(barcode).trim() : undefined,
      status: 'Active'
    });

    await product.save();
    res.status(201).json(product);
  } catch (error: any) {
    console.error('Create Product Error:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'A product with this name or barcode already exists.' });
      return;
    }
    res.status(500).json({ message: 'Error creating new product.' });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, category, unit, sellingPrice, costPrice, stockQty, barcode, status } = req.body;

    const product = await Product.findOne({ _id: id, tenantId: req.tenantId });
    if (!product) {
      res.status(404).json({ message: 'Product not found.' });
      return;
    }

    if (name !== undefined) product.name = name;
    if (category !== undefined) product.category = category;
    if (unit !== undefined) product.unit = unit;
    if (sellingPrice !== undefined) product.sellingPrice = Number(sellingPrice);
    if (costPrice !== undefined) product.costPrice = Number(costPrice);
    if (stockQty !== undefined) product.stockQty = Number(stockQty);
    if (barcode !== undefined) product.barcode = barcode ? String(barcode).trim() : undefined;
    if (status !== undefined) product.status = status;

    await product.save();
    res.json(product);
  } catch (error) {
    console.error('Update Product Error:', error);
    res.status(500).json({ message: 'Error updating product.' });
  }
};

export const getProductByBarcode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { barcode } = req.params;
    const product = await Product.findOne({
      tenantId: req.tenantId,
      barcode: String(barcode).trim(),
      status: 'Active'
    });

    if (!product) {
      res.status(404).json({ message: `No product found with barcode ${barcode}` });
      return;
    }

    res.json(product);
  } catch (error) {
    console.error('Get Product By Barcode Error:', error);
    res.status(500).json({ message: 'Error finding product by barcode.' });
  }
};

export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, startDate, endDate, customerId, paymentMode, search } = req.query;
    const filter: any = { tenantId: req.tenantId };

    if (customerId) {
      filter.customer = customerId;
    }
    if (paymentMode) {
      filter.paymentMode = paymentMode;
    }
    if (date) {
      const s = new Date(date as string);
      s.setHours(0, 0, 0, 0);
      const e = new Date(date as string);
      e.setHours(23, 59, 59, 999);
      filter.orderDate = { $gte: s, $lte: e };
    } else if (startDate || endDate) {
      filter.orderDate = {};
      if (startDate) {
        const s = new Date(startDate as string);
        s.setHours(0, 0, 0, 0);
        filter.orderDate.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate as string);
        e.setHours(23, 59, 59, 999);
        filter.orderDate.$lte = e;
      }
    }

    if (search) {
      filter.customerName = { $regex: search, $options: 'i' };
    }

    const orders = await Order.find(filter)
      .populate('customer', 'name mobile')
      .populate('items.product', 'name unit category')
      .sort({ orderDate: -1, createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Get Orders Error:', error);
    res.status(500).json({ message: 'Error retrieving orders list.' });
  }
};


