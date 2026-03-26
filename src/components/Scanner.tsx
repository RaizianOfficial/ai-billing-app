"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { Camera, X, CheckCircle, Loader2 } from "lucide-react";

interface ScannerProps {
  onScan: (barcode: string) => Promise<boolean>;
  onClose: () => void;
}

export default function Scanner({ onScan, onClose }: ScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const onScanRef = useRef(onScan);
  const lastBarcodeRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const [status, setStatus] = useState<"idle" | "scanning" | "found" | "notfound">("idle");

  // Keep callback refs fresh without triggering re-render/re-init
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const handleDecode = useCallback(async (decodedText: string) => {
    const now = Date.now();
    // Dedupe: same barcode within 2s OR any scan within 300ms
    if (
      (decodedText === lastBarcodeRef.current && now - lastScanTimeRef.current < 2000) ||
      now - lastScanTimeRef.current < 300
    ) return;

    lastBarcodeRef.current = decodedText;
    lastScanTimeRef.current = now;

    setStatus("scanning");
    const success = await onScanRef.current(decodedText);
    setStatus(success ? "found" : "notfound");

    // Auto-close after brief success flash
    setTimeout(() => onCloseRef.current(), 600);
  }, []);

  useEffect(() => {
    const element = document.getElementById("reader");
    if (!element || scannerRef.current) return;

    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.333,
        rememberLastUsedCamera: true,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      },
      false
    );

    scanner.render(handleDecode, () => {});
    scannerRef.current = scanner;

    return () => {
      scannerRef.current?.clear().catch(() => {});
      scannerRef.current = null;
    };
  }, [handleDecode]);

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-black">
      {/* Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-6 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20">
            <Camera className="text-white" size={24} />
          </div>
          <div>
            <h2 className="font-black text-white tracking-widest text-sm uppercase">POS SCANNER</h2>
            <p className="text-[10px] font-bold text-white/50 tracking-tighter">HD BARCODE ENGINE v2.0</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full bg-white/10 backdrop-blur-md p-3 text-white border border-white/20 hover:bg-white/20 transition-all active:scale-90"
        >
          <X size={24} />
        </button>
      </div>

      {/* Main Scanner Viewport */}
      <div className="relative flex-1 overflow-hidden flex items-center justify-center">
        <div id="reader" className="absolute inset-0 w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />

        {/* Cinematic Scan Frame */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8">
           {/* Dark Scrim around the frame - box shadow is perfect for this */}
           <div className="relative w-full max-w-sm aspect-[4/3] sm:aspect-[16/9] rounded-[40px] border-2 border-white/30 shadow-[0_0_0_4000px_rgba(0,0,0,0.7)] overflow-hidden">
              {/* Animated Target Corners */}
              <div className="absolute top-8 left-8 w-12 h-12 border-t-8 border-l-8 border-white rounded-tl-2xl" />
              <div className="absolute top-8 right-8 w-12 h-12 border-t-8 border-r-8 border-white rounded-tr-2xl" />
              <div className="absolute bottom-8 left-8 w-12 h-12 border-b-8 border-l-8 border-white rounded-bl-2xl" />
              <div className="absolute bottom-8 right-8 w-12 h-12 border-b-8 border-r-8 border-white rounded-br-2xl" />

              {/* Laser Scan Line */}
              {status === "idle" && (
                 <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent shadow-[0_0_20px_2px_rgba(74,222,128,0.8)] scanner-line" />
              )}

              {/* Active State Overlays */}
              {status === "scanning" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
                  <Loader2 size={64} className="animate-spin text-white mb-4" />
                  <span className="font-black text-white tracking-[0.2em] text-xs">PROCESSING...</span>
                </div>
              )}

              {status === "found" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500/30 backdrop-blur-md animate-in zoom-in">
                  <CheckCircle size={80} className="text-green-400 drop-shadow-2xl" />
                  <span className="font-black text-white tracking-[0.2em] text-xs mt-4">RECOGNIZED</span>
                </div>
              )}

              {status === "notfound" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-blue-500/30 backdrop-blur-md animate-in zoom-in">
                  <Loader2 size={80} className="text-blue-400 animate-spin" />
                  <span className="font-black text-white tracking-[0.2em] text-xs mt-4 text-center px-4 leading-relaxed">UNKNOWN PRODUCT<br/>INITIALIZING ADDER...</span>
                </div>
              )}
           </div>

           <div className="mt-12 text-center pointer-events-none">
              <p className="text-white font-black text-lg tracking-tight drop-shadow-lg">ALIGN BARCODE IN CENTER</p>
              <p className="text-white/40 font-bold text-[10px] tracking-[0.3em] mt-2 uppercase">Automatic detection active</p>
           </div>
        </div>
      </div>

      {/* Footer Hints */}
      <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center bg-gradient-to-t from-black/80 to-transparent">
         <div className="bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-white/60 font-medium text-xs">Awaiting input stream</span>
         </div>
      </div>
    </div>
  );
}
