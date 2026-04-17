import React from 'react';
import { motion } from 'motion/react';
import { nativeFeedback } from '../../services/nativeService';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant, 
  size = 'md', 
  isLoading, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-2xl font-black transition-all focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed border uppercase tracking-[0.15em]";
  
  const variants = {
    primary: "bg-verdant text-white hover:bg-emerald-600 border-verdant-hover focus:ring-verdant/20 shadow-xl shadow-verdant/20",
    secondary: "bg-white text-slate-900 hover:bg-slate-50 border-gray-100 focus:ring-slate-500/10 dark:bg-slate-900 dark:text-white dark:border-slate-800 dark:hover:bg-slate-800",
    danger: "bg-rose-600 text-white hover:bg-rose-700 border-rose-500/50 shadow-xl shadow-rose-500/10 focus:ring-rose-500/20",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100 border-transparent dark:text-slate-400 dark:hover:bg-slate-800",
  };

  const sizes = {
    sm: "px-4 py-2 text-[8px]",
    md: "px-6 py-3 text-[10px]",
    lg: "px-8 py-4 text-[12px]",
  };

  return (
    <motion.button 
      whileTap={{ scale: 0.96 }}
      onClick={(e) => {
        nativeFeedback.impact();
        props.onClick?.(e);
      }}
      className={`${baseStyles} ${variant ? variants[variant] : ''} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...(props as any)}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </motion.button>
  );
};