import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Receipt, Package, FileText, Users, TrendingUp, ShoppingCart, LogOut, FileSpreadsheet, LayoutGrid } from "lucide-react";
import { SPINTIFY_LOGO } from "@/lib/brand";
import { COMPANY } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const tabs = [
  { to: "/", label: "Create Bill", icon: Receipt },
  { to: "/estimate", label: "Estimate", icon: FileSpreadsheet },
  { to: "/products", label: "Products", icon: Package },
  { to: "/buyers", label: "Buyers", icon: Users },
  { to: "/bills", label: "Saved Bills", icon: FileText },
  { to: "/sales-report", label: "Sales", icon: TrendingUp },
  { to: "/purchase-report", label: "Purchase", icon: ShoppingCart },
] as const;

export function AppHeader() {
  const loc = useLocation();
  const navigate = useNavigate();
  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }
  return (
    <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-30">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <img src={SPINTIFY_LOGO} alt="Spintify" className="h-11 w-11 object-contain" />
          <div>
            <h1 className="text-base font-semibold leading-tight">Spintify Billing</h1>
            <p className="text-xs text-muted-foreground">{COMPANY.name} • GSTIN {COMPANY.gst}</p>
          </div>
        </div>
        <nav className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg">
          {tabs.map((t) => {
            const active = loc.pathname === t.to;
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
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
          <Button variant="ghost" size="sm" onClick={handleSignOut} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
