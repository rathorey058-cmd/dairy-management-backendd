/**
 * Gemini AI Voice NLP Service for Dairy App
 * Connects Google Gemini 1.5 Flash AI for natural Hindi / Hinglish understanding.
 * Zero-cost free tier compatible with automatic offline fallback.
 */

export interface GeminiVoiceContext {
  farmers: Array<{ _id: string; farmerId: string; name: string; mobile: string; village: string; fatRate?: number }>;
  products: Array<{ _id: string; name: string; category: string; sellingPrice: number; unit: string }>;
  rateCharts: any[];
  todayStr: string;
  tenantName?: string;
  customApiKey?: string;
}

export interface ParsedVoiceResult {
  actionType:
    | 'MILK_ENTRY'
    | 'DELETE_MILK_ENTRY'
    | 'PRODUCT_SALE'
    | 'FARMER_ADVANCE'
    | 'EXPENSE'
    | 'NAVIGATE'
    | 'REGISTER_FARMER'
    | 'CREATE_PRODUCT'
    | 'DIRECT_MILK_SALE'
    | 'FARMER_PAYMENT'
    | 'MILK_BANDHI_UPDATE'
    | 'COLLECT_DUE_PAYMENT'
    | 'DUE_PAYMENTS_QUERY'
    | 'REGISTER_BANDHI'
    | 'AI_QUERY'
    | 'UNKNOWN';
  previewTitle: string;
  previewDetails: Record<string, string>;
  data?: any;
  path?: string;
  audioResponse: string;
  transcript: string;
  isAIPowered?: boolean;
}

