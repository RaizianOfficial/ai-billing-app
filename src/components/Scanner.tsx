"use client";

import { useEffect, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X } from "lucide-react";

interface ScannerProps {
  onScan: (barcode: string) => Promise<boolean>;
  onClose: () => void;
}

export default function Scanner({ onScan, onClose }: ScannerProps) {
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const lastBarcodeRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const isStartingRef = useRef(false);

  const handleDecode = useCallback(async (decodedText: string) => {
    const now = Date.now();

    // prevent spam scans
    if (
      decodedText === lastBarcodeRef.current &&
      now - lastScanTimeRef.current < 2000
    ) return;

    lastBarcodeRef.current = decodedText;
    lastScanTimeRef.current = now;

    const success = await onScan(decodedText);
    if (success) onClose();
  }, [onScan, onClose]);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");
    html5QrCodeRef.current = html5QrCode;

    const startScanner = async () => {
      if (isStartingRef.current) return;
      isStartingRef.current = true;

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,

            // 🔥 dynamic scan box (centered properly)
            qrbox: (vw: number, vh: number) => ({
              width: Math.min(vw * 0.7, 300),
              height: Math.min(vh * 0.25, 180),
            }),
          },
          handleDecode,
          () => { }
        );
      } catch (err) {
        console.error("Scanner start error:", err);
      } finally {
        isStartingRef.current = false;
      }
    };

    startScanner();

    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
          html5QrCode.clear();
        }).catch(console.error);
      }
    };
  }, [handleDecode]);

  return (
    <div className="fixed inset-0 z-[999] bg-black">

      {/* CAMERA */}
      <div id="reader" className="absolute inset-0 w-full h-full" />

      {/* CLOSE BUTTON */}
      <div className="absolute top-5 right-5 z-50">
        <button
          onClick={onClose}
          className="rounded-full bg-black/50 p-3 text-white backdrop-blur-md border border-white/20 active:scale-90"
        >
          <X size={26} />
        </button>
      </div>

      {/* SCAN FRAME */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6">

        <div className="relative w-full max-w-[300px] aspect-[4/3] rounded-3xl border-2 border-white/60 overflow-hidden">

          {/* scan line */}
          <div className="absolute left-0 right-0 h-[2px] bg-white/70 animate-scan" />

        </div>

        <p className="mt-8 text-white text-lg font-semibold">
          Align barcode inside frame
        </p>
      </div>
    </div>
  );
}