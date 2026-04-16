
import React, { useMemo, useEffect, useState } from 'react';
import { usePlants } from '../context/PlantContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useSystem, UsageData } from '../context/SystemContext';
import { Database, Droplets, Sparkles, HelpCircle, X, Cpu, Activity, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const PlantTelemetry: React.FC = () => {
    const { plants } = usePlants();
    const { t } = useLanguage();
    const { user } = useAuth();
    const { isLocalAiEnabled, isLocalAiSupported, localAiOrigin, fetchUsage } = useSystem();
    const [showHelp, setShowHelp] = useState(false);
    const [usage, setUsage] = useState<UsageData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadUsage = async () => {
            setIsLoading(true);
            const data = await fetchUsage();
            setUsage(data);
            setIsLoading(false);
        };
        loadUsage();
        
        // Refresh every 30 seconds
        const interval = setInterval(loadUsage, 30000);
        return () => clearInterval(interval);
    }, [fetchUsage]);

    const isAdmin = user?.role === 'OWNER' || user?.role === 'CO_CEO';

    const stats = useMemo(() => {
        const filtered = plants.filter(p => {
            if (user?.houseId) return p.houseId === user.houseId;
            if (isAdmin) return true;
            return false;
        });

        const total = filtered.length;
        const thirsty = filtered.filter(p => {
            if (!p.lastWatered || !p.wateringInterval) return false;
            const lastDate = new Date(p.lastWatered);
            const intervalMs = p.wateringInterval * 86400000;
            return (lastDate.getTime() + intervalMs - Date.now()) <= 0;
        }).length;

        const hydrationLevel = total > 0 ? Math.round(((total - thirsty) / total) * 100) : 100;

        return {
            total,
            thirsty,
            hydrationLevel
        };
    }, [plants, user?.houseId, isAdmin]);

    return (
        <div className="px-6 md:px-10 mb-8">
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[32px] p-6 grid grid-cols-1 md:grid-cols-2 gap-6 shadow-xl dark:shadow-2xl relative overflow-hidden">
                {/* Decorative Grid Background */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                
                <div className="relative z-10 flex flex-col gap-1">
                    <div className="flex items-center gap-2 mb-2">
                        <Database className="w-3 h-3 text-verdant" />
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('lbl_specimen_count')}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.total}</span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{t('lbl_units')}</span>
                    </div>
                    <div className="mt-2 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-verdant w-full opacity-50" />
                    </div>
                </div>

                <div className="relative z-10 flex flex-col gap-1">
                    <div className="flex items-center gap-2 mb-2">
                        <Droplets className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('lbl_hydration_index')}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.hydrationLevel}</span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">%</span>
                    </div>
                    <div className="mt-2 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-1000" 
                            style={{ width: `${stats.hydrationLevel}%` }} 
                        />
                    </div>
                </div>

                {isLocalAiSupported && (
                    <div className="md:col-span-2 pt-4 mt-2 border-t border-gray-50 dark:border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className={`w-3 h-3 ${isLocalAiEnabled ? 'text-amber-500 animate-pulse' : 'text-slate-300'}`} />
                            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                {isLocalAiEnabled ? 'Local AI Active' : 'Local AI Standby'}
                            </span>
                            {!isLocalAiEnabled && localAiOrigin === 'WINDOW_AI' && (
                                <button 
                                    onClick={() => setShowHelp(true)}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
                                >
                                    <HelpCircle className="w-3 h-3 text-amber-500" />
                                </button>
                            )}
                        </div>
                        <span className="text-[7px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-tighter">
                            {localAiOrigin === 'WINDOW_AI' ? 'Tensor G4 / Gemini Nano' : 'WebGPU / A18 Pro'}
                        </span>
                    </div>
                )}
            </div>

            {/* AI Usage Dashboard Overlay (Simplified) */}
            {usage && (
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 px-2">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-gray-100 dark:border-white/5 flex flex-col gap-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-3 h-3 text-amber-500" />
                            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Local Tokens</span>
                        </div>
                        <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">
                            {(usage.local_ai_tokens / 1000).toFixed(1)}K
                        </span>
                        <div className="flex items-center gap-1">
                             <div className="h-1 w-8 bg-amber-500/20 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 w-full" />
                             </div>
                             <span className="text-[7px] font-bold text-slate-400 dark:text-slate-500 uppercase">{usage.local_ai_count} Calls</span>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-gray-100 dark:border-white/5 flex flex-col gap-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Activity className="w-3 h-3 text-verdant" />
                            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cloud Tokens</span>
                        </div>
                        <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">
                            {(usage.gemini_tokens / 1000).toFixed(1)}K
                        </span>
                        <div className="flex items-center gap-1">
                             <div className="h-1 w-8 bg-verdant/20 rounded-full overflow-hidden">
                                <div className="h-full bg-verdant w-full" />
                             </div>
                             <span className="text-[7px] font-bold text-slate-400 dark:text-slate-500 uppercase">{usage.gemini_count} Calls</span>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-gray-100 dark:border-white/5 flex flex-col gap-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Cpu className="w-3 h-3 text-purple-500" />
                            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">System Load</span>
                        </div>
                        <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">
                            {usage.system_load}%
                        </span>
                        <div className="flex items-center gap-1">
                             <div className="h-1 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${usage.system_load}%` }} />
                             </div>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-gray-100 dark:border-white/5 flex flex-col gap-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Database className="w-3 h-3 text-blue-500" />
                            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">API Index</span>
                        </div>
                        <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">
                            {usage.plantnet_count + usage.trefle_count + usage.perenual_count + usage.opb_count}
                        </span>
                        <span className="text-[7px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Archive Hits</span>
                    </div>
                </div>
            )}

            <AnimatePresence>
                {showHelp && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="mt-4 p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-[32px] relative"
                    >
                        <button 
                            onClick={() => setShowHelp(false)}
                            className="absolute top-4 right-4 p-2 text-amber-900 dark:text-amber-400 opacity-50 hover:opacity-100"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <h3 className="text-[10px] font-black text-amber-900 dark:text-amber-400 uppercase tracking-widest mb-3">Local AI Activation Guide (Android/Pixel)</h3>
                        <p className="text-xs text-amber-800/80 dark:text-amber-400/80 leading-relaxed mb-4">
                            Your device has the necessary hardware, but Google Chrome requires a manual flag enabled for experimental on-device AI.
                        </p>
                        <div className="space-y-3">
                            <div className="flex gap-3 items-start">
                                <div className="w-5 h-5 bg-amber-200 dark:bg-amber-500/20 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black text-amber-900">1</div>
                                <p className="text-[10px] text-amber-900/60 dark:text-amber-400/60 font-bold uppercase">Open Chrome and navigate to: <code className="bg-white/50 dark:bg-black/20 px-2 py-1 rounded">chrome://flags</code></p>
                            </div>
                            <div className="flex gap-3 items-start">
                                <div className="w-5 h-5 bg-amber-200 dark:bg-amber-500/20 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black text-amber-900">2</div>
                                <p className="text-[10px] text-amber-900/60 dark:text-amber-400/60 font-bold uppercase">Search for: <code className="bg-white/50 dark:bg-black/20 px-2 py-1 rounded">Optimization Guide on-device model</code></p>
                            </div>
                            <div className="flex gap-3 items-start">
                                <div className="w-5 h-5 bg-amber-200 dark:bg-amber-500/20 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black text-amber-900">3</div>
                                <p className="text-[10px] text-amber-900/60 dark:text-amber-400/60 font-bold uppercase">Set to: <span className="text-amber-900 dark:text-amber-200">Enabled BypassPrefRequirement</span></p>
                            </div>
                            <div className="flex gap-3 items-start">
                                <div className="w-5 h-5 bg-amber-200 dark:bg-amber-500/20 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black text-amber-900">4</div>
                                <p className="text-[10px] text-amber-900/60 dark:text-amber-400/60 font-bold uppercase">Relaunch Chrome to apply changes.</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
