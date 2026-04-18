
import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCw, Plus, Trash2, SmartphoneNfc, Server, ShieldCheck, ShieldAlert, X, Copy, Check, Smartphone as PhoneIcon } from 'lucide-react';
import { Button } from './ui/Button';
import { fetchWithAuth } from '../services/api';
import { useSystem } from '../context/SystemContext';
import { useLanguage } from '../context/LanguageContext';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileDevice {
  id: string;
  deviceName: string;
  pairedAt: string;
  lastSeen: string;
}

interface HandshakeToken {
  token: string;
  expiresAt: string;
  nodeUrl: string;
}

export const MobileBridge: React.FC = () => {
  const { showNotification } = useSystem();
  const { t } = useLanguage();
  const [devices, setDevices] = useState<MobileDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [handshakeToken, setHandshakeToken] = useState<HandshakeToken | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('verdant_token') || '';
      const response = await fetchWithAuth('/api/mobile/devices', token);
      if (response.ok) {
        const data = await response.json();
        setDevices(data);
      }
    } catch (e) {
      console.error("Failed to fetch devices:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateToken = async () => {
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('verdant_token') || '';
      const response = await fetchWithAuth('/api/mobile/token', token, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setHandshakeToken(data);
        showNotification("Security Handshake Initiated", "SUCCESS");
      }
    } catch (e) {
      showNotification("Failed to generate bridge token", "ERROR");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    try {
      const token = localStorage.getItem('verdant_token') || '';
      const response = await fetchWithAuth(`/api/mobile/devices/${id}`, token, { method: 'DELETE' });
      if (response.ok) {
        setDevices(prev => prev.filter(d => d.id !== id));
        showNotification("Device De-provisioned", "SUCCESS");
      }
    } catch (e) {
      showNotification("De-provisioning failed", "ERROR");
    }
  };

  const qrValue = handshakeToken ? JSON.stringify({
    n: handshakeToken.nodeUrl,
    t: handshakeToken.token,
    v: 1
  }) : '';

  const handleCopyUrl = () => {
    if (handshakeToken) {
        navigator.clipboard.writeText(handshakeToken.nodeUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Connection Control */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[40px] p-8 border border-slate-100 dark:border-white/5 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-verdant/10 rounded-2xl">
              <SmartphoneNfc className="w-8 h-8 text-verdant" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Mobile Handshake</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Provision Native Connect</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Generate a secure, short-lived handshake token to connect your native Android or iOS application to this Verdant Node.
          </p>

          {!handshakeToken ? (
            <Button 
              variant="primary" 
              className="w-full rounded-2xl py-4 font-black uppercase tracking-widest"
              onClick={handleGenerateToken}
              isLoading={isGenerating}
            >
              <Plus className="w-5 h-5 mr-3" />
              Generate Handshake QR
            </Button>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-white rounded-[32px] p-8 flex flex-col items-center gap-6 shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setHandshakeToken(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="p-4 bg-slate-50 rounded-2xl">
                <QRCodeSVG value={qrValue} size={200} level="H" includeMargin />
              </div>

              <div className="text-center space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Handshake Secret</p>
                <code className="text-xs font-mono font-bold text-slate-900 break-all bg-slate-100 px-3 py-1 rounded-lg">
                  {handshakeToken.token.substring(0, 16)}...
                </code>
              </div>

              <div className="w-full pt-4 border-t border-slate-100 flex flex-col gap-2">
                 <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Node URL</span>
                    <button onClick={handleCopyUrl} className="text-verdant hover:underline flex items-center gap-1">
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                 </div>
                 <p className="text-[10px] font-mono font-bold text-slate-600 truncate">{handshakeToken.nodeUrl}</p>
              </div>

              <p className="text-[9px] font-bold text-amber-600 uppercase text-center animate-pulse">
                Expiring in {Math.round((new Date(handshakeToken.expiresAt).getTime() - Date.now()) / 60000)} minutes
              </p>
            </motion.div>
          )}
        </div>

        {/* Paired Devices */}
        <div className="bg-white dark:bg-slate-900/40 rounded-[40px] p-8 border border-slate-100 dark:border-white/5 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-2xl">
                <ShieldCheck className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Paired Devices</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Mobile Bridges</p>
              </div>
            </div>
            <button 
                onClick={fetchDevices} 
                className="p-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                title="Refresh Devices"
            >
                <RotateCw className={`w-5 h-5 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {devices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-30">
                <PhoneIcon className="w-12 h-12 text-slate-300" />
                <p className="text-xs font-bold uppercase tracking-widest">No Devices Paired</p>
              </div>
            ) : (
              devices.map(device => (
                <motion.div 
                  key={device.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-white/5 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">{device.deviceName}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-bold text-slate-400 uppercase">Seen: {new Date(device.lastSeen).toLocaleTimeString()}</span>
                        <div className="w-1 h-1 bg-verdant rounded-full" />
                        <span className="text-[8px] font-bold text-slate-400 uppercase">Paired: {new Date(device.pairedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteDevice(device.id)}
                    className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </motion.div>
              ))
            )}
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-500/20 rounded-3xl">
             <div className="flex gap-3">
             <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0" />
                <p className="text-[9px] font-bold text-amber-800/70 dark:text-amber-400/70 leading-relaxed uppercase tracking-wide">
                  Paired devices have access to botanical data and local AI synchronization. De-provision any device you no longer recognize immediately.
                </p>
             </div>
          </div>
        </div>
      </div>

      {/* Technical Blueprint Info */}
      <div className="bg-slate-100 dark:bg-slate-800/40 rounded-[40px] p-8 space-y-4">
         <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-slate-500" />
            <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Protocol Specification (v1.2)</h4>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
                <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Hardware Handshake</span>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">Uses 256-bit handshake tokens to establish a persistent security context between native silicon and this node.</p>
            </div>
            <div className="space-y-2">
                <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tensor Optimization</span>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">Configured to push botanical weight sets to the device's NPU for zero-latency identification.</p>
            </div>
            <div className="space-y-2">
                <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data Integrity</span>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">Syncs botanical care logs, telemetry, and garden maps via a low-overhead binary sync protocol.</p>
            </div>
         </div>
      </div>
    </div>
  );
};
