
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
  // 1. Check for window.ai (Chrome Prompt API / Gemini Nano)
  if (typeof window !== 'undefined' && 'ai' in window && (window as any).ai.canCreateTextSession) {
    try {
      const canCreate = await (window as any).ai.canCreateTextSession();
      if (canCreate !== 'no') {
        return { isSupported: true, origin: 'WINDOW_AI' };
      }
    } catch (e) {
      console.warn("Local AI (window.ai) detected but failed check:", e);
    }
  }

  // 2. Check for WebGPU (Future support for WebLLM/Llama3)
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    return { isSupported: true, origin: 'WEBGPU' };
  }

  return { isSupported: false, origin: 'NONE' };
};

export const runLocalAiPrompt = async (prompt: string, systemPrompt?: string): Promise<string> => {
  // window.ai implementation
  if ('ai' in window) {
    try {
      const session = await (window as any).ai.createTextSession({
        systemPrompt: systemPrompt || "You are a botanical expert assistant."
      });
      const result = await session.prompt(prompt);
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
    trackUsage('local_ai');
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
    trackUsage('local_ai');
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
    trackUsage('local_ai');
    const jsonMatch = response.match(/\{.*\}/s);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } finally {
    session.destroy();
  }
};
