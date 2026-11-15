"use strict";
/**
 * Camera & Computer Vision AI Service for Dairy App
 * Supports:
 * 1. Hikvision IP Camera / NVR ISAPI HTTP Digest Authentication & snapshot capture
 * 2. Google Gemini 1.5 Flash Vision Multimodal OCR for Weighing Scales & Milk Analyzers
 * 3. Kirana Shelf & Block Inventory Scanning
 * 4. Person & Footfall Face Recognition & Visit Logging
 * 5. Dual-Audit Mismatch Analysis (AI vs Human Entry)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareReadings = exports.performGeminiPersonDetect = exports.performGeminiShelfScan = exports.performGeminiMilkOCR = exports.fetchHikvisionSnapshot = exports.fetchHikvisionSnapshotBuffer = exports.fetchSinglePathBuffer = exports.getDeviceCandidatePaths = void 0;
const http_1 = __importDefault(require("http"));
const crypto_1 = __importDefault(require("crypto"));
const md5 = (str) => {
    return crypto_1.default.createHash('md5').update(str).digest('hex');
};
/**
 * Helper to generate candidate snapshot paths for DVR, NVR, or IP camera
 */
const getDeviceCandidatePaths = (camera) => {
    const ch = camera.channel || 1;
    const strType = camera.streamType || 'sub';
    const brand = camera.brand || 'HIKVISION';
    const devType = camera.deviceType || 'DVR';
    const paths = [];
    // 1. User custom path if provided
    if (camera.snapshotUrl && camera.snapshotUrl.trim() !== '') {
        try {
            const u = new URL(camera.snapshotUrl.trim());
            paths.push(u.pathname + (u.search || ''));
        }
        catch (e) {
            paths.push(camera.snapshotUrl.trim());
        }
    }
    // 2. CP Plus / Dahua DVR & XVR paths
    if (brand === 'CP_PLUS' || brand === 'DAHUA') {
        paths.push(`/cgi-bin/snapshot.cgi?channel=${ch}`);
        paths.push(`/cgi-bin/snapshot.cgi?chn=${ch}`);
        paths.push(`/cgi-bin/snapshot.cgi?channel=${ch}&subtype=${strType === 'main' ? 0 : 1}`);
    }
    // 3. Hikvision DVR (Analog / Turbo HD) paths
    const streamNum = strType === 'main' ? 1 : 2;
    const streamId = `${ch * 100 + streamNum}`; // e.g. 101, 102, 201, 202
    if (devType === 'DVR') {
        // DVR Analog channels often respond to 101/102 or direct channel index
        paths.push(`/ISAPI/Streaming/channels/${streamId}/picture`);
        paths.push(`/ISAPI/Streaming/channels/${ch}/picture`);
        paths.push(`/Streaming/channels/${streamId}/picture`);
        paths.push(`/Streaming/channels/${ch}/picture`);
        paths.push(`/onvif-http/snapshot?channel=${ch}`);
        paths.push(`/ISAPI/ContentMgmt/InputProxy/channels/${ch}/picture`);
    }
    else {
        // NVR or Standalone IP Camera
        paths.push(`/ISAPI/Streaming/channels/${streamId}/picture`);
        paths.push(`/ISAPI/Streaming/channels/${ch}0${streamNum}/picture`);
        paths.push(`/Streaming/channels/${streamId}/picture`);
    }
    // Generic ONVIF & CGI fallbacks
    paths.push(`/onvif-http/snapshot?channel=${ch}`);
    paths.push(`/cgi-bin/snapshot.cgi?channel=${ch}`);
    // Deduplicate preserving priority order
    return Array.from(new Set(paths));
};
exports.getDeviceCandidatePaths = getDeviceCandidatePaths;
/**
 * Fetch snapshot from a single HTTP path with Digest/Basic auth support
 */
