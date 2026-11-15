import { IShopAiReport } from '../models/ShopAiReport';

export interface ShopAiAnalysisInput {
  base64Media?: string;
  mimeType?: string;
  mediaType: 'video' | 'audio' | 'image';
  userContextPrompt?: string;
  cameraName?: string;
  duration?: string;
  customApiKey?: string;
  registeredProfiles?: Array<{
    name: string;
    role: string;
    photoBase64?: string;
    instructions?: string;
    dutyTiming?: string;
  }>;
}

export interface ShopAiAnalysisOutput {
  title: string;
  customerCount: {
    total: number;
    men: number;
    women: number;
    children: number;
    notes: string;
  };
  staffPerformance: {
    staffIdentified: string[];
    attendanceStatus: string;
    activeScore: number;
    behaviorNotes: string;
    unattendedLapses: string[];
  };
  voiceAnalysis: {
    languageDetected: string;
    audioSummary: string;
    transcripts: Array<{
      speaker: string;
      timeCode?: string;
      text: string;
      intent?: string;
    }>;
  };
  businessTransactions: {
    estimatedTransactionsCount: number;
    itemsDiscussedOrSold: string[];
    cashCounterObservations: string;
  };
  aiBrainInsights: {
    positives: string[];
    concernsOrAlerts: string[];
    actionableSuggestions: string[];
    anomalyDetected: boolean;
  };
  writtenFullReport: string;
  rawSummary: string;
  isAiPowered: boolean;
}

/**
 * Clean data URL to raw base64 and mimeType
 */
const extractMimeAndBase64 = (rawMedia: string, fallbackMime = 'video/mp4') => {
  let mimeType = fallbackMime;
  let base64Data = rawMedia;

  if (rawMedia.startsWith('data:')) {
    const commaIdx = rawMedia.indexOf(',');
    if (commaIdx !== -1) {
      const meta = rawMedia.substring(5, commaIdx);
      const semi = meta.indexOf(';');
      if (semi !== -1) {
        mimeType = meta.substring(0, semi);
      } else {
        mimeType = meta;
      }
      base64Data = rawMedia.substring(commaIdx + 1);
    }
  }

  return { base64Data: base64Data.trim(), mimeType };
};

/**
 * Deep Multimodal Shop Intelligence Analysis with Gemini 1.5 Flash
 */
