import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { Order } from '../models/Order';
import { MilkCollection } from '../models/MilkCollection';
import { ProductionBatch } from '../models/ProductionBatch';
import { DailyClosing } from '../models/DailyClosing';
import { CashTransaction } from '../models/CashTransaction';

// Helper to ensure basic dairy products exist for new tenants
const ensureDefaultProducts = async (tenantId: any) => {
  let products = await Product.find({ tenantId });
  if (products.length === 0) {
    const defaults = [
      { name: 'Fresh Paneer', category: 'Paneer', unit: 'kg', sellingPrice: 360, costPrice: 260, stockQty: 50 },
      { name: 'Buffalo Milk', category: 'Milk', unit: 'Litre', sellingPrice: 65, costPrice: 48, stockQty: 200 },
      { name: 'Cow Milk', category: 'Milk', unit: 'Litre', sellingPrice: 55, costPrice: 40, stockQty: 150 },
      { name: 'Desi Ghee', category: 'Ghee', unit: 'kg', sellingPrice: 720, costPrice: 550, stockQty: 20 },
      { name: 'Fresh Dahi / Curd', category: 'Curd', unit: 'Litre', sellingPrice: 60, costPrice: 42, stockQty: 30 },
      { name: 'Malai / Cream', category: 'Cream', unit: 'kg', sellingPrice: 380, costPrice: 280, stockQty: 15 },
    ];
    await Product.insertMany(defaults.map(d => ({ ...d, tenantId })));
    products = await Product.find({ tenantId });
  }
  return products;
};

