"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrders = exports.getProductByBarcode = exports.updateProduct = exports.createProduct = exports.getProducts = exports.getCustomers = exports.receiveCustomerPayment = exports.createInvoice = void 0;
const Product_1 = require("../models/Product");
const Customer_1 = require("../models/Customer");
const Order_1 = require("../models/Order");
const CustomerLedger_1 = require("../models/CustomerLedger");
const CashTransaction_1 = require("../models/CashTransaction");
const InventoryTransaction_1 = require("../models/InventoryTransaction");
const createInvoice = async (req, res) => {
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
            const product = await Product_1.Product.findOne({ _id: item.productId, tenantId: req.tenantId });
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
            await InventoryTransaction_1.InventoryTransaction.create({
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
            customerDoc = await Customer_1.Customer.findOne({ _id: customerId, tenantId: req.tenantId });
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
                await CustomerLedger_1.CustomerLedger.create({
                    tenantId: req.tenantId,
                    customer: customerId,
                    date: new Date(),
                    description: `Invoice booked (Credit)`,
                    type: 'INVOICE',
                    amount: totalAmount,
                    balance: customerDoc.outstandingBalance
                });
            }
        }
        else {
            if (paymentMode === 'Credit') {
                res.status(400).json({ message: 'Credit sales require a registered customer.' });
                return;
            }
        }
        // 3. Create Order
        const order = new Order_1.Order({
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
            await CashTransaction_1.CashTransaction.create({
                tenantId: req.tenantId,
                date: new Date(),
                type: 'CASH_SALE',
                amount: totalAmount,
                description: `Counter Cash Sale: Order #${order._id.toString().slice(-6).toUpperCase()}`,
                referenceId: order._id
            });
        }
        res.status(201).json(order);
    }
    catch (error) {
        console.error('Create Invoice Error:', error);
        res.status(500).json({ message: 'Error processing POS billing.' });
    }
};
exports.createInvoice = createInvoice;
const receiveCustomerPayment = async (req, res) => {
    try {
        const { id } = req.params; // customer ID
        const { amount, paymentMode, referenceNumber, notes } = req.body;
        if (!amount || amount <= 0 || !paymentMode) {
            res.status(400).json({ message: 'Valid amount and payment mode are required.' });
            return;
        }
        const customer = await Customer_1.Customer.findOne({ _id: id, tenantId: req.tenantId });
        if (!customer) {
            res.status(404).json({ message: 'Customer not found.' });
            return;
        }
        // Deduct from customer outstanding balance
        customer.outstandingBalance = Math.round((customer.outstandingBalance - amount) * 100) / 100;
        await customer.save();
        // Write to Customer ledger (negative amount decreases outstanding)
        const ledger = new CustomerLedger_1.CustomerLedger({
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
            await CashTransaction_1.CashTransaction.create({
                tenantId: req.tenantId,
                date: new Date(),
                type: 'CUSTOMER_COLLECTION',
                amount: amount,
                description: `Customer Collection - ${customer.name}`,
                referenceId: ledger._id
            });
        }
        res.status(200).json(ledger);
    }
    catch (error) {
        console.error('Receive Customer Payment Error:', error);
        res.status(500).json({ message: 'Error receiving customer payment.' });
    }
};
exports.receiveCustomerPayment = receiveCustomerPayment;
const getCustomers = async (req, res) => {
    try {
        const customers = await Customer_1.Customer.find({ tenantId: req.tenantId }).sort({ name: 1 });
        res.json(customers);
    }
    catch (error) {
        console.error('Get Customers Error:', error);
        res.status(500).json({ message: 'Error loading customers list.' });
    }
};
exports.getCustomers = getCustomers;
const getProducts = async (req, res) => {
    try {
        const { category, search, barcode } = req.query;
        const filter = { tenantId: req.tenantId, status: 'Active' };
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
        const products = await Product_1.Product.find(filter).sort({ name: 1 });
        res.json(products);
    }
    catch (error) {
        console.error('Get Products Error:', error);
        res.status(500).json({ message: 'Error loading product menu list.' });
    }
};
exports.getProducts = getProducts;
const createProduct = async (req, res) => {
    try {
        const { name, category, unit, sellingPrice, costPrice, stockQty, barcode } = req.body;
        if (!name || !category || !unit || sellingPrice === undefined) {
            res.status(400).json({ message: 'Name, Category, Unit, and Selling Price are required.' });
            return;
        }
        const product = new Product_1.Product({
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
    }
    catch (error) {
        console.error('Create Product Error:', error);
        if (error.code === 11000) {
            res.status(400).json({ message: 'A product with this name or barcode already exists.' });
            return;
        }
        res.status(500).json({ message: 'Error creating new product.' });
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, unit, sellingPrice, costPrice, stockQty, barcode, status } = req.body;
        const product = await Product_1.Product.findOne({ _id: id, tenantId: req.tenantId });
        if (!product) {
            res.status(404).json({ message: 'Product not found.' });
            return;
        }
        if (name !== undefined)
            product.name = name;
        if (category !== undefined)
            product.category = category;
        if (unit !== undefined)
            product.unit = unit;
        if (sellingPrice !== undefined)
            product.sellingPrice = Number(sellingPrice);
        if (costPrice !== undefined)
            product.costPrice = Number(costPrice);
        if (stockQty !== undefined)
            product.stockQty = Number(stockQty);
        if (barcode !== undefined)
            product.barcode = barcode ? String(barcode).trim() : undefined;
        if (status !== undefined)
            product.status = status;
        await product.save();
        res.json(product);
    }
    catch (error) {
        console.error('Update Product Error:', error);
        res.status(500).json({ message: 'Error updating product.' });
    }
};
exports.updateProduct = updateProduct;
const getProductByBarcode = async (req, res) => {
    try {
        const { barcode } = req.params;
        const product = await Product_1.Product.findOne({
            tenantId: req.tenantId,
            barcode: String(barcode).trim(),
            status: 'Active'
        });
        if (!product) {
            res.status(404).json({ message: `No product found with barcode ${barcode}` });
            return;
        }
        res.json(product);
    }
    catch (error) {
        console.error('Get Product By Barcode Error:', error);
        res.status(500).json({ message: 'Error finding product by barcode.' });
    }
};
exports.getProductByBarcode = getProductByBarcode;
const getOrders = async (req, res) => {
    try {
        const { date, startDate, endDate, customerId, paymentMode, search } = req.query;
        const filter = { tenantId: req.tenantId };
        if (customerId) {
            filter.customer = customerId;
        }
        if (paymentMode) {
            filter.paymentMode = paymentMode;
        }
        if (date) {
            const s = new Date(date);
            s.setHours(0, 0, 0, 0);
            const e = new Date(date);
            e.setHours(23, 59, 59, 999);
            filter.orderDate = { $gte: s, $lte: e };
        }
        else if (startDate || endDate) {
            filter.orderDate = {};
            if (startDate) {
                const s = new Date(startDate);
                s.setHours(0, 0, 0, 0);
                filter.orderDate.$gte = s;
            }
            if (endDate) {
                const e = new Date(endDate);
                e.setHours(23, 59, 59, 999);
                filter.orderDate.$lte = e;
            }
        }
        if (search) {
            filter.customerName = { $regex: search, $options: 'i' };
        }
        const orders = await Order_1.Order.find(filter)
            .populate('customer', 'name mobile')
            .populate('items.product', 'name unit category')
            .sort({ orderDate: -1, createdAt: -1 });
        res.json(orders);
    }
    catch (error) {
        console.error('Get Orders Error:', error);
        res.status(500).json({ message: 'Error retrieving orders list.' });
    }
};
exports.getOrders = getOrders;
