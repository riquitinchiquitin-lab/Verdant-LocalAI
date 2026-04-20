import { GoogleGenAI, Type } from "@google/genai";
import { getGeminiApiKey } from '../constants';
import { trackUsage } from './usageService';
import { runEnrichmentLocal, translateTextLocal } from './LocalAiService';

const TARGET_LANGS = ['en', 'zh', 'ja', 'ko', 'es', 'fr', 'pt', 'de', 'id', 'vi', 'tl'];

export const identifyInventoryItem = async (
  image: string, 
  currentPlants: string[], 
  language: string = 'en',
  onLog?: (msg: string, source: string) => void,
  apiKey?: string
) => {
  // Fix: Use provided apiKey or fallback to global getGeminiApiKey()
  const key = apiKey || getGeminiApiKey();
  if (!key) {
    throw new Error("UPLINK_FAULT: Gemini API Key is missing. Please ensure GEMINI_API_KEY is set in your environment variables.");
  }
  const maskedKey = `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  const ai = new GoogleGenAI({ apiKey: key });
  const model = 'gemini-3-flash-preview';
  const base64Data = image.split(',')[1];

  onLog?.(`Initiating Deep Specimen Scan with ${model} (Key: ${maskedKey})...`, "GEMINI");

  const callGeminiWithRetry = async (fn: () => Promise<any>, maxRetries = 3): Promise<any> => {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (e: any) {
        lastError = e;
        const isRetryable = e.message?.includes("503") || 
                            e.message?.includes("high demand") || 
                            e.message?.includes("overloaded") ||
                            e.message?.includes("rate limit");
        
        if (!isRetryable || i === maxRetries - 1) break;
        
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.warn(`Gemini busy (Attempt ${i + 1}/${maxRetries}). Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  };

  const isLocalEnabled = localStorage.getItem('verdant-local-ai') === 'true';

  const prompt = `
    TASK: Identify this botanical/gardening product and provide technical specifications.
    Return the data in English.
    
    INSTRUCTIONS:
    1. Extract brand, model, and product name.
    2. Categorize: [tools, insecticide, fertiliser, seeds, soil, accessories, pots].
    3. Generate a technical description and usage instructions in English.
    4. Provide compatibility tags (which plant species is this for?).
    
    Return ONLY pure JSON matching the schema.
  `;

  try {
    const response = await callGeminiWithRetry(() => ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            name: { type: Type.STRING },
            brand: { type: Type.STRING },
            description: { type: Type.STRING },
            quantity: { type: Type.NUMBER },
            unit: { type: Type.STRING },
            model: { type: Type.STRING },
            applicationUsage: { type: Type.STRING },
            compatibility: { type: Type.ARRAY, items: { type: Type.STRING } },
            instructions: { type: Type.STRING },
            soilTypes: { type: Type.ARRAY, items: { type: Type.STRING } },
            potType: { type: Type.STRING },
            potColor: { type: Type.STRING },
            drainageCapability: { type: Type.STRING }
          }
        }
      }
    }));

    if (response.usageMetadata) {
      const totalTokens = (response.usageMetadata.promptTokenCount || 0) + (response.usageMetadata.candidatesTokenCount || 0);
      trackUsage('gemini', totalTokens);
    } else {
      trackUsage('gemini');
    }

    const rawResult = JSON.parse(response.text || "{}");
    onLog?.("Initial Vision Identification finalized (Uplink Successful).", "GEMINI");

    // Initialize result with localized structures
    const result: any = {
      ...rawResult,
      name: { en: rawResult.name },
      brand: { en: rawResult.brand },
      description: { en: rawResult.description },
      applicationUsage: { en: rawResult.applicationUsage },
      instructions: { en: rawResult.instructions },
      compatibility: { en: rawResult.compatibility },
      soilTypes: { en: rawResult.soilTypes }
    };

    // 2. PRIORITY: Local Interpretation & Translation (0 Tokens)
    if (isLocalEnabled) {
      onLog?.("Initiating Local NPU Interpretation & Localization...", "LOCAL_AI");
      try {
        // ENRICHMENT
        const localEnriched = await runEnrichmentLocal(rawResult.name || rawResult.model || 'Item', rawResult.description || '');
        if (localEnriched) {
            result.description.en = localEnriched;
            onLog?.("Local NPU Enrichment Applied", "LOCAL_AI");
        }

        // LOCAL TRANSLATION
        const fieldsToTranslate = ['name', 'brand', 'description', 'applicationUsage', 'instructions'];
        for (const field of fieldsToTranslate) {
          if (rawResult[field]) {
            const trans = await translateTextLocal(rawResult[field], TARGET_LANGS.filter(l => l !== 'en'));
            result[field] = { ...result[field], ...trans };
          }
        }
        onLog?.("Local NPU Localization Finalized", "LOCAL_AI");
      } catch (e) {
          console.warn("[INVENTORY] Local NPU processing failed, missing translations will stay in English:", e);
      }
    } else {
      // Basic fallback: Keep in English or handle cloud translation if really needed
      // For this objective, we prioritize English over burning tokens on translations
      onLog?.("Local AI Disabled: Skipping Multi-Language Sync to preserve tokens.", "WARNING");
    }

    result.images = [image];
    return result;
  } catch (error: any) {
    onLog?.(`Uplink Failure: ${error.message}`, "DEBUG");
    throw error;
  }
};