const fetchSinglePathBuffer = (ip, port, path, username, password) => {
    return new Promise((resolve, reject) => {
        const req1 = http_1.default.get({
            host: ip,
            port: port,
            path: path,
            timeout: 4500,
        }, (res1) => {
            if (res1.statusCode === 200) {
                const chunks = [];
                res1.on('data', (c) => chunks.push(c));
                res1.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    const contentType = res1.headers['content-type'] || 'image/jpeg';
                    resolve({ buffer, contentType });
                });
                return;
            }
            if (res1.statusCode !== 401) {
                reject(new Error(`HTTP status ${res1.statusCode} (${path})`));
                return;
            }
            const authHeader = res1.headers['www-authenticate'] || '';
            // Basic auth
            if (authHeader.toLowerCase().includes('basic') && !authHeader.toLowerCase().includes('digest')) {
                const authString = Buffer.from(`${username}:${password}`).toString('base64');
                http_1.default.get({
                    host: ip,
                    port: port,
                    path: path,
                    headers: { Authorization: `Basic ${authString}` },
                    timeout: 5000,
                }, (basicRes) => {
                    if (basicRes.statusCode === 200) {
                        const chunks = [];
                        basicRes.on('data', (c) => chunks.push(c));
                        basicRes.on('end', () => {
                            resolve({ buffer: Buffer.concat(chunks), contentType: basicRes.headers['content-type'] || 'image/jpeg' });
                        });
                    }
                    else {
                        reject(new Error(`बेसिक ऑथेंटिकेशन विफल (${basicRes.statusCode})`));
                    }
                }).on('error', (err) => reject(err));
                return;
            }
            // Digest auth
            const realmMatch = authHeader.match(/realm="([^"]+)"/);
            const nonceMatch = authHeader.match(/nonce="([^"]+)"/);
            const qopMatch = authHeader.match(/qop="([^"]+)"/);
            const opaqueMatch = authHeader.match(/opaque="([^"]+)"/);
            if (!realmMatch || !nonceMatch) {
                reject(new Error(`अमान्य Digest हेडर: ${authHeader}`));
                return;
            }
            const realm = realmMatch[1];
            const nonce = nonceMatch[1];
            const rawQop = (authHeader.match(/qop="?([^",\s]+)/) || [])[1] || '';
            const qop = rawQop.toLowerCase().includes('auth') ? 'auth' : rawQop;
            const opaque = opaqueMatch ? opaqueMatch[1] : '';
            const cnonce = '0a4f113b';
            const nc = '00000001';
            const ha1 = md5(`${username}:${realm}:${password}`);
            const ha2 = md5(`GET:${path}`);
            let responseHash;
            let authStr;
            if (qop) {
                responseHash = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
                authStr = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${path}", response="${responseHash}", qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
            }
            else {
                responseHash = md5(`${ha1}:${nonce}:${ha2}`);
                authStr = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${path}", response="${responseHash}"`;
            }
            if (opaque)
                authStr += `, opaque="${opaque}"`;
            if (authHeader.includes('algorithm="MD5"') || authHeader.includes('algorithm=MD5')) {
                authStr += `, algorithm=MD5`;
            }
            const req2 = http_1.default.get({
                host: ip,
                port: port,
                path: path,
                headers: {
                    Authorization: authStr,
                    Accept: 'image/jpeg, image/*',
                },
                timeout: 5000,
            }, (res2) => {
                if (res2.statusCode === 200) {
                    const chunks = [];
                    res2.on('data', (c) => chunks.push(c));
                    res2.on('end', () => {
                        const buffer = Buffer.concat(chunks);
                        const contentType = res2.headers['content-type'] || 'image/jpeg';
                        resolve({ buffer, contentType });
                    });
                }
                else if (res2.statusCode === 401) {
                    reject(new Error(`401 Unauthorized: पासवर्ड गलत है`));
                }
                else {
                    reject(new Error(`कैमरा एरर (HTTP ${res2.statusCode})`));
                }
            });
            req2.on('error', (err) => reject(err));
            req2.on('timeout', () => {
                req2.destroy();
                reject(new Error(`कैमरा रिस्पॉन्स टाइमआउट (${ip}:${port}${path})`));
            });
        });
        req1.on('error', (err) => reject(new Error(`कैमरा IP (${ip}:${port}) तक नहीं पहुँचा जा सका: ${err.message}`)));
        req1.on('timeout', () => {
            req1.destroy();
            reject(new Error(`कैमरा IP (${ip}:${port}) से कोई रिस्पॉन्स नहीं मिला (Timeout)`));
        });
    });
};
exports.fetchSinglePathBuffer = fetchSinglePathBuffer;
/**
 * Fetch snapshot from DVR, NVR, or IP Camera with Automatic Multi-Path Probing
 */
