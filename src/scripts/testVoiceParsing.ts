import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { parseVoiceWithGemini } from '../services/geminiVoiceService';

async function testPrompts() {
  const prompts = [
    'कल का गल्ला बताओ क्या हिसाब बैठा',
    'कल कितना दूध आया था',
    'आज टोटल कितना दूध आया बताओ मुझे',
    'Umrao Singh ji ka 50 litre doodh 5.4 fat',
    'Umrao Singh ji ki entry delete kar do jo unka doodh aaya tha aaj',
    '2 किलो पनीर 400 के भाव से सेल किया',
    'Farmer 1 को 500 रुपये एडवांस दिया'
  ];

  console.log('Using Gemini API Key:', process.env.GEMINI_API_KEY ? 'Present (length: ' + process.env.GEMINI_API_KEY.length + ')' : 'MISSING');

  for (const prompt of prompts) {
    console.log('\n=============================================');
    console.log(`PROMPT: "${prompt}"`);
    try {
      const result = await parseVoiceWithGemini(prompt, {
        todayStr: new Date().toISOString().split('T')[0],
        farmers: [{ _id: '1', farmerId: 'F-001', name: 'Umrao Singh', mobile: '9876543210', village: 'Rampur' }],
        products: [{ _id: 'p1', name: 'Paneer', category: 'Dairy', unit: 'kg', sellingPrice: 400 }],
        rateCharts: []
      });
      if (result) {
        console.log('RESULT ActionType:', result.actionType);
        console.log('RESULT PreviewTitle:', result.previewTitle);
        console.log('RESULT PreviewDetails:', JSON.stringify(result.previewDetails));
        console.log('RESULT AudioResponse:', result.audioResponse);
        console.log('RESULT Path:', result.path);
        console.log('RESULT Data:', JSON.stringify(result.data));
      } else {
        console.log('RESULT is null');
      }
    } catch (e: any) {
      console.error('ERROR parsing prompt:', e.message);
    }
  }
}

testPrompts();
