import React, { useState, useRef, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useLanguage } from '../context/LanguageContext';
import jsQR from 'jsqr';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: string) => void;
}

declare global {
  interface Window {
    jsQR: any;
    jsqr: any;
  }
}

// Unified failsafe resolver for jsQR (handles multiple bundle forms and window globally)
const resolveQrDecoder = (): any => {
  if (typeof window !== 'undefined') {
    if (typeof (window as any).jsQR === 'function') return (window as any).jsQR;
    if (typeof (window as any).jsqr === 'function') return (window as any).jsqr;
  }
  if (typeof jsQR === 'function') return jsQR;
  if (jsQR && typeof (jsQR as any).default === 'function') return (jsQR as any).default;
  if (jsQR && typeof (jsQR as any).jsQR === 'function') return (jsQR as any).jsQR;
  if (jsQR && typeof (jsQR as any).jsqr === 'function') return (jsQR as any).jsqr;
  return null;
};

export const QrScannerModal: React.FC<QrScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef<boolean>(false);

  // Restart scanner or reset states when opening/closing
  useEffect(() => {
    if (!isOpen) {
      activeRef.current = false;
      return;
    }

    activeRef.current = true;
    setError(null);

    let stream: MediaStream | null = null;
    let animationFrameId: number | null = null;

    // Create an in-memory canvas once to avoid browser-specific DOM canvas layout and clipping issues
    const canvas = document.createElement("canvas");

    const runScanner = async () => {
      try {
        console.log("Scanner: Requesting user media...");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }
        });

        if (!activeRef.current) {
          console.log("Scanner: Closed before stream authorized.");
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        console.log("Scanner: Camera access authorized. Binding video...");
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          try {
            await videoRef.current.play();
            console.log("Scanner: Video started playing successfully.");
          } catch (playErr) {
            console.warn("Scanner: Video play error:", playErr);
          }
        }

        let lastScanTime = 0;

        const scanFrame = () => {
          if (!activeRef.current) return;

          try {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              const video = videoRef.current;
              const ctx = canvas.getContext("2d", { willReadFrequently: true });

              if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
                const now = Date.now();
                // Throttle JS-based decoding to once every 120ms to allow autofocus to settle and save CPU cycles
                if (now - lastScanTime >= 120) {
                  lastScanTime = now;

                  // Set high-fidelity target width for dense/detailed QR codes (up to 1024px width)
                  const targetWidth = Math.min(video.videoWidth, 1024);
                  const targetHeight = Math.round((video.videoHeight * targetWidth) / video.videoWidth);

                  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
                    canvas.width = targetWidth;
                    canvas.height = targetHeight;
                  }

                  // Draw current video stream frame onto the in-memory canvas
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                  const qrDecodeFunc = resolveQrDecoder();

                  if (typeof qrDecodeFunc === 'function') {
                    const code = qrDecodeFunc(imageData.data, imageData.width, imageData.height, {
                      inversionAttempts: "attemptBoth",
                    });

                    if (code && code.data) {
                      console.log("Scanner: QR Code successfully decoded!", code.data);
                      
                      // Stop scanner loop
                      activeRef.current = false;
                      
                      // Clean up stream tracks immediately
                      if (stream) {
                        stream.getTracks().forEach(track => {
                          track.stop();
                          track.enabled = false;
                        });
                      }
                      if (videoRef.current) {
                        videoRef.current.srcObject = null;
                        try {
                          videoRef.current.pause();
                        } catch (pauseErr) {}
                      }

                      onScanSuccess(code.data);
                      return;
                    }
                  } else {
                    console.warn("Scanner: jsQR library could not be resolved to a usable function.");
                  }
                }
              }
            }
          } catch (tickErr) {
            console.error("Scanner: Error processing camera frame stream:", tickErr);
          }

          if (activeRef.current) {
            animationFrameId = requestAnimationFrame(scanFrame);
          }
        };

        animationFrameId = requestAnimationFrame(scanFrame);
      } catch (err) {
        console.error("Scanner Camera Error:", err);
        setError("Camera access is restricted. Please check site permissions to scan.");
      }
    };

    runScanner();

    return () => {
      console.log("Scanner: Cleaning up resources and streams...");
      activeRef.current = false;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        try {
          videoRef.current.pause();
        } catch (e) {}
      }
    };
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Specimen & Item Scanner" size="lg">
      <div className="flex flex-col items-center space-y-6 py-2">
        <div className="w-full flex flex-col items-center">
          {error ? (
            <div className="text-center p-8 bg-red-50 dark:bg-red-950/20 rounded-[32px] border border-red-100 dark:border-red-900/30 flex flex-col items-center max-w-sm w-full">
               <p className="text-red-600 dark:text-red-400 font-black uppercase tracking-widest text-[10px] mb-4">WEBCAM RESTRICTED</p>
               <p className="text-xs text-gray-500 dark:text-slate-400 mb-6 font-semibold leading-relaxed">
                 {error}
               </p>
               <Button onClick={onClose} className="w-full uppercase tracking-wider font-bold h-11 text-xs">
                 Close Scanner
               </Button>
            </div>
          ) : (
            <div className="relative w-full aspect-square max-w-[300px] rounded-[48px] overflow-hidden border-8 border-gray-100 dark:border-slate-800 shadow-2xl bg-black">
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover" 
                autoPlay
                playsInline 
                muted 
              />
              
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-verdant/50 rounded-[32px] relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-verdant rounded-tl-xl"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-verdant rounded-tr-xl"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-verdant rounded-bl-xl"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-verdant rounded-br-xl"></div>
                  
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-verdant shadow-[0_0_15px_rgba(94,143,71,0.8)] animate-[scan_2s_infinite]"></div>
                </div>
                <p className="mt-8 text-[10px] font-black text-white/50 uppercase tracking-[0.3em]">Align code within the frame</p>
              </div>
            </div>
          )}
        </div>

        <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest text-center px-4 leading-relaxed max-w-md">
          Verdant scans labels to coordinate offline-first specimen mapping and remote-synced updates instantly.
        </p>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes scan {
            0% { top: 0%; opacity: 0; }
            5% { opacity: 1; }
            95% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
        `}} />
      </div>
    </Modal>
  );
};