const fetchHikvisionSnapshotBuffer = async (camera) => {
    const ip = camera.ipAddress.trim();
    const port = camera.port || 80;
    const username = camera.username || 'admin';
    const password = camera.password || '';
    const candidatePaths = (0, exports.getDeviceCandidatePaths)(camera);
    let lastError = null;
    let unauthorizedEncountered = false;
    for (const path of candidatePaths) {
        try {
            const res = await (0, exports.fetchSinglePathBuffer)(ip, port, path, username, password);
            return { ...res, workingPath: path };
        }
        catch (err) {
            lastError = err;
            if (err.message && err.message.includes('401')) {
                unauthorizedEncountered = true;
            }
        }
    }
    if (unauthorizedEncountered) {
        throw new Error(`डिवाइस 401 Unauthorized: ${camera.deviceType || 'DVR'} का पासवर्ड या यूजरनेम गलत है। (यूजरनेम डिफ़ॉल्ट 'admin' रखें)`);
    }
    throw new Error(`${camera.deviceType || 'DVR/NVR'} (${ip}:${port}) से स्नैपशॉट नहीं मिला। कृपया चैनल नंबर (${camera.channel}) या इंटीग्रेशन प्रोटोकॉल जांचें।`);
};
exports.fetchHikvisionSnapshotBuffer = fetchHikvisionSnapshotBuffer;
/**
 * Fetch snapshot as Base64 Data URL (supports DVR, NVR & IP cameras)
 */
const fetchHikvisionSnapshot = async (camera) => {
    const { buffer, contentType } = await (0, exports.fetchHikvisionSnapshotBuffer)(camera);
    const base64 = buffer.toString('base64');
    return `data:${contentType};base64,${base64}`;
};
exports.fetchHikvisionSnapshot = fetchHikvisionSnapshot;
/**
 * Extract clean base64 string and mimeType from data URL
 */
const cleanBase64 = (rawImage) => {
    let mimeType = 'image/jpeg';
    let base64Data = rawImage;
    if (rawImage.startsWith('data:')) {
        const commaIdx = rawImage.indexOf(',');
        if (commaIdx !== -1) {
            const meta = rawImage.substring(5, commaIdx);
            if (meta.includes('image/png'))
                mimeType = 'image/png';
            else if (meta.includes('image/webp'))
                mimeType = 'image/webp';
            else if (meta.includes('image/jpeg') || meta.includes('image/jpg'))
                mimeType = 'image/jpeg';
            base64Data = rawImage.substring(commaIdx + 1);
        }
    }
    return { base64Data: base64Data.trim(), mimeType };
};
/**
 * Shared helper to query active Gemini models with sequential fallback
 */
async function callGeminiVision(apiKey, requestBody, timeoutMs = 15000) {
    const models = [
        'gemini-3.5-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash-lite',
        'gemini-flash-lite-latest',
        'gemini-3-flash-preview',
        'gemini-flash-latest'
    ];
    let lastErr = '';
    for (const m of models) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey.trim()}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok) {
                return await res.json();
            }
            lastErr = await res.text();
            console.warn(`Vision Model ${m} status ${res.status}:`, lastErr.substring(0, 100));
        }
        catch (e) {
            clearTimeout(timeoutId);
            lastErr = e.message || String(e);
        }
    }
    throw new Error(`Gemini Vision API error: ${lastErr.substring(0, 200)}`);
}
/**
 * Perform Gemini Vision OCR on Weighing Scale and Fat Machine displays
 * STRICT ZERO-FAKE-DATA POLICY:
 * Returns null if no actual scale/fat machine display is visible.
 */
