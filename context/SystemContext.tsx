
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { fetchWithAuth } from '../services/api';
import { requestNotificationPermission } from '../services/notifications';
import { useAuth } from './AuthContext';

export type NotificationType = 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING';

export interface SystemLog {
  id: string;
  event: string;
  details: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  created_at: string;
}

export interface UsageData {
  gemini_count: number;
  gemini_tokens: number;
  plantnet_count: number;
  trefle_count: number;
  perenual_count: number;
  serper_count: number;
  opb_count: number;
  local_ai_count: number;
  local_ai_tokens: number;
  system_load: string;
  recent_logs: any[];
}

interface Notification {
  message: string;
  type: NotificationType;
  id: string;
}

interface SystemContextType {
  rpm: number;
  limit: number;
  status: 'STABLE' | 'BUSY' | 'COOLDOWN';
  recordHit: (isError?: boolean) => void;
  notification: Notification | null;
  showNotification: (message: string, type?: NotificationType) => void;
  clearNotification: () => void;
  fetchSystemLogs: () => Promise<SystemLog[]>;
  fetchUsage: () => Promise<UsageData | null>;
  isLocalAiSupported: boolean;
  isLocalAiEnabled: boolean;
  setLocalAiEnabled: (enabled: boolean) => void;
  localAiOrigin: 'WEBNN' | 'WEBGPU' | 'NONE';
  localAiStatus: 'Hardware Ready' | 'Experimental' | 'NONE';
  localAiProgress: number;
  isLocalAiLoading: boolean;
  initLocalAi: () => Promise<void>;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

const FREE_TIER_RPM_LIMIT = 15;
const WINDOW_MS = 60000;

import { checkLocalAiSupport, initWebLlm } from '../services/LocalAiService';
import { storage } from '../services/storage';

export const SystemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [hits, setHits] = useState<number[]>([]);
  const [status, setStatus] = useState<'STABLE' | 'BUSY' | 'COOLDOWN'>('STABLE');
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isLocalAiSupported, setIsLocalAiSupported] = useState(false);
  const [isLocalAiEnabled, setIsLocalAiEnabled] = useState(() => {
    return storage.get('verdant-local-ai') === 'true';
  });
  const [localAiOrigin, setLocalAiOrigin] = useState<'WEBNN' | 'WEBGPU' | 'NONE'>('NONE');
  const [localAiStatus, setLocalAiStatus] = useState<'Hardware Ready' | 'Experimental' | 'NONE'>('NONE');
  const [localAiProgress, setLocalAiProgress] = useState(0);
  const [isLocalAiLoading, setIsLocalAiLoading] = useState(false);

  useEffect(() => {
    // Check for local AI support on mount
    const checkSupport = async () => {
      try {
        const caps = await checkLocalAiSupport();
        setIsLocalAiSupported(caps.isSupported);
        setLocalAiOrigin(caps.origin);
        setLocalAiStatus(caps.status);
        
        // Auto-enable for now if supported
        if (caps.isSupported && storage.get('verdant-local-ai') === null) {
            setIsLocalAiEnabled(true);
            storage.set('verdant-local-ai', 'true');
        }
      } catch (e) {
        console.warn("System Probe Failed:", e);
      }
    };
    
    checkSupport();

    // Deferred notification request - don't block mount
    setTimeout(() => {
      try {
        requestNotificationPermission();
      } catch (e) {}
    }, 1000);
  }, []);

  const initLocalAi = useCallback(async () => {
    if (localAiOrigin !== 'WEBGPU') return;
    
    setIsLocalAiLoading(true);
    setLocalAiProgress(0);
    try {
      await initWebLlm((progress) => {
        setLocalAiProgress(progress);
      });
      showNotification("LOCAL AI CORE SYNCED", "SUCCESS");
    } catch (e) {
      console.error("Local AI Initialization failed:", e);
      showNotification("LOCAL AI SYNC FAILED", "ERROR");
    } finally {
      setIsLocalAiLoading(false);
    }
  }, [localAiOrigin]);

  const setLocalAiEnabled = useCallback((enabled: boolean) => {
    setIsLocalAiEnabled(enabled);
    storage.set('verdant-local-ai', enabled.toString());
    
    if (enabled && localAiOrigin === 'WEBGPU') {
        initLocalAi();
    }
  }, [localAiOrigin, initLocalAi]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setHits(prev => prev.filter(h => now - h < WINDOW_MS));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const recordHit = useCallback((isError: boolean = false) => {
    if (isError) {
      setStatus('COOLDOWN');
      setTimeout(() => setStatus('STABLE'), 30000);
    }
    setHits(prev => [...prev, Date.now()]);
  }, []);

  const showNotification = useCallback((message: string, type: NotificationType = 'INFO') => {
    const id = Math.random().toString(36).substring(7);
    setNotification({ message, type, id });
    
    // Auto-clear after 4 seconds
    setTimeout(() => {
      setNotification(prev => prev?.id === id ? null : prev);
    }, 4000);
  }, []);

  const clearNotification = useCallback(() => setNotification(null), []);

  const fetchSystemLogs = useCallback(async () => {
    if (!token) return [];
    try {
      const res = await fetchWithAuth('/api/system/logs', token);
      if (res.ok) return await res.json();
      return [];
    } catch (e) {
      console.error("Failed to fetch system logs:", e);
      return [];
    }
  }, [token]);

  const fetchUsage = useCallback(async () => {
    if (!token) return null;
    try {
      const res = await fetchWithAuth('/api/system/usage', token);
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
           return await res.json();
        }
        console.warn("[SystemContext] API returned non-JSON response for usage:", contentType);
        return null;
      }
      return null;
    } catch (e) {
      console.error("Failed to fetch system usage:", e);
      return null;
    }
  }, [token]);

  const rpm = hits.length;
  
  useEffect(() => {
    if (status !== 'COOLDOWN') {
      if (rpm > FREE_TIER_RPM_LIMIT * 0.8) setStatus('BUSY');
      else setStatus('STABLE');
    }
  }, [rpm, status]);

  return (
    <SystemContext.Provider value={{ 
      rpm, 
      limit: FREE_TIER_RPM_LIMIT, 
      status, 
      recordHit, 
      notification, 
      showNotification, 
      clearNotification,
      fetchSystemLogs,
      fetchUsage,
      isLocalAiSupported,
      isLocalAiEnabled,
      setLocalAiEnabled,
      localAiOrigin,
      localAiStatus,
      localAiProgress,
      isLocalAiLoading,
      initLocalAi
    }}>
      {children}
    </SystemContext.Provider>
  );
};

export const useSystem = () => {
  const context = useContext(SystemContext);
  if (!context) throw new Error('useSystem must be used within a SystemProvider');
  return context;
};
