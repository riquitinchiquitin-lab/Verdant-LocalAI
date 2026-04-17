import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { LANGUAGES } from '../../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface LanguageSelectorProps {
  direction?: 'up' | 'down';
  align?: 'left' | 'right';
  className?: string;
  variant?: 'ghost' | 'filled';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  direction = 'down', 
  align = 'left',
  className = '',
  variant = 'ghost'
}) => {
  const { currentLanguage, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const baseButtonStyles = variant === 'filled' 
    ? "bg-slate-50 dark:bg-slate-900 border border-gray-100 dark:border-white/5 shadow-sm" 
    : "hover:bg-gray-50 dark:hover:bg-slate-900 border border-transparent hover:border-gray-100 dark:hover:border-white/5";

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <motion.button 
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all ${baseButtonStyles} group`}
      >
        <span className="text-xl group-hover:scale-110 transition-transform duration-300">{currentLanguage.flag}</span>
        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] font-mono">{currentLanguage.code}</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: direction === 'up' ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: direction === 'up' ? 10 : -10 }}
            className={`absolute ${direction === 'up' ? 'bottom-full mb-4' : 'top-full mt-4'} ${align === 'right' ? 'right-0' : 'left-0'} w-72 bg-white dark:bg-slate-950 border border-gray-100 dark:border-white/10 rounded-[32px] shadow-2xl z-[200] py-4 overflow-hidden backdrop-blur-3xl`}
          >
            <div className="px-6 pb-3 mb-3 border-b border-gray-50 dark:border-white/5">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono">Select_Language</p>
            </div>
            <div className="max-h-80 overflow-y-auto no-scrollbar px-2 space-y-1">
              {LANGUAGES.map((lang, idx) => (
                <motion.button
                  key={lang.code}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all group ${currentLanguage.code === lang.code ? 'bg-verdant/5 text-verdant' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl group-hover:scale-110 transition-transform">{lang.flag}</span>
                    <span className="text-[11px] font-black uppercase tracking-widest">{lang.label}</span>
                  </div>
                  {currentLanguage.code === lang.code && <div className="w-2 h-2 rounded-full bg-verdant animate-pulse" />}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