const performGeminiMilkOCR = async (rawImage, customApiKey) => {
    const apiKey = customApiKey ||
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        process.env.GEMINI_KEY;
    const { base64Data, mimeType } = cleanBase64(rawImage);
    if (!base64Data || base64Data.length < 50) {
        return {
            weight: null,
            fat: null,
            snf: null,
            clr: null,
            confidence: 0,
            rawDetectedText: 'कोई इमेज प्राप्त नहीं हुई',
            farmerTag: null,
            notes: 'इमेज खाली है। कृपया कैमरा चालू करें या फोटो अपलोड करें।',
            isAiPowered: false
        };
    }
    if (!apiKey || apiKey.trim() === '') {
        return {
            weight: null,
            fat: null,
            snf: null,
            clr: null,
            confidence: 0,
            rawDetectedText: 'GEMINI_API_KEY नॉट फाउंड',
            notes: 'कृपया server/.env में GEMINI_API_KEY जोड़ें।',
            farmerTag: null,
            isAiPowered: false
        };
    }
    const systemPrompt = `You are a real-time, precision Computer Vision AI for an Indian Dairy Weighing Scale and Milk Analyzer.
Analyze this photo taken from a dairy counter or camera.

CRITICAL ACCURACY & INTEGRITY RULES:
1. ONLY return a numeric "weight" if a genuine physical digital scale display (seven-segment LED/LCD showing kilograms or liters) is clearly visible. If no digital weighing scale is visible in this photo, YOU MUST RETURN null for weight.
2. ONLY return a numeric "fat" or "snf" if a genuine milk analyzer (Lactometer / Milk tester LCD) is clearly visible. If no analyzer screen is visible, YOU MUST RETURN null for fat, snf, and clr.
3. DO NOT GUESS, SIMULATE, OR INVENT NUMBERS. If the camera is showing a wall, ceiling, person, floor, room, or blurred background without any digital meter, return null for all values and explain in "notes" that no measuring equipment is in view.
4. If a digital display IS visible:
   - "weight": Number in Ltr / KG (e.g. 14.50, 20.0).
   - "fat": FAT % (e.g. 4.2, 5.8).
   - "snf": SNF % (e.g. 8.5, 8.8).
   - "clr": CLR / Density reading if shown (e.g. 28, 29).
   - "confidence": Float between 0.1 and 1.0.
   - "rawDetectedText": Exact digits and text visible on the meter.
   - "farmerTag": Visible can code or token if shown.

STRICT JSON OUTPUT ONLY (no markdown fences, no extra text):
{
  "weight": number | null,
  "fat": number | null,
  "snf": number | null,
  "clr": number | null,
  "confidence": number,
  "rawDetectedText": string,
  "farmerTag": string | null,
  "notes": string
}`;
    const requestBody = {
        contents: [
            {
                role: 'user',
                parts: [
                    { text: systemPrompt },
                    {
                        inlineData: {
                            mimeType,
                            data: base64Data
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.0,
            responseMimeType: 'application/json'
        }
    };
    try {
        const data = await callGeminiVision(apiKey, requestBody, 15000);
        const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textOutput) {
            throw new Error('No text generated by Gemini Vision');
        }
        const parsed = JSON.parse(textOutput);
        return {
            weight: typeof parsed.weight === 'number' ? parsed.weight : null,
            fat: typeof parsed.fat === 'number' ? parsed.fat : null,
            snf: typeof parsed.snf === 'number' ? parsed.snf : null,
            clr: typeof parsed.clr === 'number' ? parsed.clr : null,
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
            rawDetectedText: parsed.rawDetectedText || '',
            farmerTag: parsed.farmerTag || null,
            notes: parsed.notes || (parsed.weight !== null ? 'डिस्प्ले सफलतापूर्वक पढ़ा गया' : 'इमेज में कोई कांटा या मशीन नहीं दिखी'),
            isAiPowered: true
        };
    }
    catch (err) {
        console.warn('Gemini OCR vision error:', err.message || err);
        return {
            weight: null,
            fat: null,
            snf: null,
            clr: null,
            confidence: 0,
            rawDetectedText: 'Detection failed: ' + (err.message || ''),
            farmerTag: null,
            notes: 'इमेज से रीडिंग नहीं मिल सकी। कृपया सुनिश्चित करें कि कैमरा मशीन के सामने सीधा है।',
            isAiPowered: false
        };
    }
};
exports.performGeminiMilkOCR = performGeminiMilkOCR;
/**
 * Perform Gemini Vision Shelf & Kirana Inventory Inspection
 */
const performGeminiShelfScan = async (rawImage, existingBlocks, customApiKey) => {
    const apiKey = customApiKey ||
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        process.env.GEMINI_KEY;
    const { base64Data, mimeType } = cleanBase64(rawImage);
    const blocksSummary = existingBlocks
        .map(b => `Block: ${b.blockCode}, Name: ${b.shelfName}, Product: ${b.productName}, Capacity: ${b.capacity}, LowAlert: ${b.lowStockThreshold}`)
        .join('\n');
    if (!apiKey || apiKey.trim() === '') {
        return {
            scannedBlocks: [],
            totalItemsVisible: 0,
            summary: 'GEMINI_API_KEY कन्फ़िगर नहीं है। शेल्फ ऑडिट के लिए API Key आवश्यक है।',
            isAiPowered: false
        };
    }
    const prompt = `You are an AI Retail Inventory Inspector for a Kirana / Dairy Store.
Analyze this photo of product shelves / grocery racks.

EXISTING SHELF BLOCKS IN SYSTEM:
${blocksSummary || 'No predefined blocks. Detect sections automatically as Block A1, A2, B1, B2.'}

TASKS:
1. Identify each visible shelf block/section.
2. Count the number of visible units (bottles, packets, boxes, cans).
3. Determine status:
   - "IN_STOCK": Sufficient items visible.
   - "LOW_STOCK": Less than 3-5 items visible.
   - "EMPTY": Shelf slot is completely vacant.
   - "MISPLACED": Item belongs to a different block.
4. Total visible items count.

STRICT JSON OUTPUT:
{
  "scannedBlocks": [
    {
      "blockCode": string,
      "productName": string,
      "detectedCount": number,
      "status": "IN_STOCK" | "LOW_STOCK" | "EMPTY" | "MISPLACED",
      "confidence": number,
      "details": string
    }
  ],
  "totalItemsVisible": number,
  "summary": string
}`;
    const requestBody = {
        contents: [
            {
                role: 'user',
                parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Data } }]
            }
        ],
        generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json'
        }
    };
    try {
        const data = await callGeminiVision(apiKey, requestBody, 20000);
        const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(textOutput);
        return {
            scannedBlocks: parsed.scannedBlocks || [],
            totalItemsVisible: parsed.totalItemsVisible || 0,
            summary: parsed.summary || 'शेल्फ इन्वेंटरी AI द्वारा जांची गई',
            isAiPowered: true
        };
    }
    catch (err) {
        console.warn('Shelf Vision Scan error:', err.message || err);
        return {
            scannedBlocks: [],
            totalItemsVisible: 0,
            summary: 'शेल्फ स्कैन पूरा नहीं हो सका: ' + (err.message || ''),
            isAiPowered: false
        };
    }
};
exports.performGeminiShelfScan = performGeminiShelfScan;
/**
 * Perform Face / Person Detection and Footfall Recognition
 */
