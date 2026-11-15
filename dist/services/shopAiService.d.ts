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
 * Deep Multimodal Shop Intelligence Analysis with Gemini 1.5 Flash
 */
export declare const runShopAiMultimodalAnalysis: (input: ShopAiAnalysisInput) => Promise<ShopAiAnalysisOutput>;
