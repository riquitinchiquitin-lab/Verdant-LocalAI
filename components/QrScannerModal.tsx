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
  }
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      activeRef.current = false;
      return;
    }

    activeRef.current = true;
    setError(null);

    let stream: MediaStream | null = null;
    let animationFrameId: number | null = null;

    const runScanner = async () => {
      try {
        console.log("Scanner: Initializing getUserMedia...");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }
        });

        if (!activeRef.current) {
          console.log("Scanner: Closed before stream authorized.");
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        console.log("Scanner: Camera authorized. Binding to video element...");
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          try {
            await videoRef.current.play();
            console.log("Scanner: Video started playing successfully.");
          } catch (playErr) {
            console.warn("Scanner: Video play error (attempting workaround):", playErr);
          }
        }

        const scanFrame = () => {
          if (!activeRef.current) return;

          try {
            if (videoRef.current && videoRef.current.readyState >= 2 && canvasRef.current) {
              const video = videoRef.current;
              const canvas = canvasRef.current;
              const ctx = canvas.getContext("2d", { willReadFrequently: true });

              if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
                // Downscale image dynamically to standard 480px width for incredibly responsive decoding without heating up mobile CPUs.
                const targetWidth = Math.min(video.videoWidth, 480);
                const targetHeight = Math.round((video.videoHeight * targetWidth) / video.videoWidth);

                if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
                  canvas.width = targetWidth;
                  canvas.height = targetHeight;
                }

                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                // Safe fallback resolver for jsQR
                let qrDecodeFunc: any = null;
                if (typeof window !== 'undefined' && typeof (window as any).jsQR === 'function') {
                  qrDecodeFunc = (window as any).jsQR;
                }
                if (!qrDecodeFunc && typeof jsQR === 'function') {
                  qrDecodeFunc = jsQR;
                }
                if (!qrDecodeFunc && jsQR && typeof (jsQR as any).default === 'function') {
                  qrDecodeFunc = (jsQR as any).default;
                }

                if (typeof qrDecodeFunc === 'function') {
                  const code = qrDecodeFunc(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                  });

                  if (code && code.data) {
                    console.log("Scanner: QR Code successfully decoded!", code.data);
                    
                    // Stop further scans
                    activeRef.current = false;
                    
                    // Stop tracks immediately
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
        setError("Camera access denied.");
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
    <Modal isOpen={isOpen} onClose={onClose} title="Specimen & Item Scanner">
      <div className="flex flex-col items-center space-y-6 py-4">
        {error ? (
          <div className="text-center p-8 bg-red-50 rounded-[32px] border border-red-100 flex flex-col items-center">
             <p className="text-red-600 font-black uppercase tracking-widest text-[10px] mb-4">{error}</p>
             <p className="text-xs text-gray-500 mb-6 font-medium max-w-[200px]">
               Please ensure you permit camera access for Verdant when prompted by the system.
             </p>
             <Button onClick={onClose}>{t('done')}</Button>
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
            {/* Standard off-screen positioning ensures excellent compatibility on iOS Safari/Chrome where display:none canvases are clipped */}
            <canvas 
              ref={canvasRef} 
              className="absolute pointer-events-none opacity-0 select-none left-[-9999px] top-[-9999px]" 
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
        
        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest text-center px-4 leading-relaxed">
          Scan a QR code on a plant label or inventory item to instantly view details on the page.
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