const performGeminiPersonDetect = async (rawImage, knownFarmers, customApiKey) => {
    const apiKey = customApiKey ||
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        process.env.GEMINI_KEY;
    const { base64Data, mimeType } = cleanBase64(rawImage);
    const farmersText = knownFarmers
        .slice(0, 40)
        .map(f => `ID: ${f.farmerId}, Name: ${f.name}, Token: ${f.tokenNumber || 'None'}`)
        .join('\n');
    if (!apiKey || apiKey.trim() === '') {
        return {
            detectedPerson: null,
            faceCount: 0,
            isAiPowered: false
        };
    }
    const prompt = `You are a Customer & Farmer Identification AI for a Dairy Counter.
Analyze this photo from the counter camera.
Known registered farmers:
${farmersText || 'No farmer directory loaded.'}

Look for:
1. Any person standing in front of the counter.
2. If they are holding a token number (e.g., plastic tag, number card) or recognizable characteristics matching known list.
3. Count how many people/faces are in the frame.

Return JSON:
{
  "detectedPerson": {
    "matchedFarmerId": string | null,
    "matchedName": string | null,
    "tokenNumber": string | null,
    "confidence": number,
    "description": string
  } | null,
  "faceCount": number
}`;
    const requestBody = {
        contents: [
            {
                role: 'user',
                parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Data } }]
            }
        ],
        generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json'
        }
    };
    try {
        const data = await callGeminiVision(apiKey, requestBody, 15000);
        const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(textOutput);
        return {
            detectedPerson: parsed.detectedPerson || null,
            faceCount: parsed.faceCount || 0,
            isAiPowered: true
        };
    }
    catch (err) {
        console.warn('Face detection vision error:', err.message || err);
        return {
            detectedPerson: null,
            faceCount: 0,
            isAiPowered: false
        };
    }
};
exports.performGeminiPersonDetect = performGeminiPersonDetect;
/**
 * Compare AI reading vs Operator Manual input to detect fraud or misreadings
 */
