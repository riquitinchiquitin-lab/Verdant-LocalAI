
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlants } from '../context/PlantContext';
import { useLanguage } from '../context/LanguageContext';
import { useSystem } from '../context/SystemContext';
import { Button } from '../components/ui/Button';
import { Plant } from '../types';
import { Plus, Scan, Download, Server } from 'lucide-react';
import { AddPlantModal } from '../components/AddPlantModal';
import { PlantCard } from '../components/PlantCard';
import { PlantDetailsModal } from '../components/PlantDetailsModal';
import { QrScannerModal } from '../components/QrScannerModal';
import { PlantTelemetry } from '../components/PlantTelemetry';
import { motion } from 'framer-motion';
import { exportPlantsToNiimbotExcel } from '../services/exportService';
import { generatePlantDetails } from '../services/plantAi';
import { generateUUID } from '../services/crypto';

export const Dashboard: React.FC = () => {
  const { user, can } = useAuth();
  const { showNotification } = useSystem();
  const navigate = useNavigate();
  const { plants, addPlant, restoreDemoData, houses, getEffectiveApiKey, searchFilter, refreshAllData, isSynced } = usePlants();
  const { t, lv } = useLanguage();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewMode, setViewMode] = useState<'MY_HOUSE' | 'ALL'>('MY_HOUSE');
  const [selectedHouseFilter, setSelectedHouseFilter] = useState<string | 'ALL' | 'UNATTRIBUTED'>('ALL');

  const isAdmin = user?.role === 'OWNER' || user?.role === 'CO_CEO';

  const filtered = useMemo(() => {
    return plants.filter(p => {
      // 1. Admin House Filter (if active)
      if (isAdmin && selectedHouseFilter !== 'ALL') {
        if (selectedHouseFilter === 'UNATTRIBUTED') return !p.houseId;
        return p.houseId === selectedHouseFilter;
      }

      // 2. If viewing all plants (only for admins), show everything
      if (isAdmin && viewMode === 'ALL') return true;
      
      // 3. If viewing "My House"
      if (viewMode === 'MY_HOUSE') {
        // If user has a house assigned, they see plants in that house
        // Admins also see unattributed plants in "My House" mode
        if (user?.houseId) {
          return p.houseId === user.houseId || (isAdmin && !p.houseId);
        }
        
        // Admins with NO house assigned see EVERYTHING in "My House" mode (since they own all houses)
        if (isAdmin) return true;
        
        // If user has no house assigned and is NOT an admin, they see nothing in "My House" mode
        return false;
      }
      
      return false;
    }).filter(p => {
        const f = searchFilter.toLowerCase();
        if (!f) return true;
        return (lv(p.nickname) || '').toLowerCase().includes(f) || (p.species || '').toLowerCase().includes(f);
    });
  }, [plants, user, isAdmin, viewMode, selectedHouseFilter, searchFilter, lv]);

  const { featured, others } = useMemo(() => {
    const priorityPlant = filtered.find(p => p.isPriority);
    if (priorityPlant) {
      return {
        featured: priorityPlant,
        others: filtered.filter(p => p.id !== priorityPlant.id)
      };
    }
    return {
      featured: filtered[0],
      others: filtered.slice(1)
    };
  }, [filtered]);

  const handleExport = () => {
    const fileName = `verdant_${user?.house?.name?.en || 'jungle'}_labels.xlsx`;
    exportPlantsToNiimbotExcel(filtered, lv, fileName);
    showNotification("EXPORT COMPLETE", "SUCCESS");
  };

  const handleScanSuccess = async (data: string) => {
    setIsScannerOpen(false);
    
    const parts = data.split('|');
    if (parts.length >= 3) {
      const [sourceHouse, sourceId, species, family] = parts;
      
      setIsSyncing(true);
      showNotification("SYNCING SPECIMEN...", "INFO");
      try {
        const details = await generatePlantDetails(species, undefined, undefined, getEffectiveApiKey());
        
        const syncedPlant: Plant = {
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
        } as Plant;

        await addPlant(syncedPlant);
        setSelectedPlant(syncedPlant);
        showNotification("SYNC SUCCESS", "SUCCESS");
      } catch (err) {
        console.error("Botanical Sync Failure:", err);
        showNotification("SYNC FAILED", "ERROR");
      } finally {
        setIsSyncing(false);
      }
    } else {
      showNotification("INVALID SYNC ID", "WARNING");
    }
  };

  const thirstyCount = useMemo(() => {
    return plants.filter(p => {
        if (!p.lastWatered || !p.wateringInterval) return false;
        const lastDate = new Date(p.lastWatered);
        const intervalMs = p.wateringInterval * 86400000;
        return (lastDate.getTime() + intervalMs - Date.now()) <= 0;
    }).length;
  }, [plants]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    show: { opacity: 1, scale: 1, y: 0 }
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-8">
        <AddPlantModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSave={addPlant} />
        <PlantDetailsModal isOpen={!!selectedPlant} plant={selectedPlant} onClose={() => setSelectedPlant(null)} />
        <QrScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScanSuccess={handleScanSuccess} />

        {/* REFINED SYSTEM HEADER */}
        <div className="px-6 md:px-10 pt-4 flex flex-col gap-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-verdant/5 blur-[120px] rounded-full -mr-64 -mt-64 pointer-events-none" />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-verdant animate-ping" />
                      <p className="text-[10px] font-black text-verdant uppercase tracking-[0.5em] mb-0 whitespace-nowrap">
                        {isSynced ? 'BIO_MONITOR_UP' : 'OFFLINE_CACHE_DEPLOYED'} // {new Date().toLocaleTimeString(undefined, { hour12: false })}
                      </p>
                    </div>
                    <div className="space-y-0">
                      <h1 className="text-6xl md:text-8xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-[0.8]">
                          {t('app_name')} <span className="text-verdant opacity-50">/</span>
                      </h1>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="h-[2px] w-8 bg-slate-200 dark:bg-slate-800" />
                        <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">
                          {user?.house?.name?.en || 'UNATTRIBUTED_SECTOR'} // {user?.houseId?.slice(0, 8).toUpperCase() || 'CORE'}
                        </p>
                      </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {isAdmin && (
                        <div className="relative">
                          <select 
                              className="h-12 pl-6 pr-12 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 outline-none focus:ring-4 focus:ring-verdant/5 transition-all appearance-none min-w-[200px]"
                              value={selectedHouseFilter}
                              onChange={(e) => setSelectedHouseFilter(e.target.value as any)}
                          >
                              <option value="ALL">ALL_GLOBAL_ASSETS</option>
                              <option value="UNATTRIBUTED">UNATTRIBUTED_BIO</option>
                              {houses.map(h => (
                                  <option key={h.id} value={h.id}>{lv(h.name)}</option>
                              ))}
                          </select>
                          <Download className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300 pointer-events-none" />
                        </div>
                    )}
                    <button 
                      onClick={() => setIsScannerOpen(true)}
                      className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/5 rounded-2xl text-slate-500 hover:text-verdant hover:shadow-2xl hover:scale-105 transition-all active:scale-95"
                    >
                      <Scan className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={handleExport}
                      className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/5 rounded-2xl text-slate-500 hover:text-blue-500 hover:shadow-2xl hover:scale-105 transition-all active:scale-95"
                      title="Export Asset List"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* QUICK STATUS TICKER */}
            <div className="flex flex-wrap gap-3">
                <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center gap-3 group hover:border-amber-200 transition-colors cursor-pointer">
                    <div className={`w-2 h-2 rounded-full ${thirstyCount > 0 ? 'bg-amber-500 animate-[pulse_1.5s_infinite] shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-emerald-500'}`} />
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest font-mono">
                      {thirstyCount > 0 ? `HYDRATION_DEFICIT: ${thirstyCount}_UNITS` : 'WATER_CORE: STABLE'}
                    </span>
                </div>
                <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center gap-3">
                    <Server className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest font-mono">
                      SRV_NODE: US-EAST-1/PRX-01
                    </span>
                </div>
            </div>
        </div>

        <PlantTelemetry mode="stats" />

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="px-6 md:px-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 pb-8"
        >
            {filtered.map(plant => (
                <motion.div 
                  key={plant.id} 
                  variants={itemVariants}
                  className="relative group"
                >
                    {!plant.houseId && (
                        <div className="absolute -top-3 -right-3 z-20 bg-amber-500 text-white text-[8px] font-black px-2 py-1 rounded-full shadow-lg border-2 border-white dark:border-slate-900 uppercase tracking-widest animate-bounce">
                            {t('lbl_unattributed')}
                        </div>
                    )}
                    <PlantCard plant={plant} onClick={() => setSelectedPlant(plant)} showActions={can('log_data')} />
                </motion.div>
            ))}
        </motion.div>
        
        {filtered.length === 0 && (
            <div className="py-24 text-center border-4 border-dashed border-gray-100 dark:border-slate-800 rounded-[48px]">
                <p className="text-gray-400 font-black uppercase tracking-[0.4em]">{t('empty_jungle')}</p>
                <Button variant="primary" className="mt-8 rounded-2xl" onClick={restoreDemoData}>{t('restore_examples')}</Button>
            </div>
        )}
    </div>
  );
};
