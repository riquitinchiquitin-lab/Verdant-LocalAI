
/**
 * LocalAiService handles detection and interaction with on-device AI models.
 * Currently supports the experimental window.ai (Prompt API) in Chrome.
 */

import { trackUsage } from './usageService';

export interface LocalAiCapabilities {
  isSupported: boolean;
  origin: 'WINDOW_AI' | 'WEBGPU' | 'NONE';
}

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

  // 2. Check for WebGPU (Detected but and optimized for A18 Pro, but requires runtime driver)
  if (typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as any).gpu) {
    // We mark it as NOT supported for execution yet to avoid misleading the user
    // although the hardware IS capable.
    return { isSupported: false, origin: 'WEBGPU' };
  }

  return { isSupported: false, origin: 'NONE' };
};

const estimateTokens = (text: string): number => {
  if (!text) return 0;
  // Standard heuristic: 1 token ~= 4 characters for English
  return Math.ceil(text.length / 4);
};

export const runLocalAiPrompt = async (prompt: string, systemPrompt?: string): Promise<string> => {
  // window.ai implementation
  if ('ai' in window) {
    try {
      const session = await (window as any).ai.createTextSession({
        systemPrompt: systemPrompt || "You are a botanical expert assistant."
      });
      const result = await session.prompt(prompt);
      
      // Track usage with token estimation
      const totalTokens = estimateTokens(prompt) + estimateTokens(result) + estimateTokens(systemPrompt || "");
      trackUsage('local_ai', totalTokens);
      
      session.destroy();
      return result;
    } catch (e) {
      console.error("Local AI prompt failed:", e);
      throw e;
    }
  }

  throw new Error("Local AI not supported or initialized");
};

export const translateTextLocal = async (text: string, targetLangs: string[]): Promise<Record<string, string>> => {
  if (!('ai' in window)) throw new Error("Local AI not supported");

  const results: Record<string, string> = {};
  const session = await (window as any).ai.createTextSession({
    systemPrompt: `You are a translation engine. Translate the input text into these languages: ${targetLangs.join(', ')}. Return ONLY a JSON object where keys are language codes and values are translations.`
  });

  try {
    const response = await session.prompt(text);
    // Estimate tokens: prompt (~input text) + result
    const tokens = estimateTokens(text) + estimateTokens(response);
    trackUsage('local_ai', tokens);
    
    // Attempt to parse JSON from the response
    const jsonMatch = response.match(/\{.*\}/s);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      targetLangs.forEach(lang => {
        if (parsed[lang]) results[lang] = parsed[lang];
      });
    }
  } catch (e) {
    console.error("Local translation failed:", e);
  } finally {
    session.destroy();
  }

  return results;
};

export const diagnosePlantHealthLocal = async (plantName: string, observations: string): Promise<string> => {
  if (!('ai' in window)) throw new Error("Local AI not supported");

  const session = await (window as any).ai.createTextSession({
    systemPrompt: "You are a Master Botanical Pathologist. Provide a technical diagnosis and recovery plan based on text observations."
  });

  try {
    const prompt = `PLANT: ${plantName}\nOBSERVATIONS: ${observations}\n\nProvide a concise diagnosis and 3-5 clear recovery steps.`;
    const response = await session.prompt(prompt);
    
    const tokens = estimateTokens(prompt) + estimateTokens(response);
    trackUsage('local_ai', tokens);
    
    return response;
  } finally {
    session.destroy();
  }
};

export const harmonizePlantDataLocal = async (scientificName: string, rawData: any): Promise<any> => {
  if (!('ai' in window)) throw new Error("Local AI not supported");

  const session = await (window as any).ai.createTextSession({
    systemPrompt: "You are a Botanical Data Harmonizer. You take raw data from multiple sources and synthesize it into a clean, structured format. Return ONLY a JSON object."
  });

  try {
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
    const response = await session.prompt(prompt);
    
    const tokens = estimateTokens(prompt) + estimateTokens(response);
    trackUsage('local_ai', tokens);
    
    // More robust JSON extraction for smaller models
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
       console.warn("[LOCAL_AI] No JSON found in response:", response);
       return null;
    }
    return JSON.parse(jsonMatch[0]);
  } finally {
    session.destroy();
  }
};
