
import { trackUsage } from './usageService';

export interface LocalAiCapabilities {
  isSupported: boolean;
  origin: 'WINDOW_AI' | 'WEBGPU' | 'NONE';
  status?: string;
}

// Global engine instance to persist across calls - using any to avoid top-level heavy import
let webLlmEngine: any = null;
const SELECTED_MODEL = "Llama-3-8B-Instruct-v0.1-q4f32_1-MLC-1k"; // Optimized small context for fast browser usage

export const checkLocalAiSupport = async (): Promise<LocalAiCapabilities> => {
  // 1. Check for window.ai with robust existence check
  if (typeof window !== 'undefined' && 'ai' in window) {
    try {
      const ai = (window as any).ai;
      if (ai && typeof ai.canCreateTextSession === 'function') {
        const canCreate = await ai.canCreateTextSession();
        if (canCreate === 'readily' || canCreate === 'after-download') {
          return { isSupported: true, origin: 'WINDOW_AI' };
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
      
      const adapter = await Promise.race([adapterPromise, timeoutPromise]);
      if (adapter) {
        return { isSupported: true, origin: 'WEBGPU', status: 'Hardware Ready' };
      }
    } catch (e) {
      console.warn("WebGPU Probe Fault:", e);
    }
  }

  return { isSupported: false, origin: 'NONE' };
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
      const session = await (window as any).ai.createTextSession({
        systemPrompt: systemPrompt || "You are a botanical expert assistant."
      });
      const result = await session.prompt(prompt);
      const totalTokens = estimateTokens(prompt) + estimateTokens(result) + estimateTokens(systemPrompt || "");
      trackUsage('local_ai', totalTokens);
      session.destroy();
      return result;
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
    trackUsage('local_ai', reply.usage?.total_tokens || estimateTokens(result));
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