export const parseWhatsAppMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, senderMobile } = req.body;

    if (!message || message.trim() === '') {
      res.status(400).json({ message: 'WhatsApp संदेश (Message text) आवश्यक है।' });
      return;
    }

    // 1. Identify or lookup customer
    const customer = senderMobile 
      ? await Customer.findOne({ tenantId: req.tenantId, mobile: senderMobile.trim() })
      : null;

    const customerName = customer ? customer.name : (senderMobile ? `Customer (${senderMobile})` : 'WhatsApp Guest');

    // 2. Fetch or ensure products exist
    let products = await ensureDefaultProducts(req.tenantId);

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_KEY;
    let parsedItems: Array<{ product: any; quantity: number; rate: number; amount: number }> = [];

    // 3. Try Google Gemini AI 1.5 Flash via REST API
    if (apiKey && apiKey.trim() !== '') {
      try {
        const prompt = `You are the WhatsApp Order Automation Engine for an Indian Dairy.
A customer sent this message on WhatsApp: "${message}"

Available Products in Dairy:
${products.map(p => `ID: ${p._id}, Name: ${p.name}, Category: ${p.category}, Unit: ${p.unit}, Price: ₹${p.sellingPrice}/${p.unit}`).join('\n')}

Extract every product ordered with its quantity. Match each item with the closest available product from the list above.
If the customer asks for "milk" or "doodh", map to Buffalo Milk or Cow Milk.
If the customer asks for "paneer", map to Fresh Paneer or Paneer product.
If the customer asks for "ghee", map to Desi Ghee.
If the customer asks for "dahi" or "curd" or "lassi", map to Fresh Dahi / Curd.

Respond ONLY with this exact JSON format:
{
  "items": [
    {
      "productId": "string (matching product ID from list)",
      "productName": "string",
      "quantity": number,
      "unit": "string",
      "rate": number,
      "amount": number
    }
  ],
  "totalAmount": number
}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data: any = await response.json();
          const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textOutput) {
            const json = JSON.parse(textOutput);
            if (json.items && Array.isArray(json.items) && json.items.length > 0) {
              for (const it of json.items) {
                const matchedProd = products.find(p => String(p._id) === String(it.productId)) ||
                  products.find(p => p.name.toLowerCase().includes((it.productName || '').toLowerCase()) || (it.productName || '').toLowerCase().includes(p.name.toLowerCase()));

                if (matchedProd) {
                  const qty = Number(it.quantity) || 1;
                  const rate = Number(it.rate) || matchedProd.sellingPrice || 50;
                  const amount = Math.round(qty * rate * 100) / 100;
                  parsedItems.push({
                    product: matchedProd._id,
                    quantity: qty,
                    rate,
                    amount
                  });
                }
              }
            }
          }
        }
      } catch (geminiErr: any) {
        console.warn('Gemini WhatsApp parse failed, falling back to NLP regex:', geminiErr.message);
      }
    }

    // 4. Fallback Rule-Based NLP Parser (if Gemini was unavailable or returned empty)
    if (parsedItems.length === 0) {
      const lowerMsg = message.toLowerCase();

      // Check Paneer
      const paneerMatch = lowerMsg.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|k|ग्राम|किलो)?\s*(?:paneer|पनीर)/i) ||
        lowerMsg.match(/(?:paneer|पनीर)\s*(\d+(?:\.\d+)?)\s*(?:kg|kilo|k|किलो)?/i);
      if (paneerMatch) {
        const qty = parseFloat(paneerMatch[1]) || 1;
        const prod = products.find(p => p.category?.toLowerCase() === 'paneer' || p.name.toLowerCase().includes('paneer')) || products[0];
        if (prod) {
          const rate = prod.sellingPrice || 360;
          parsedItems.push({ product: prod._id, quantity: qty, rate, amount: Math.round(qty * rate * 100) / 100 });
        }
      }

      // Check Milk
      const milkMatch = lowerMsg.match(/(\d+(?:\.\d+)?)\s*(?:ltr|litre|liter|l|लीटर|लीटर)?\s*(?:milk|doodh|दूध)/i) ||
        lowerMsg.match(/(?:milk|doodh|दूध)\s*(\d+(?:\.\d+)?)\s*(?:ltr|litre|l|लीटर)?/i);
      if (milkMatch) {
        const qty = parseFloat(milkMatch[1]) || 1;
        const prod = products.find(p => p.category?.toLowerCase() === 'milk' || p.name.toLowerCase().includes('milk') || p.name.toLowerCase().includes('दूध')) || products[0];
        if (prod) {
          const rate = prod.sellingPrice || 60;
          parsedItems.push({ product: prod._id, quantity: qty, rate, amount: Math.round(qty * rate * 100) / 100 });
        }
      }

      // Check Ghee
      const gheeMatch = lowerMsg.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|k|लीटर|किलो)?\s*(?:ghee|घी)/i) ||
        lowerMsg.match(/(?:ghee|घी)\s*(\d+(?:\.\d+)?)\s*(?:kg|kilo|k|किलो)?/i);
      if (gheeMatch) {
        const qty = parseFloat(gheeMatch[1]) || 1;
        const prod = products.find(p => p.category?.toLowerCase() === 'ghee' || p.name.toLowerCase().includes('ghee') || p.name.toLowerCase().includes('घी')) || products[0];
        if (prod) {
          const rate = prod.sellingPrice || 720;
          parsedItems.push({ product: prod._id, quantity: qty, rate, amount: Math.round(qty * rate * 100) / 100 });
        }
      }

      // Check Curd / Dahi
      const curdMatch = lowerMsg.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|l|ltr|लीटर|किलो)?\s*(?:curd|dahi|दही|lassi)/i) ||
        lowerMsg.match(/(?:curd|dahi|दही|lassi)\s*(\d+(?:\.\d+)?)/i);
      if (curdMatch) {
        const qty = parseFloat(curdMatch[1]) || 1;
        const prod = products.find(p => p.category?.toLowerCase() === 'curd' || p.name.toLowerCase().includes('curd') || p.name.toLowerCase().includes('dahi')) || products[0];
        if (prod) {
          const rate = prod.sellingPrice || 60;
          parsedItems.push({ product: prod._id, quantity: qty, rate, amount: Math.round(qty * rate * 100) / 100 });
        }
      }
    }

    if (parsedItems.length === 0) {
      res.status(400).json({
        message: 'संदेश में कोई डेयरी उत्पाद (पनीर, दूध, घी, दही) नहीं मिला। कृपया उदाहरण: "Need 2 kg Paneer and 10 ltr Milk" लिखें।'
      });
      return;
    }

    const totalAmount = Math.round(parsedItems.reduce((sum, it) => sum + it.amount, 0) * 100) / 100;

    // 5. Create WhatsApp Order in Pending status
    const order = new Order({
      tenantId: req.tenantId,
      customer: customer?._id || undefined,
      customerName,
      items: parsedItems,
      totalAmount,
      orderDate: new Date(),
      status: 'Pending',
      paymentMode: 'Cash',
      paymentStatus: 'Unpaid',
      source: 'WhatsApp',
      notes: `WhatsApp Order from ${senderMobile || 'Guest'}: "${message}"`
    });

    await order.save();

    // Populate order items product for rich response
    const populatedOrder = await Order.findById(order._id).populate('items.product', 'name category unit sellingPrice');

    res.status(201).json({
      message: 'WhatsApp ऑर्डर सफलतापूर्वक दर्ज हो गया!',
      order: populatedOrder,
      customerName,
      totalAmount,
      itemsCount: parsedItems.length
    });
  } catch (error) {
    console.error('WhatsApp parsing error:', error);
    res.status(500).json({ message: 'WhatsApp संदेश प्रोसेस करने में त्रुटि हुई।' });
  }
};

export const askAssistant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.body;
    if (!query) {
      res.status(400).json({ message: 'Query string is required.' });
      return;
    }

    const q = query.toLowerCase();
    let reply = '';
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    if (q.includes('galla') || q.includes('cash') || q.includes('money')) {
      // Reconcile expected cash Galla
      const lastClosing = await DailyClosing.findOne({ tenantId: req.tenantId, isClosed: true }).sort({ date: -1 });
      const openingCash = lastClosing ? lastClosing.summary.actualGalla : 10000;
      
      const transactions = await CashTransaction.find({
        tenantId: req.tenantId,
        date: { $gte: startOfDay, $lte: endOfDay }
      });

      const cashSales = transactions.filter(t => t.type === 'CASH_SALE').reduce((acc, curr) => acc + curr.amount, 0);
      const collections = transactions.filter(t => t.type === 'CUSTOMER_COLLECTION').reduce((acc, curr) => acc + curr.amount, 0);
      const farmerPayments = Math.abs(transactions.filter(t => t.type === 'FARMER_PAYMENT').reduce((acc, curr) => acc + curr.amount, 0));
      const expenses = Math.abs(transactions.filter(t => t.type === 'EXPENSE').reduce((acc, curr) => acc + curr.amount, 0));

      const expectedGalla = Math.round((openingCash + cashSales + collections - farmerPayments - expenses) * 100) / 100;

      reply = `Today's expected cash Galla is ₹${expectedGalla.toLocaleString('en-IN')}. (Opening cash: ₹${openingCash}, Cash Sales: ₹${cashSales}, Collections: ₹${collections}, Expenses: ₹${expenses}, Farmer payouts in cash: ₹${farmerPayments}).`;
    } 
    else if (q.includes('milk') || q.includes('collection') || q.includes('collect')) {
      const collections = await MilkCollection.find({
        tenantId: req.tenantId,
        date: { $gte: startOfDay, $lte: endOfDay }
      });

      const totalQty = collections.reduce((acc, curr) => acc + curr.quantity, 0);
      let avgFat = 0;
      let avgSnf = 0;
      if (totalQty > 0) {
        avgFat = collections.reduce((acc, curr) => acc + ((curr.fat || 0) * curr.quantity), 0) / totalQty;
        avgSnf = collections.reduce((acc, curr) => acc + ((curr.snf || 0) * curr.quantity), 0) / totalQty;
      }

      reply = `Today we collected a total of ${totalQty.toFixed(1)}L of raw milk. Weighted Pool Averages - FAT: ${avgFat.toFixed(2)}%, SNF: ${avgSnf.toFixed(2)}% across ${collections.length} farmer collections.`;
    } 
    else if (q.includes('paneer') || q.includes('produce') || q.includes('production') || q.includes('batch')) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const completedBatches = await ProductionBatch.find({
        tenantId: req.tenantId,
        status: 'Completed',
        date: { $gte: sevenDaysAgo }
      });

      const totalYield = completedBatches.reduce((acc, curr) => acc + (curr.actualOutput || 0), 0);
      reply = `In the last 7 days, we successfully completed ${completedBatches.length} production batches. Total finished paneer yield obtained was ${totalYield.toFixed(1)} KG.`;
    } 
    else if (q.includes('farmer') || q.includes('settlement') || q.includes('advance') || q.includes('ledger')) {
      // Search collections today to calculate what is outstanding
      const collections = await MilkCollection.find({
        tenantId: req.tenantId,
        date: { $gte: startOfDay, $lte: endOfDay }
      });
      const milkAmt = collections.reduce((acc, curr) => acc + curr.amount, 0);
      reply = `Milk pool value booked today is ₹${milkAmt.toLocaleString('en-IN')}. Check the Ledger Settlements tab under Payments to verify farmer-wise payouts.`;
    } 
    else {
      reply = `I am your Smart Dairy AI Business Assistant. Try asking me:
- "How much cash do we have in Galla today?"
- "What is today's total milk collection pool?"
- "How much paneer was produced this week?"
- "What is the farmer settlement pool status?"`;
    }

    res.json({ reply });
  } catch (error) {
    console.error('AI assistant error:', error);
    res.status(500).json({ message: 'Error processing AI query.' });
  }
};