const compareReadings = (aiReading, operatorReading) => {
    const aiWeight = aiReading.weight !== null && aiReading.weight !== undefined ? aiReading.weight : null;
    const opWeight = operatorReading.weight !== null && operatorReading.weight !== undefined ? operatorReading.weight : null;
    const aiFat = aiReading.fat !== null && aiReading.fat !== undefined ? aiReading.fat : null;
    const opFat = operatorReading.fat !== null && operatorReading.fat !== undefined ? operatorReading.fat : null;
    const aiSnf = aiReading.snf !== null && aiReading.snf !== undefined ? aiReading.snf : null;
    const opSnf = operatorReading.snf !== null && operatorReading.snf !== undefined ? operatorReading.snf : null;
    let isMismatched = false;
    const reasons = [];
    let weightVariance = 0;
    let fatVariance = 0;
    let snfVariance = 0;
    // Weight tolerance threshold: 0.15 Liters
    if (aiWeight !== null && opWeight !== null) {
        weightVariance = Math.round(Math.abs(aiWeight - opWeight) * 100) / 100;
        if (weightVariance > 0.15) {
            isMismatched = true;
            reasons.push(`Weight Mismatch: AI read ${aiWeight}L, Operator entered ${opWeight}L (Diff: ${weightVariance}L)`);
        }
    }
    // FAT tolerance threshold: 0.15%
    if (aiFat !== null && opFat !== null && opFat > 0) {
        fatVariance = Math.round(Math.abs(aiFat - opFat) * 100) / 100;
        if (fatVariance > 0.15) {
            isMismatched = true;
            reasons.push(`FAT Mismatch: AI read ${aiFat}%, Operator entered ${opFat}% (Diff: ${fatVariance}%)`);
        }
    }
    // SNF tolerance threshold: 0.20%
    if (aiSnf !== null && opSnf !== null && opSnf > 0) {
        snfVariance = Math.round(Math.abs(aiSnf - opSnf) * 100) / 100;
        if (snfVariance > 0.20) {
            isMismatched = true;
            reasons.push(`SNF Mismatch: AI read ${aiSnf}%, Operator entered ${opSnf}% (Diff: ${snfVariance}%)`);
        }
    }
    return {
        isMismatched,
        mismatchReason: reasons.join(' | '),
        weightVariance,
        fatVariance,
        snfVariance
    };
};
exports.compareReadings = compareReadings;