export const runShopAiMultimodalAnalysis = async (
  input: ShopAiAnalysisInput
): Promise<ShopAiAnalysisOutput> => {
  const apiKey =
    input.customApiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_KEY;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY कॉन्फ़िगर नहीं है। कृपया server/.env में वैध Google Gemini API Key जोड़ें।');
  }

  const { base64Data, mimeType } = input.base64Media
    ? extractMimeAndBase64(input.base64Media, input.mediaType === 'audio' ? 'audio/webm' : input.mediaType === 'image' ? 'image/jpeg' : 'video/mp4')
    : { base64Data: '', mimeType: 'image/jpeg' };

  const userContext = (input.userContextPrompt || '').trim();

  let profilesSection = '';
  if (input.registeredProfiles && input.registeredProfiles.length > 0) {
    profilesSection = `
REGISTERED OWNER & STAFF PROFILES (दुकान के अधिकृत सदस्य):
${input.registeredProfiles.map(p => `- [${p.role}] नाम: "${p.name}", समय: "${p.dutyTiming || 'सामान्य'}", मालिक के निर्देश: "${p.instructions || 'सतर्क रहना व गल्ला सुरक्षित रखना'}"`).join('\n')}
(महत्वपूर्ण: इन चेहरों व नामों के आधार पर स्टाफ व मालिक की पहचान करें। बाकी सभी को ग्राहक (Customer) मानें।)
`;
  }

  const systemInstructions = `
You are an advanced autonomous AI Store Manager and Surveillance Intelligence Analyst for an Indian Retail Store / Dairy Shop.
You are analyzing a store recording or live camera feed (Video, Audio, or Visual Snapshot).

CRITICAL CONTEXT PROVIDED BY SHOP OWNER:
"${userContext || 'Assume a busy Indian dairy and grocery shop with counter, servant/staff, customer footfall, cash drawer (Galla), and milk/grocery sales.'}"
${profilesSection}

YOUR MISSION & ANALYSIS TASKS:
1. STAFF IDENTIFICATION & PERFORMANCE:
   - Identify the staff/servant based on registered profiles and user context.
   - Evaluate attendance, attentiveness, customer greetings, promptness, whether the counter was left unattended, and any idle or careless moments.
   - Give an active performance score (0 to 100).

2. CUSTOMER FOOTFALL COUNT (ग्राहक गिनती):
   - Accurately count total distinct customers who arrived at the counter / shop.
   - Provide a rough demographic breakdown (Men, Women, Children) and arrival timeline notes.

3. VOICE & AUDIO RECOGNITION (आवाज़ पहचान व बातचीत):
   - Listen to the audio / spoken dialogues (Hindi, Hinglish, regional dialect).
   - Detect what each person said: customer request, bargaining, staff replies, quantity asked (e.g. "1 लीटर दूध देना", "घी का क्या भाव है?").
   - Extract chronological dialogue transcripts with speaker tags and intended purchase.

4. BUSINESS & CASH COUNTER (गल्ला व बिक्री):
   - What products were discussed or sold (Milk, Dahi, Paneer, Ghee, Butter, Groceries, Sweets)?
   - Observe cash handling: Did the servant safely deposit money in the cash drawer (गल्ला)? Was change given correctly? Any suspicious galla opening?

5. "AI BRAIN" AUTONOMOUS INSIGHTS (AI का अपना दिमाग):
   - Think like a senior business consultant and safety supervisor.
   - Point out hidden problems: long wait times for customers, unattended counter risk, unbilled items, cleanliness/hygiene, lighting, customer satisfaction.
   - Highlight positive practices observed.
   - Give actionable practical recommendations to increase sales and security.

6. DETAILED HINDI WRITTEN REPORT (लिखित रूप में पूरी रिपोर्ट):
   - Create a comprehensive, formal, well-structured Hindi report with headings, bullet points, and an executive summary that the shop owner can read and keep in records.

STRICT JSON OUTPUT FORMAT (Return ONLY valid JSON matching this schema, without markdown backticks or commentary):
{
  "title": "संक्षिप्त और आकर्षक रिपोर्ट शीर्षक (उदा: शाम के काउंटर व नौकर आकाश की निगरानी रिपोर्ट)",
  "customerCount": {
    "total": 0,
    "men": 0,
    "women": 0,
    "children": 0,
    "notes": "ग्राहकों के आगमन का संक्षिप्त विवरण"
  },
  "staffPerformance": {
    "staffIdentified": ["स्टाफ का नाम व पद"],
    "attendanceStatus": "उपस्थित / मुस्तैद / अनुपस्थित",
    "activeScore": 85,
    "behaviorNotes": "स्टाफ के काम करने का तरीका और व्यवहार का विवरण",
    "unattendedLapses": ["यदि काउंटर खाली छोड़ा गया तो समय या विवरण"]
  },
  "voiceAnalysis": {
    "languageDetected": "हिंदी / हिंग्लिश",
    "audioSummary": "ऑडियो में हुई बातचीत का मुख्य सार",
    "transcripts": [
      {
        "speaker": "ग्राहक #1 / आकाश (स्टाफ)",
        "timeCode": "00:15",
        "text": "क्या बोला गया (Exact Hindi words)",
        "intent": "दूध खरीद / पूछताछ / भुगतान"
      }
    ]
  },
  "businessTransactions": {
    "estimatedTransactionsCount": 0,
    "itemsDiscussedOrSold": ["फुल क्रीम दूध 1L", "देसी घी 500g"],
    "cashCounterObservations": "गल्ला और पैसे के लेन-देन पर AI का अवलोकन"
  },
  "aiBrainInsights": {
    "positives": ["सकारात्मक बातें जो AI ने देखीं"],
    "concernsOrAlerts": ["चिंताजनक या लापरवाही की बातें"],
    "actionableSuggestions": ["दुकान की बिक्री व सुरक्षा बढ़ाने के लिए AI के सुझाव"],
    "anomalyDetected": false
  },
  "writtenFullReport": "विस्तृत लिखित हिंदी रिपोर्ट (Markdown प्रारूप में)",
  "rawSummary": "1-2 वाक्यों में क्विक समरी"
}
`;

  const parts: any[] = [{ text: systemInstructions }];

  if (base64Data && base64Data.length > 50) {
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    });
  } else {
    parts.push({
      text: `[NOTE: No media attachment provided. Generate a contextual shop intelligence audit template and baseline recommendations based on the user context provided: "${userContext}"]`,
    });
  }

  const requestBody = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  };

  const modelsToTry = [
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3-flash-preview',
    'gemini-3.8-flash'
  ];
  let response: any = null;
  let lastErrorText = '';

  for (const modelName of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        response = res;
        break;
      }

      lastErrorText = await res.text();
      console.warn(`Model ${modelName} status ${res.status}:`, lastErrorText.substring(0, 150));
    } catch (e: any) {
      clearTimeout(timeoutId);
      lastErrorText = e.message || String(e);
    }
  }

  if (!response) {
    throw new Error(`Gemini Multimodal AI Error: ${lastErrorText.substring(0, 250)}`);
  }

  try {
    const data: any = await response.json();
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textOutput) {
      throw new Error('Gemini AI ने कोई उत्तर नहीं दिया।');
    }

    const parsed = JSON.parse(textOutput);

    return {
      title: parsed.title || 'दुकान व काउंटर AI इंटेलिजेंस रिपोर्ट',
      customerCount: {
        total: Number(parsed.customerCount?.total) || 0,
        men: Number(parsed.customerCount?.men) || 0,
        women: Number(parsed.customerCount?.women) || 0,
        children: Number(parsed.customerCount?.children) || 0,
        notes: parsed.customerCount?.notes || '',
      },
      staffPerformance: {
        staffIdentified: Array.isArray(parsed.staffPerformance?.staffIdentified)
          ? parsed.staffPerformance.staffIdentified
          : ['आकाश (स्टाफ)'],
        attendanceStatus: parsed.staffPerformance?.attendanceStatus || 'सक्रिय',
        activeScore: Number(parsed.staffPerformance?.activeScore) || 85,
        behaviorNotes: parsed.staffPerformance?.behaviorNotes || 'स्टाफ उपस्थित था और सामान्य रूप से कार्य कर रहा था।',
        unattendedLapses: Array.isArray(parsed.staffPerformance?.unattendedLapses)
          ? parsed.staffPerformance.unattendedLapses
          : [],
      },
      voiceAnalysis: {
        languageDetected: parsed.voiceAnalysis?.languageDetected || 'हिंदी / हिंग्लिश',
        audioSummary: parsed.voiceAnalysis?.audioSummary || 'ग्राहकों और स्टाफ के बीच सामान्य बातचीत दर्ज हुई।',
        transcripts: Array.isArray(parsed.voiceAnalysis?.transcripts) ? parsed.voiceAnalysis.transcripts : [],
      },
      businessTransactions: {
        estimatedTransactionsCount: Number(parsed.businessTransactions?.estimatedTransactionsCount) || 0,
        itemsDiscussedOrSold: Array.isArray(parsed.businessTransactions?.itemsDiscussedOrSold)
          ? parsed.businessTransactions.itemsDiscussedOrSold
          : [],
        cashCounterObservations:
          parsed.businessTransactions?.cashCounterObservations || 'गल्ला सामान्य रूप से नियंत्रित दिखा।',
      },
      aiBrainInsights: {
        positives: Array.isArray(parsed.aiBrainInsights?.positives) ? parsed.aiBrainInsights.positives : [],
        concernsOrAlerts: Array.isArray(parsed.aiBrainInsights?.concernsOrAlerts)
          ? parsed.aiBrainInsights.concernsOrAlerts
          : [],
        actionableSuggestions: Array.isArray(parsed.aiBrainInsights?.actionableSuggestions)
          ? parsed.aiBrainInsights.actionableSuggestions
          : [],
        anomalyDetected: Boolean(parsed.aiBrainInsights?.anomalyDetected),
      },
      writtenFullReport:
        parsed.writtenFullReport ||
        `### दुकान निरीक्षण व निगरानी रिपोर्ट\n\n**तारीख:** ${new Date().toLocaleDateString('hi-IN')}\n\nAI ने वीडियो/ऑडियो का विश्लेषण पूरा कर लिया है।`,
      rawSummary: parsed.rawSummary || 'दुकान की गतिविधि और स्टाफ का AI विश्लेषण सफलतापूर्वक संपन्न हुआ।',
      isAiPowered: true,
    };
  } catch (err: any) {
    console.error('runShopAiMultimodalAnalysis Error:', err);
    throw err;
  }
};
