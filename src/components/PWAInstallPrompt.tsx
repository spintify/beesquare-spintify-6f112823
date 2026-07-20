import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SPINTIFY_LOGO } from "@/lib/brand";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "spintify-pwa-install-dismissed-at";
const DISMISS_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (isStandalone) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_MS) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari has no beforeinstallprompt — show manual hint after a delay
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
    if (isIOS && isSafari) {
      const t = setTimeout(() => {
        setIosHint(true);
        setOpen(true);
      }, 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setOpen(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setDeferred(null);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-bottom-4 fade-in">
      <div className="rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-4 text-white">
        <div className="flex items-start gap-3">
          <img src={SPINTIFY_LOGO} alt="Spintify" className="h-11 w-11 rounded-lg object-contain bg-white/5 p-1" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold leading-tight">Install Spintify</p>
            <p className="text-xs text-white/70 mt-0.5">
              {iosHint
                ? "Tap the Share icon in Safari and choose “Add to Home Screen”."
                : "Get quick access with the app on your device."}
            </p>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="text-white/50 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {!iosHint && (
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={dismiss} className="text-white/70 hover:text-white hover:bg-white/10">
              Not now
            </Button>
            <Button
              size="sm"
              onClick={install}
              className="bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/30"
            >
              <Download className="h-4 w-4 mr-1.5" /> Download
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
