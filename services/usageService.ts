import { API_URL } from '../constants';
import { storage } from './storage';

export type ApiType = 'gemini' | 'plantnet' | 'trefle' | 'perenual' | 'serper' | 'local_ai';

export const trackUsage = async (type: ApiType, tokens?: number) => {
  const token = storage.get('verdant_token');
  const userStr = storage.get('verdant_user');
  
  if (!token || !userStr) return;
  
  try {
    const user = JSON.parse(userStr);
    await fetch(`${API_URL}/api/system/track-usage`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-user-role': user.role,
        'x-user-id': user.id,
        'x-user-house-id': user.houseId || ''
      },
      body: JSON.stringify({ type, tokens })
    });
  } catch (e) {
    console.error(`[USAGE] Failed to track ${type}:`, e);
  }
};
