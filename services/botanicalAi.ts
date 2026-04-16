
import { runAiPrompt } from './GeminiService';
import { User, Plant } from '../types';

/**
 * Provides botanical advice using either local or cloud AI.
 */
export const getBotanicalAdvice = async (
  query: string, 
  plant: Plant | null, 
  user: User | null, 
  isLocalEnabled: boolean
): Promise<string> => {
  const systemPrompt = `
    You are a Master Botanical Assistant for the Verdant Botanical System.
    Your goal is to provide expert, scientifically accurate, yet practical plant care advice.
    ${plant ? `The user is asking about a specific specimen: ${plant.species} (${plant.nickname.en}).` : ''}
    Keep responses concise, professional, and formatted with markdown.
  `;

  const prompt = plant 
    ? `SPECIMEN DATA: ${JSON.stringify({
        species: plant.species,
        family: plant.family,
        category: plant.category,
        watering: plant.wateringInterval,
        lastWatered: plant.lastWatered,
        health: plant.logs?.filter(l => l.type === 'DISEASE_CHECK').slice(-1)[0]?.note
      })}
      
      USER QUERY: ${query}`
    : query;

  return await runAiPrompt(prompt, user, isLocalEnabled, systemPrompt);
};
