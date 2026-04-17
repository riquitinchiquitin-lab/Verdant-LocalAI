/**
 * Safe LocalStorage utility for mobile resilience (iOS Safari Private Mode)
 */

export const storage = {
  get: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`Verdant Storage Blocked: ${key}`, e);
      return null;
    }
  },
  set: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`Verdant Storage Set Blocked: ${key}`, e);
    }
  },
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Verdant Storage Remove Blocked: ${key}`, e);
    }
  },
  clear: (): void => {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn(`Verdant Storage Clear Blocked`, e);
    }
  }
};
