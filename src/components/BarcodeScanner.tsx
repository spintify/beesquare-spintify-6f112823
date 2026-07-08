import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, ScanLine, Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
};

export function BarcodeScanner({ open, onClose, onDetected }: Props) {
  const elId = "barcode-scanner-region";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setStarting(true);

    (async () => {
      try {
        const scanner = new Html5Qrcode(elId, { verbose: false });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 280, height: 160 } },
          (decodedText) => {
            if (cancelled) return;
            onDetected(decodedText.trim());
          },
          () => {},
        );
        if (cancelled) {
          await scanner.stop().catch(() => {});
          await scanner.clear().catch(() => {});
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Camera unavailable");
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        s.stop().catch(() => {}).finally(() => {
          s.clear().catch(() => {});
        });
      }
    };
  }, [open, onDetected]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a1330] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 text-white">
            <ScanLine className="h-4 w-4 text-sky-300" />
            <span className="text-sm font-semibold">Scan Barcode</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-sky-100/70 hover:bg-white/10 hover:text-white"
            aria-label="Close scanner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative bg-black">
          <div id={elId} className="w-full min-h-[300px]" />
          {starting && (
            <div className="absolute inset-0 flex items-center justify-center text-sky-100/80 text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Starting camera…
            </div>
          )}
        </div>
        {error ? (
          <p className="px-4 py-3 text-xs text-rose-300 border-t border-white/10">
            {error}. Allow camera permission and try again.
          </p>
        ) : (
          <p className="px-4 py-3 text-[11px] text-sky-100/60 border-t border-white/10">
            Point the camera at the product barcode. It will match part number or name automatically.
          </p>
        )}
      </div>
    </div>
  );
}
