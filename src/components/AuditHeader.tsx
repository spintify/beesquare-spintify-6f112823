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
  return null;
}