export const parseVoiceWithGemini = async (
  transcript: string,
  context: GeminiVoiceContext
): Promise<ParsedVoiceResult | null> => {
  const apiKey =
    context.customApiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_KEY;

  if (!apiKey || apiKey.trim() === '') {
    return null; // Fallback to local rule engine if no API key is provided
  }

  const { farmers, products, todayStr } = context;

  const farmersSummary = farmers
    .slice(0, 50)
    .map(f => `Code: ${f.farmerId}, Name: ${f.name}, Mobile: ${f.mobile}, Village: ${f.village}`)
    .join('\n');

  const productsSummary = products
    .slice(0, 30)
    .map(p => `Name: ${p.name}, Cat: ${p.category}, Rate: ₹${p.sellingPrice}/${p.unit}`)
    .join('\n');

  const systemPrompt = `You are the AI Voice Assistant for an Indian Dairy Management System (डेयरी सॉफ्टवेयर).
You understand spoken Hindi, Hinglish, Marathi, Marwari, Gujarati dialects, and English.

CURRENT DAIRY CONTEXT:
- Today's Date: ${todayStr}
- Registered Farmers:\n${farmersSummary || 'No farmers yet'}
- Registered Products:\n${productsSummary || 'No products yet'}

DATE & RANGE RULES (Use ${todayStr} as today):
- "kal", "yesterday", "beete kal": startDate = 1 day before today, endDate = 1 day before today
- "parson", "day before yesterday": startDate = 2 days before today, endDate = 2 days before today
- "aaj", "today": startDate = ${todayStr}, endDate = ${todayStr}
- "last 7 din", "pichle 7 din", "7 din ka", "last 7 days", "hafte ka": startDate = 6-7 days before today, endDate = ${todayStr}
- "pichle 15 din", "last 15 days": startDate = 14-15 days before today, endDate = ${todayStr}
- "is mahine", "this month": startDate = first day of current month, endDate = ${todayStr}
- "pichle mahine", "last month": startDate = first day of previous month, endDate = last day of previous month

SUPPORTED ACTION TYPES:
1. 'MILK_ENTRY': Farmer milk collection. Extract farmerId, farmerName, quantity, fat, snf, rate, totalAmount, shift ('Morning'/'Evening'), milkType ('Cow'/'Buffalo'/'Mixed').
   - Note: If user says two-digit fat like '54' or '62', it means 5.4% or 6.2% FAT.
2. 'DELETE_MILK_ENTRY': User wants to delete, cancel, or remove a milk collection entry (e.g. "Umrao Singh ki entry delete karo", "aaj ka doodh delete kar do", "Umrao Singh ka doodh cancel karo", "doodh entry hata do"). Extract farmerId, farmerName, date ('${todayStr}'), shift ('Morning'/'Evening' or null).
3. 'REGISTER_FARMER': Register new farmer. Extract name, mobile, village, farmerId (e.g. next code like 'F-0004').
4. 'DIRECT_MILK_SALE': Bulk milk sale at counter. Extract totalQuantity, rate, totalAmount, shift ('Morning'/'Evening'), milkTypeCategory ('superMilk'/'regularMilk'/'cowMilk').
5. 'FARMER_PAYMENT': Paying milk collection payment money to a farmer. Extract farmerId, farmerName, farmerCode, amount, paymentMode ('Cash').
6. 'FARMER_ADVANCE': Giving advance money to a milk supplier FARMER (किसान को अग्रिम/एडवांस देना). Extract farmerId, farmerName, farmerCode, amount. (MUST be used ONLY when explicitly specified for a milk supplier FARMER, e.g. "Farmer 1 ko advance", "Kisan Rahul ko 500 advance").
7. 'EXPENSE': Shop daily expense (diesel, chai, nasta, electricity, repairs). Extract title, amount, category.
8. 'PRODUCT_SALE': Selling paneer, ghee, curd, butter at counter. Extract productId, productName, quantity, unit, rate, totalAmount.
9. 'NAVIGATE': Navigation to screens with exact path:
   - Milk history / summary / records: path '/milk' or '/milk?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD'
   - Galla / Cash: path '/galla' or '/galla?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD'
   - Orders / Sales: path '/orders' or '/orders?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD'
   - Farmers list / ledger: path '/farmers' or '/farmers?search=NameOrCode'
   - Production / Stock: path '/production'
   - Milk Bandhi / Daily Delivery: path '/bandhi'
   - Due Payments / Udhari: path '/udhari'
   - Menu / Rates: path '/menu'
   - Day Close: path '/closeday'
   - Home Dashboard: path '/' (for 'hata do', 'band karo', 'home', 'dashboard', 'wapas')
10. 'MILK_BANDHI_UPDATE': Daily household milk delivery (दूध बांधी / नागा / छुट्टी).
    - User says e.g.: "बांधी नंबर 1, 2, 6 और 7 की दूध की बांधी आज नहीं गयी बाकी सब की गयी है" or "Bandhi 1, 2, 6, 7 ko doodh nahi gaya baki sabko gaya" or "aaj subah ki sabhi bandhi chali gayi" or "bandhi 3 ko 1L doodh extra diya"
    - Extract:
      * shift: 'Morning' or 'Evening' (default 'Morning')
      * date: '${todayStr}'
      * skippedBandhiNos: [1, 2, 6, 7] (array of numbers of customers who took leave / skipped delivery)
      * extraDeliveries: [{ bandhiNo: 3, extraQty: 1 }]
      * markAllOthersDelivered: true
    - previewTitle: "दूध बांधी वितरण अपडेट"
    - previewDetails: { "नागा बांधी नं": "1, 2, 6, 7", "शिफ्ट": "सुबह", "शेष बांधी": "वितरित (Delivered)" }
    - path: "/bandhi"
    - audioResponse: "बांधी नंबर 1, 2, 6 और 7 की नागा दर्ज कर दी गयी है, बाकी सभी का दूध वितरण रिकॉर्ड हो गया है।"
11. 'COLLECT_DUE_PAYMENT': Customer udhari / debt / payment collection (ग्राहकों की बाज़ार उधारी / उधार देना / उधार जमा / बकाया).
    - MUST be used whenever user mentions customer udhari, e.g.: "रमेश जी के 1000 रुपये उधार", "रमेश जी से 1000 रुपये उधारी जमा करो", "Bandhi 2 se 500 rupaye jama kar lo", "Customer Ramesh ko 1000 udhar diya"
    - Extract: customerName: "Ramesh", bandhiNo: 2 (if any), amount: 1000, paymentMode: "Cash"
    - previewTitle: "उधारी भुगतान जमा"
    - previewDetails: { "ग्राहक": "Ramesh", "जमा/उधार राशि": "₹1,000", "पेज": "बाजार उधारी (/udhari)" }
    - path: "/udhari"
    - audioResponse: "रमेश जी के खाते में 1000 रुपये उधारी दर्ज करने के लिए कन्फर्म करें। उधारी पेज खोला जा रहा है।"
12. 'DUE_PAYMENTS_QUERY': Inquiries about pending customer udhari (बाजार उधारी सूची / बकाया).
    - User says e.g.: "किस-किस की उधारी बाकी है?", "बाजार उधारी बताओ", "उधारी की लिस्ट दिखाओ", "Bandhi 2 ki udhari kitni hai"
    - Extract: queryType: "UDHARI", customerName (if specific), bandhiNo (if specific)
    - previewTitle: "बाजार उधारी खाता"
    - previewDetails: { "रिपोर्ट": "उधारी ग्राहक सूची" }
    - path: "/udhari"
    - audioResponse: "उधारी खाता और बकाया ग्राहकों की सूची दिखाई जा रही है।"
13. 'AI_QUERY': If user asks any business inquiry, questions in roundabout colloquial Hindi/Hinglish:
   - "kal ka galla batao", "kal ka hisaab batao", "kal kya kya hua tha?", "kya galla baitha?": data: { queryType: "GALLA", startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD" }, path: "/galla"
   - "aaj kitna doodh aaya", "kal kitna doodh aaya tha", "doodh ka hisaab", "kitna maal aaya": data: { queryType: "MILK", startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD" }, path: "/milk"
   - "aaj kya kya hua tha", "poora hisaab batao": data: { queryType: "OVERALL", startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD" }, path: "/galla"
14. 'UNKNOWN': If completely unclear or unrelated.

OUTPUT JSON FORMAT (Strictly return ONLY JSON):
{
  "actionType": "MILK_ENTRY" | "DELETE_MILK_ENTRY" | "REGISTER_FARMER" | "DIRECT_MILK_SALE" | "FARMER_PAYMENT" | "FARMER_ADVANCE" | "EXPENSE" | "PRODUCT_SALE" | "MILK_BANDHI_UPDATE" | "COLLECT_DUE_PAYMENT" | "DUE_PAYMENTS_QUERY" | "NAVIGATE" | "AI_QUERY" | "UNKNOWN",
  "previewTitle": "Clean Hindi/English Title",
  "previewDetails": { "Key in Hindi": "Value" },
  "data": { ...exact fields required for action execution... },
  "path": "/optional-navigation-path",
  "audioResponse": "Natural, polite, concise spoken Hindi response (1-2 sentences) confirming the action or answering the query."
}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: systemPrompt },
          { text: `USER SPOKEN COMMAND: "${transcript}"` }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json'
    }
  };

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey.trim()}`;
    
    // 4-second timeout for ultra-fast response, fallback to local engine if network lags
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Gemini API returned status ${response.status}. Falling back to local engine.`);
      return null;
    }

    const data: any = await response.json();
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textOutput) {
      return null;
    }

    const parsed: ParsedVoiceResult = JSON.parse(textOutput);
    parsed.transcript = transcript;
    parsed.isAIPowered = true;

    return parsed;
  } catch (err: any) {
    console.warn('Gemini Voice API call skipped or timed out:', err?.message || err);
    return null; // Seamless fallback to local rule engine
  }
};
