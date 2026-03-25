"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { Camera, X, CheckCircle } from "lucide-react";

interface ScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function Scanner({ onScan, onClose }: ScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastScanRef = useRef<number>(0);
  const lastBarcodeRef = useRef<string | null>(null);

  useEffect(() => {
    // Correct lifecycle management: check if scanner element exists before initializing
    const scannerId = "reader";
    const element = document.getElementById(scannerId);
    if (!element) return;

    if (!scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        scannerId,
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.0,
          rememberLastUsedCamera: true,
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          const now = Date.now();
          // Throttle: don't scan same barcode too fast (within 2 seconds)
          if (
            decodedText === lastBarcodeRef.current &&
            now - lastScanRef.current < 2000
          ) {
            return;
          }

          // Throttle: don't scan ANY barcode too fast (within 500ms)
          if (now - lastScanRef.current < 500) {
            return;
          }

          lastScanRef.current = now;
          lastBarcodeRef.current = decodedText;
          onScan(decodedText);
        },
        (error) => {
          // Normal error during scanning - ignore to keep running
          // Only show serious errors
          // console.warn(error);
        }
      );

      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .clear()
          .catch((err) => console.error("Failed to clear scanner", err));
        scannerRef.current = null;
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div className="flex items-center gap-2">
            <Camera className="text-blue-600" size={20} />
            <h2 className="font-semibold text-slate-800">Scan Barcode</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 p-2 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div id="reader" className="w-full overflow-hidden rounded-lg bg-slate-100 aspect-video"></div>
          {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}
          <p className="mt-4 text-center text-xs text-slate-500">
            Align barcode within the frame to scan automatically
          </p>
        </div>
      </div>
    </div>
  );
}
