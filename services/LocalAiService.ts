
import { trackUsage } from './usageService';

export interface LocalAiCapabilities {
  isSupported: boolean;
  origin: 'WINDOW_AI' | 'WEBGPU' | 'NONE';
  status: 'readily' | 'after-download' | 'no' | 'Hardware Ready' | 'NONE';
}

// Global engine instance to persist across calls - using any to avoid top-level heavy import
let webLlmEngine: any = null;
const SELECTED_MODEL = "gemma-2b-it-q4f16_1-MLC"; // Mobile-optimized for Pixel Tensor chips

export const checkLocalAiSupport = async (): Promise<LocalAiCapabilities> => {
  // 1. Check for window.ai with robust existence check
  if (typeof window !== 'undefined' && 'ai' in window) {
    try {
      const ai = (window as any).ai;
      
      // 1a. Latest Chrome "Language Model" API
      if (ai.languageModel && typeof ai.languageModel.capabilities === 'function') {
        const caps = await ai.languageModel.capabilities();
        if (caps.available !== 'no') {
          return { isSupported: true, origin: 'WINDOW_AI', status: caps.available };
        }
      }

      // 1b. Legacy "Assistant/Text Session" API
      if (ai && typeof ai.canCreateTextSession === 'function') {
        const canCreate = await ai.canCreateTextSession();
        if (canCreate === 'readily' || canCreate === 'after-download') {
          return { isSupported: true, origin: 'WINDOW_AI', status: canCreate };
        }
      }

      // 1c. Assistant API (sometimes aliased)
      if (ai.assistant && typeof ai.assistant.capabilities === 'function') {
         const caps = await ai.assistant.capabilities();
         if (caps.available !== 'no') {
             return { isSupported: true, origin: 'WINDOW_AI', status: caps.available };
         }
      }
    } catch (e) {
      console.warn("Verdant AI Probe Fault:", e);
    }
  }

  // 2. Check for WebGPU
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      // Add a timeout to requestAdapter to prevent hanging on mobile/iframes
      const adapterPromise = (navigator as any).gpu.requestAdapter();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("WebGPU Timeout")), 2000));
      
      const adapter = await Promise.race([adapterPromise, timeoutPromise]) as any;
      if (adapter) {
        return { isSupported: true, origin: 'WEBGPU', status: 'Hardware Ready' };
      }
    } catch (e) {
      console.warn("WebGPU Probe Fault:", e);
    }
  }

  return { isSupported: false, origin: 'NONE', status: 'NONE' };
};

export const initWebLlm = async (onProgress?: (progress: number) => void): Promise<void> => {
  if (webLlmEngine) return;
  
  // Dynamic import to prevent crash on older browsers/iOS Safari during boot
  const webllm = await import("@mlc-ai/web-llm");
  webLlmEngine = new webllm.MLCEngine();
  webLlmEngine.setInitProgressCallback((report: any) => {
    console.log("[WEBGPU] Init:", report.text);
    if (onProgress) {
        // Parse progress from report.text if possible or use a default shim
        const match = report.text.match(/\[(\d+)\/(\d+)\]/);
        if (match) {
            onProgress(parseInt(match[1]) / parseInt(match[2]));
        }
    }
  });

  await webLlmEngine.reload(SELECTED_MODEL);
};

const estimateTokens = (text: string): number => {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
};

export const runLocalAiPrompt = async (prompt: string, systemPrompt?: string): Promise<string> => {
  // 1. Prefer window.ai if available
  if (typeof window !== 'undefined' && 'ai' in window) {
    try {
      const ai = (window as any).ai;
      let result = "";
      
      // Latest API
      if (ai.languageModel && typeof ai.languageModel.create === 'function') {
        const session = await ai.languageModel.create({
          systemPrompt: systemPrompt || "You are a botanical expert assistant."
        });
        result = await session.prompt(prompt);
        session.destroy();
      } 
      // Legacy API
      else if (typeof ai.createTextSession === 'function') {
        const session = await ai.createTextSession({
          systemPrompt: systemPrompt || "You are a botanical expert assistant."
        });
        result = await session.prompt(prompt);
        session.destroy();
      }

  if (result) {
    const totalTokens = estimateTokens(prompt) + estimateTokens(result) + estimateTokens(systemPrompt || "");
    console.info(`[LOCAL_AI] window.ai Success | Tokens: ${totalTokens}`);
    trackUsage('local_ai', totalTokens);
    return result;
  }
    } catch (e) {
      console.warn("window.ai failed, attempting WebGPU...", e);
    }
  }

  // 2. Fallback to WebLLM
  if (!webLlmEngine) {
    await initWebLlm();
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

export const translateTextLocal = async (text: string, targetLangs: string[]): Promise<Record<string, string>> => {
  const systemPrompt = `You are a translation engine. Translate the input text into these languages: ${targetLangs.join(', ')}. Return ONLY a JSON object where keys are language codes and values are translations.`;
  const response = await runLocalAiPrompt(text, systemPrompt);
  
  const results: Record<string, string> = {};
  const jsonMatch = response.match(/\{.*\}/s);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      targetLangs.forEach(lang => {
        if (parsed[lang]) results[lang] = parsed[lang];
      });
    } catch (e) {
      console.error("Local translation JSON parse fault:", e);
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
