import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, LogOut, Search, LayoutGrid } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { actions, currentUser, useStore } from "@/features/auditing/data/store";
import { WAREHOUSES } from "@/features/auditing/data/seed";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  audits: "Audit Management",
  inventory: "Inventory Verification",
  verification: "Physical Stock Entry",
  reconciliation: "Stock Reconciliation",
  oem: "OEM Verification",
  barcode: "Barcode Scanner",
  reports: "Reports",
  analytics: "Analytics",
  history: "Audit History",
  users: "Users",
  settings: "Settings",
};

export function AuditingTopBar() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const notifications = useStore((s) => s.notifications);
  const settings = useStore((s) => s.settings);
  const unread = notifications.filter((n) => !n.read).length;
  const seg = pathname.split("/").filter(Boolean)[1] ?? "dashboard";
  const user = currentUser();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-blue-100/70 bg-white/80 px-4 backdrop-blur">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <nav className="hidden items-center gap-1.5 text-sm md:flex">
        <Link to="/modules" className="text-muted-foreground hover:text-blue-700">
          Modules
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-blue-950 font-medium">Auditing</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-blue-950 font-medium">{LABELS[seg] ?? "Dashboard"}</span>
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search parts, audits, dealers…" className="h-9 w-64 pl-8" />
        </div>
        <Select value={settings.defaultWarehouseId} onValueChange={(v) => actions.setSetting("defaultWarehouseId", v)}>
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WAREHOUSES.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-medium">Notifications</span>
              <button className="text-xs text-blue-600 hover:underline" onClick={actions.markAllRead}>
                Mark all read
              </button>
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id} className={`border-b px-3 py-2.5 text-sm ${n.read ? "opacity-70" : ""}`}>
                  <div className="font-medium text-blue-950">{n.title}</div>
                  <div className="text-xs text-muted-foreground">{n.body}</div>
                </li>
              ))}
              {notifications.length === 0 && <li className="px-3 py-6 text-center text-xs text-muted-foreground">No notifications</li>}
            </ul>
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-blue-700 text-xs font-semibold text-white">
                {user.name
                  .split(" ")
                  .map((s) => s[0])
                  .join("")}
              </span>
              <span className="hidden text-sm md:inline">{user.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-medium">{user.name}</div>
              <div className="text-xs text-muted-foreground">{user.role}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/modules">
                <LayoutGrid className="mr-2 h-4 w-4" /> Modules
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/auditing/settings">
                <Bell className="mr-2 h-4 w-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
