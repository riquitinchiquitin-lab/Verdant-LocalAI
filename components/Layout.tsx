import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSystem } from '../context/SystemContext';
import { usePlants } from '../context/PlantContext';
import { Logo } from './ui/Logo';
import { LanguageSelector } from './ui/LanguageSelector';
import { AddPlantModal } from './AddPlantModal';
import { QrScannerModal } from './QrScannerModal';
import { generatePlantDetails } from '../services/plantAi';
import { generateUUID } from '../services/crypto';
import { Button } from './ui/Button';
import { QrCode, Shield, Server, Activity, ArrowRight, Menu, LogOut, Search, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { nativeFeedback, setupNativeUI } from '../services/nativeService';

const NotificationToast: React.FC = () => {
  const { notification, clearNotification } = useSystem();
  
  useEffect(() => {
    if (notification) {
      nativeFeedback.notification(notification.type === 'INFO' ? 'SUCCESS' : notification.type as any);
    }
  }, [notification]);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div 
          initial={{ y: -100, x: '-50%', opacity: 0 }}
          animate={{ y: 0, x: '-50%', opacity: 1 }}
          exit={{ y: -100, x: '-50%', opacity: 0 }}
          className="fixed top-6 left-1/2 z-[1000] w-auto"
        >
          <div className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 backdrop-blur-xl border border-white/20 dark:border-white/5 ${
            notification.type === 'SUCCESS' ? 'bg-emerald-500/90' :
            notification.type === 'ERROR' ? 'bg-rose-500/90' :
            notification.type === 'WARNING' ? 'bg-amber-500/90' :
            'bg-blue-600/90'
          } text-white`}>
            <span className="text-sm font-black tracking-tighter">
              {notification.type === 'SUCCESS' ? '✓' : notification.type === 'ERROR' ? '✕' : notification.type === 'WARNING' ? '!' : 'i'}
            </span>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">{notification.message}</p>
            <button 
              onClick={clearNotification} 
              className="w-6 h-6 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const QuotaBar: React.FC = () => {
  const { rpm, limit, status, isLocalAiSupported, isLocalAiEnabled, setLocalAiEnabled, localAiOrigin, localAiProgress, isLocalAiLoading } = useSystem();
  const { isSynced } = usePlants();
  const { t } = useLanguage();
  
  const percentage = Math.min(100, (rpm / limit) * 100);
  
  const barColor = 
    status === 'COOLDOWN' ? 'bg-red-500' : 
    status === 'BUSY' ? 'bg-amber-500' : 
    'bg-emerald-500';

  const textColor = 
    status === 'COOLDOWN' ? 'text-red-500' : 
    status === 'BUSY' ? 'text-amber-500' : 
    'text-emerald-500';

  return (
    <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 space-y-4">
      {isLocalAiSupported && (
        <div className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-widest">{t('sys_local_ai')}</span>
              <span className="text-[7px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                {localAiOrigin === 'WINDOW_AI' ? 'Gemini Nano (Pixel/Chrome)' : 'WebGPU Accelerated (Llama-3)'}
              </span>
            </div>
            <button 
              onClick={() => setLocalAiEnabled(!isLocalAiEnabled)}
              disabled={isLocalAiLoading}
              className={`w-10 h-5 rounded-full transition-all relative ${isLocalAiEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-700'} ${isLocalAiLoading ? 'opacity-50 cursor-wait' : ''}`}
            >
              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isLocalAiEnabled ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
          
          {isLocalAiLoading && (
            <div className="space-y-1.5 animate-in fade-in duration-500">
              <div className="flex justify-between items-center text-[7px] font-black text-slate-400 uppercase tracking-widest">
                <span>Syncing Model...</span>
                <span>{Math.round(localAiProgress * 100)}%</span>
              </div>
              <div className="h-1 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-verdant transition-all duration-300" 
                  style={{ width: `${localAiProgress * 100}%` }} 
                />
              </div>
              <p className="text-[6px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-none opacity-60">
                Model cached in persistent storage for offline edge compute.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('sys_uplink')}</span>
            <span className={`text-[8px] font-black uppercase tracking-tighter ${textColor}`}>
            {status === 'COOLDOWN' ? t('sys_cooldown') : status === 'BUSY' ? t('sys_busy') : t('sys_stable')}
            </span>
        </div>
        <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
            className={`h-full transition-all duration-1000 ${barColor}`} 
            style={{ width: `${percentage}%` }}
            />
        </div>
      </div>
      
      <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isSynced ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse' : 'bg-gray-300'}`}></div>
              <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">
                {isSynced ? 'VERDANT_CORE_UP' : 'LOCAL_SHADOW_LINK'}
              </span>
          </div>
          <Activity className="w-2.5 h-2.5 text-slate-300 dark:text-slate-700" />
      </div>
    </div>
  );
};

import { ThemeToggle } from './ThemeToggle';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, user, can } = useAuth();
  const { alertMessage, setAlertMessage, searchFilter, setSearchFilter, addPlant, getEffectiveApiKey } = usePlants();
  const { t, lv } = useLanguage();
  const { showNotification } = useSystem();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setupNativeUI();
  }, []);

  const handleScanSuccess = async (data: string) => {
    setIsScannerOpen(false);
    const parts = data.split('|');
    if (parts.length >= 3) {
      const [sourceHouse, sourceId, species, family] = parts;
      setIsSyncing(true);
      showNotification("SYNCING SPECIMEN...", "INFO");
      try {
        const details = await generatePlantDetails(species, undefined, undefined, getEffectiveApiKey());
        const syncedPlant = {
          ...details,
          id: `p-synced-${generateUUID()}`,
          species: species,
          family: family || details.family,
          houseId: user?.houseId || null, 
          createdAt: new Date().toISOString(),
          nickname: details.nickname || { en: species },
          images: details.images?.length ? details.images : ['https://images.unsplash.com/photo-1545239351-ef35f43d514b?q=80&w=1000&auto=format&fit=crop'],
          edible: details.edible || false,
          logs: []
        };
        await addPlant(syncedPlant as any);
        showNotification("SYNC SUCCESS", "SUCCESS");
      } catch (err) {
        showNotification("SYNC FAILED", "ERROR");
      } finally {
        setIsSyncing(false);
      }
    } else {
      showNotification("INVALID SYNC ID", "WARNING");
    }
  };

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      setShowInstallBtn(false);
      return;
    }

    const handlePromptAvailable = () => setShowInstallBtn(true);
    const handleInstalled = () => setShowInstallBtn(false);

    window.addEventListener('pwa-prompt-available', handlePromptAvailable);
    window.addEventListener('pwa-installed', handleInstalled);
    
    if ((window as any).deferredPwaPrompt) setShowInstallBtn(true);

    return () => {
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = (window as any).deferredPwaPrompt;
    if (!promptEvent) return;
    
    promptEvent.prompt();
    await promptEvent.userChoice;
    (window as any).deferredPwaPrompt = null;
    setShowInstallBtn(false);
  };

  const navItems = [
    { to: '/', label: t('menu_my_plants'), icon: '🌱' },
    { to: '/care', label: t('menu_care'), icon: '💧' },
    { to: '/tasks', label: t('menu_tasks'), icon: '📋' },
    { to: '/inventory', label: t('menu_inventory'), icon: '📦' },
    { to: '/labels', label: t('menu_labels'), icon: '🏷️' },
    { to: '/locations', label: t('stats_locations'), icon: '📍' },
  ];

  const isManager = ['OWNER', 'CO_CEO', 'LEAD_HAND'].includes(user?.role || '');
  if (isManager) {
    navItems.push({ to: '/admin', label: t('menu_admin'), icon: '🧰' });
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex transition-colors duration-500 overflow-hidden">
      <NotificationToast />
      {alertMessage && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-emerald-500 text-emerald-900 text-sm font-bold px-4 py-2 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-4">
          {alertMessage}
        </div>
      )}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 w-72 bg-white dark:bg-slate-950 border-r border-gray-100 dark:border-slate-800 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 flex flex-col no-print pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]`}>
        <AddPlantModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSave={addPlant} />
        <QrScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScanSuccess={handleScanSuccess} />

        <div className="p-8 pb-4">
          <Link to="/" className="flex items-center gap-4 group" onClick={() => setIsSidebarOpen(false)}>
            <div className="w-10 h-10 group-hover:scale-110 transition-transform duration-500">
                <Logo />
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">{t('app_name')}</h1>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar pb-6">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center gap-4 px-3 py-3 rounded-[24px] text-[10px] font-black uppercase tracking-[0.1em] transition-all relative overflow-hidden group ${
                location.pathname === item.to 
                  ? 'bg-verdant text-white shadow-lg shadow-verdant/20' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              {location.pathname === item.to && (
                <motion.div 
                  layoutId="activeNav"
                  className="absolute inset-0 bg-gradient-to-r from-verdant to-emerald-600 opacity-100 z-0"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <div className={`w-10 h-10 shrink-0 clay-icon z-10 ${location.pathname === item.to ? 'bg-white/20 text-white' : ''}`}>
                <span className="text-xl">{item.icon}</span>
              </div>
              <span className="flex-1 z-10">{item.label}</span>
              {location.pathname === item.to && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse z-10" />}
            </Link>
          ))}

          {showInstallBtn && (
            <div className="px-2 pt-6">
              <button
                onClick={handleInstallClick}
                className="w-full flex flex-col items-center justify-center p-6 rounded-[32px] bg-blue-600 hover:bg-blue-700 text-white shadow-2xl shadow-blue-500/30 transition-all group relative overflow-hidden border border-blue-400/50"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                   <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M19h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                </div>
                <span className="text-2xl mb-2">📲</span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] leading-none mb-1">{t('sys_install_app')}</span>
                <span className="text-[7px] font-bold uppercase tracking-widest opacity-60">{t('sys_ready_standalone')}</span>
              </button>
            </div>
          )}
        </nav>

        <div className="mt-auto">
          <QuotaBar />
          <div className="p-6 border-t border-gray-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between px-2">
                <LanguageSelector direction="up" />
                <div className="flex items-center gap-1">
                    <ThemeToggle />
                    <button 
                      onClick={logout}
                      className="p-3 text-slate-500 dark:text-slate-400 hover:text-red-500 transition-all border border-gray-100 dark:border-slate-800 rounded-xl"
                      title={t('menu_sign_out')}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                </div>
            </div>
            {user && (
                <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500 dark:text-slate-400 uppercase border border-gray-200 dark:border-slate-700">
                        {(lv(user.name) || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black text-gray-900 dark:text-white truncate uppercase tracking-tighter">{lv(user.name) || 'Anonymous'}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('role_' + user.role.toLowerCase())}</p>
                          <span className="text-[7px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-tighter">v1.0</span>
                        </div>
                    </div>
                </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative h-screen overflow-hidden bg-white dark:bg-slate-950 print:h-auto print:overflow-visible">
        <header className="h-[calc(4rem+env(safe-area-inset-top))] md:h-20 pt-[env(safe-area-inset-top)] bg-white dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 shrink-0 z-30 no-print gap-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-600 dark:text-slate-400 border border-gray-100 dark:border-slate-800 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="flex-1 max-w-2xl relative group">
                <input 
                    type="text"
                    placeholder={t('search_placeholder') || "Search plants, inventory, tasks..."}
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full h-10 md:h-12 pl-10 pr-12 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm focus:ring-4 focus:ring-verdant/10 outline-none transition-all dark:text-white"
                />
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                
                {can('create_plants') && (
                    <button 
                        onClick={() => setIsScannerOpen(true)}
                        disabled={isSyncing}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-verdant transition-all border border-gray-100 dark:border-slate-700 rounded-lg group overflow-hidden"
                        title={t('scan_sync')}
                    >
                        {isSyncing ? (
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <div className="relative w-5 h-5 md:w-6 md:h-6 flex items-center justify-center">
                                <QrCode className="w-full h-full text-slate-400 dark:text-slate-500 group-hover:text-verdant transition-colors" />
                            </div>
                        )}
                    </button>
                )}
          </div>

          <div className="flex items-center gap-2 md:gap-4">
              {can('create_plants') && (
                  <Button className="shadow-xl shadow-verdant/20 h-10 md:h-12 px-3 md:px-6 rounded-xl md:rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 text-[10px] md:text-xs" onClick={() => setIsAddModalOpen(true)}>
                      <span className="text-lg md:text-xl">+</span>
                      <span className="hidden md:inline">{t('btn_add_plant')}</span>
                      <span className="md:hidden text-xl">🪴</span>
                  </Button>
              )}
              <div className="hidden md:block w-8 h-8">
                <Logo />
              </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-[env(safe-area-inset-bottom,4rem)] print:pb-0 print:overflow-visible bg-white dark:bg-slate-950">
            <div className="max-w-7xl mx-auto pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] p-6 md:p-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
        </div>

        {/* MOBILE FLOATING ACTION BUTTON */}
        <div className="lg:hidden fixed bottom-8 right-6 z-[100] flex flex-col items-end gap-3 pointer-events-none">
          <AnimatePresence>
            {!isAddModalOpen && !isScannerOpen && (
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="pointer-events-auto flex flex-col items-end gap-4"
              >
                {can('create_plants') && (
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="w-12 h-12 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl flex items-center justify-center text-slate-500 hover:text-verdant active:scale-95 transition-all"
                  >
                    <QrCode className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="w-16 h-16 bg-verdant text-white rounded-[24px] shadow-2xl shadow-verdant/30 flex items-center justify-center active:scale-95 transition-all relative group overflow-hidden border border-emerald-400/50"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent pointer-events-none" />
                  <Plus className="w-8 h-8 relative z-10" />
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
