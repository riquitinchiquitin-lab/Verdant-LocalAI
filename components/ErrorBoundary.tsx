import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Verdant System Crash:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-8 text-center">
          <div className="w-20 h-20 mb-8 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
             <span className="text-4xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-4 italic">System Protocol Violation</h1>
          <p className="text-slate-400 max-w-md text-sm leading-relaxed mb-8">
            An unhandled runtime exception has interrupted the Verdant neural link. 
            The system core has been locked to prevent data corruption.
          </p>
          <div className="p-4 bg-black/40 rounded-xl border border-white/5 font-mono text-[10px] text-red-400 text-left w-full max-w-lg overflow-auto mb-8">
             {this.state.error?.toString()}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-verdant text-white font-black uppercase tracking-widest rounded-full hover:scale-105 transition-transform"
          >
            Re-Initialize Link
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
