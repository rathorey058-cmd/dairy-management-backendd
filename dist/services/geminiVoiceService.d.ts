/**
 * Gemini AI Voice NLP Service for Dairy App
 * Connects Google Gemini 1.5 Flash AI for natural Hindi / Hinglish understanding.
 * Zero-cost free tier compatible with automatic offline fallback.
 */
export interface GeminiVoiceContext {
    farmers: Array<{
        _id: string;
        farmerId: string;
        name: string;
        mobile: string;
        village: string;
        fatRate?: number;
    }>;
    products: Array<{
        _id: string;
        name: string;
        category: string;
        sellingPrice: number;
        unit: string;
    }>;
    rateCharts: any[];
    todayStr: string;
    tenantName?: string;
    customApiKey?: string;
}
export interface ParsedVoiceResult {
    actionType: 'MILK_ENTRY' | 'DELETE_MILK_ENTRY' | 'PRODUCT_SALE' | 'FARMER_ADVANCE' | 'EXPENSE' | 'NAVIGATE' | 'REGISTER_FARMER' | 'CREATE_PRODUCT' | 'DIRECT_MILK_SALE' | 'FARMER_PAYMENT' | 'MILK_BANDHI_UPDATE' | 'COLLECT_DUE_PAYMENT' | 'DUE_PAYMENTS_QUERY' | 'REGISTER_BANDHI' | 'AI_QUERY' | 'UNKNOWN';
    previewTitle: string;
    previewDetails: Record<string, string>;
    data?: any;
    path?: string;
    audioResponse: string;
    transcript: string;
    isAIPowered?: boolean;
}
export declare const parseVoiceWithGemini: (rawTranscript: string, context: GeminiVoiceContext) => Promise<ParsedVoiceResult | null>;
