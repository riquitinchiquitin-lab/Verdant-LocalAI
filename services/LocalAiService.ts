
import { trackUsage } from './usageService';
import { API_URL } from '../constants';

export interface LocalAiCapabilities {
  isSupported: boolean;
  origin: 'WEBNN' | 'WEBGPU' | 'NONE';
  status: 'Hardware Ready' | 'Experimental' | 'NONE';
}

// Global engine instance to persist across calls - using any to avoid top-level heavy import
let webLlmEngine: any = null;
const SELECTED_MODEL = "gemma-2b-it-q4f16_1-MLC"; // Mobile-optimized for Pixel Tensor chips

export const checkLocalAiSupport = async (): Promise<LocalAiCapabilities> => {
  // 1. Check for WebNN (The new priority for browser-based NPU acceleration)
  if (typeof navigator !== 'undefined' && 'ml' in navigator) {
    return { isSupported: true, origin: 'WEBNN', status: 'Hardware Ready' };
  }

  // 2. Check for WebGPU
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) {
        return { isSupported: true, origin: 'WEBGPU', status: 'Hardware Ready' };
      }
    } catch (e) {}
  }

  return { isSupported: false, origin: 'NONE', status: 'NONE' };
};

let isLocalDisabledForSession = false;

export const isLocalAiThrottled = () => isLocalDisabledForSession;

export const initWebLlm = async (onProgress?: (progress: number) => void): Promise<void> => {
  if (webLlmEngine) return;
  if (isLocalDisabledForSession) {
    throw new Error("LOCAL_AI_THROTTLED_SESSION");
  }
  
  try {
    const webllm = await import("@mlc-ai/web-llm");
    webLlmEngine = new webllm.MLCEngine();
    webLlmEngine.setInitProgressCallback((report: any) => {
      console.log("[WEBGPU] Init:", report.text);
      if (onProgress) {
          const match = report.text.match(/\[(\d+)\/(\d+)\]/);
          if (match) {
              onProgress(parseInt(match[1]) / parseInt(match[2]));
          }
      }
    });

    await webLlmEngine.reload(SELECTED_MODEL);
  } catch (e: any) {
    webLlmEngine = null;
    const isQuota = e.name === 'QuotaExceededError' || e.message?.includes('quota') || e.message?.includes('storage');
    if (isQuota) {
      isLocalDisabledForSession = true;
      console.error("[LOCAL_AI] Storage Quota Exceeded. Disabling local AI for this session to prevent repeated failures.");
      throw new Error("LOCAL_STORAGE_QUOTA_EXCEEDED");
    }
    throw e;
  }
};

const estimateTokens = (text: string): number => {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
};

export const runLocalAiPrompt = async (prompt: string, systemPrompt?: string): Promise<string> => {
  if (isLocalDisabledForSession) {
    throw new Error("LOCAL_AI_THROTTLED_SESSION");
  }

  // 1. Fallback to WebLLM (WebGPU-based LLM)
  if (!webLlmEngine) {
    try {
       await initWebLlm();
    } catch (e: any) {
       console.warn("Local AI Init failed:", e.message);
       throw e;
    }
  }

  if (webLlmEngine) {
    const messages: any[] = [
      { role: "system", content: systemPrompt || "You are a botanical expert assistant." },
      { role: "user", content: prompt }
    ];

    const reply = await webLlmEngine.chat.completions.create({
      messages,
    });
    
    const result = reply.choices[0].message.content || "";
    const totalTokens = reply.usage?.total_tokens || estimateTokens(result);
    console.info(`[LOCAL_AI] WebGPU Success | Tokens: ${totalTokens}`);
    trackUsage('local_ai', totalTokens);
    return result;
  }

  throw new Error("Local AI not supported or initialized");
};

export const translateTextLocal = async (text: string, targetLangs: string[], sourceLang: string = 'en'): Promise<Record<string, string>> => {
  const systemPrompt = `You are a professional translation engine. Translate the input text from ${sourceLang} into these languages: ${targetLangs.join(', ')}. Return ONLY a clean JSON object where keys are language codes and values are the TRANSLATED strings. Do not include explanations.`;
  const response = await runLocalAiPrompt(text, systemPrompt);
  
  const results: Record<string, string> = {};
  const jsonMatch = response.match(/\{[\s\S]*\}/s);
  if (jsonMatch) {
    try {
      // Clean possible markdown backticks
      const cleanJson = jsonMatch[0].replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      targetLangs.forEach(lang => {
        if (parsed[lang]) results[lang] = parsed[lang];
      });
    } catch (e) {
      console.error("Local translation JSON parse fault:", e, "Raw:", response);
    }
  }
  return results;
};

export const diagnosePlantHealthLocal = async (plantName: string, observations: string): Promise<string> => {
  const prompt = `PLANT: ${plantName}\nOBSERVATIONS: ${observations}\n\nProvide a concise diagnosis and 3-5 clear recovery steps.`;
  const systemPrompt = "You are a Master Botanical Pathologist. Provide a technical diagnosis and recovery plan based on text observations.";
  return await runLocalAiPrompt(prompt, systemPrompt);
};

export const harmonizePlantDataLocal = async (scientificName: string, rawData: any): Promise<any> => {
  const prompt = `
    SCIENTIFIC NAME: ${scientificName}
    RAW DATA: ${JSON.stringify(rawData)}
    
    Synthesize this into:
    - species
    - family
    - genus
    - commonNames (array)
    - description (concise)
    - aiInsight (unique fact)
    - wateringInterval (days)
    - repottingFrequency (months)
    
    Return as JSON.
  `;
  const systemPrompt = "You are a Botanical Data Harmonizer. You take raw data from multiple sources and synthesize it into a clean, structured format. Return ONLY a JSON object.";
  const response = await runLocalAiPrompt(prompt, systemPrompt);
  
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
     console.warn("[LOCAL_AI] No JSON found in response:", response);
     return null;
  }
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("Local harmonization JSON parse fault:", e);
    return null;
  }
};

export const runEnrichmentLocal = async (itemName: string, currentDetails: string): Promise<string> => {
  const prompt = `ITEM: ${itemName}\nCURRENT DETAILS: ${currentDetails}\n\nEnrich this botanical product description with technical usage tips and safety precautions. Keep it concise but professional.`;
  const systemPrompt = "You are a Botanical Product Expert. Provide high-quality technical enrichments for gardening products.";
  return await runLocalAiPrompt(prompt, systemPrompt);
};
