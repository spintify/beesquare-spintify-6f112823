import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Boxes,
  ScanSearch,
  Scale,
  FileBarChart,
  History,
  Settings,
  LogOut,
  LayoutGrid,
} from "lucide-react";
import { SPINTIFY_LOGO } from "@/lib/brand";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Tab = {
  to: "/audit" | "/audit/inventory" | "/audit/verification" | "/audit/reconciliation" | "/audit/reports" | "/audit/history" | "/audit/settings";
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const tabs: Tab[] = [
  { to: "/audit", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/audit/inventory", label: "Inventory Audit", icon: Boxes },
  { to: "/audit/verification", label: "Physical Verification", icon: ScanSearch },
  { to: "/audit/reconciliation", label: "Stock Reconciliation", icon: Scale },
  { to: "/audit/reports", label: "Reports", icon: FileBarChart },
  { to: "/audit/history", label: "Audit History", icon: History },
  { to: "/audit/settings", label: "Settings", icon: Settings },
];

export function AuditHeader() {
  const loc = useLocation();
  const navigate = useNavigate();
  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }
  return (
    <header className="border-b border-border bg-white/70 backdrop-blur-md sticky top-0 z-30">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <img src={SPINTIFY_LOGO} alt="Spintify" className="h-11 w-11 object-contain" />
          <div>
            <h1 className="text-base font-semibold leading-tight">Spintify Auditing</h1>
            <p className="text-xs text-muted-foreground">Inventory, verification & reconciliation</p>
          </div>
        </div>
        <nav className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg overflow-x-auto">
          {tabs.map((t) => {
            const active = t.exact ? loc.pathname === t.to : loc.pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/modules" })} title="Modules">
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
