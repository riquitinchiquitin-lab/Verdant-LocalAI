import { GoogleGenAI } from '@google/genai';
import { User } from '../types';
import { getGeminiApiKey } from '../constants';
import { runLocalAiPrompt } from './LocalAiService';

let geminiClient: GoogleGenAI | null = null;

export const getGeminiClient = (user: User | null): GoogleGenAI | null => {
  const apiKey = user?.personalAiKey || getGeminiApiKey();
  if (!apiKey) {
    return null;
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }

  return geminiClient;
};

export const runAiPrompt = async (
  prompt: string, 
  user: User | null, 
  isLocalEnabled: boolean = false,
  systemPrompt?: string
): Promise<string> => {
  if (isLocalEnabled) {
    try {
      return await runLocalAiPrompt(prompt, systemPrompt);
    } catch (e) {
      console.warn("Local AI failed, falling back to Cloud:", e);
    }
  }

  const client = getGeminiClient(user);
  if (!client) throw new Error("AI Client not initialized");

  const result = await client.models.generateContent({ 
    model: "gemini-1.5-flash",
    contents: prompt,
    config: {
        systemInstruction: systemPrompt
    }
  });
  
  return result.text || '';
};
