"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
async function testWhatsAppPrompt() {
    const message = 'Need 2 kg Paneer and 10 ltr Milk';
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    console.log('Testing WhatsApp AI Parse for prompt:', message);
    console.log('API Key present:', apiKey ? 'YES (length: ' + apiKey.length + ')' : 'NO');
    const products = [
        { _id: '65e01', name: 'Fresh Paneer', category: 'Paneer', unit: 'kg', sellingPrice: 360 },
        { _id: '65e02', name: 'Buffalo Milk', category: 'Milk', unit: 'Litre', sellingPrice: 65 },
        { _id: '65e03', name: 'Desi Ghee', category: 'Ghee', unit: 'kg', sellingPrice: 720 },
    ];
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey?.trim()}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1
            }
        })
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Gemini Full Data:', JSON.stringify(data, null, 2));
}
testWhatsAppPrompt();
