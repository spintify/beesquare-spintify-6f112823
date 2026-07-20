import { Outlet, Link, createRootRoute, HeadContent, Scripts, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "@/components/AppHeader";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/modules"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Spintify — Billing & Auditing" },
      { name: "description", content: "Spintify: complete billing & auditing for OEM parts dealers" },
      { property: "og:title", content: "Spintify — Billing & Auditing" },
      { name: "twitter:title", content: "Spintify — Billing & Auditing" },
      { property: "og:description", content: "Spintify: complete billing & auditing for OEM parts dealers" },
      { name: "twitter:description", content: "Spintify: complete billing & auditing for OEM parts dealers" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b042fc85-9889-4db1-92c7-f0d2266a2d48/id-preview-122bdd45--1b0b000a-df53-44bd-8db9-faebe5963b24.lovable.app-1783064742957.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b042fc85-9889-4db1-92c7-f0d2266a2d48/id-preview-122bdd45--1b0b000a-df53-44bd-8db9-faebe5963b24.lovable.app-1783064742957.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { name: "theme-color", content: "#0b1220" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Spintify" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "https://res.cloudinary.com/zyywstin/image/upload/v1783064461/WhatsApp_Image_2026-07-03_at_13.04.20-removebg-preview_uwxxny.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Routes that belong to the billing module (get the billing AppHeader).
const BILLING_PATHS = new Set([
  "/",
  "/estimate",
  "/products",
  "/buyers",
  "/bills",
  "/sales-report",
  "/purchase-report",
]);

function isBillingPath(pathname: string) {
  return BILLING_PATHS.has(pathname);
}

function RootComponent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
    });
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authed === false && location.pathname !== "/login") {
      navigate({ to: "/login" });
    }
  }, [authed, location.pathname, navigate]);

  const isLogin = location.pathname === "/login";

  if (authed === null && !isLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (isLogin) {
    return (
      <div className="min-h-screen">
        <Outlet />
        <Toaster richColors position="top-right" />
        <PWAInstallPrompt />
      </div>
    );
  }

  if (!authed) return null;

  // Billing routes keep the existing header + centered layout.
  if (isBillingPath(location.pathname)) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-7xl px-6 py-8">
          <Outlet />
        </main>
        <Toaster richColors position="top-right" />
        <PWAInstallPrompt />
      </div>
    );
  }

  // /modules and /audit/* provide their own chrome.
  return (
    <div className="min-h-screen">
      <Outlet />
      <Toaster richColors position="top-right" />
      <PWAInstallPrompt />
    </div>
  );
}
