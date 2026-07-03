import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  ClipboardList,
  PackageSearch,
  ClipboardEdit,
  Scale,
  GitCompareArrows,
  ScanLine,
  FileBarChart2,
  BarChart3,
  History,
  Users,
  Settings2,
} from "lucide-react";
import { SPINTIFY_LOGO } from "@/lib/brand";

const NAV = [
  { to: "/auditing/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/auditing/audits", label: "Audit Management", icon: ClipboardList },
  { to: "/auditing/inventory", label: "Inventory Verification", icon: PackageSearch },
  { to: "/auditing/verification", label: "Physical Stock Entry", icon: ClipboardEdit },
  { to: "/auditing/reconciliation", label: "Stock Reconciliation", icon: Scale },
  { to: "/auditing/oem", label: "OEM Verification", icon: GitCompareArrows },
  { to: "/auditing/barcode", label: "Barcode Scanner", icon: ScanLine },
  { to: "/auditing/reports", label: "Reports", icon: FileBarChart2 },
  { to: "/auditing/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/auditing/history", label: "Audit History", icon: History },
  { to: "/auditing/users", label: "Users", icon: Users },
  { to: "/auditing/settings", label: "Settings", icon: Settings2 },
] as const;

export function AuditingSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon" className="border-r border-blue-100/70">
      <SidebarHeader className="border-b border-blue-100/70">
        <Link to="/modules" className="flex items-center gap-2 px-2 py-1.5">
          <img src={SPINTIFY_LOGO} alt="Spintify" className="h-8 w-8 shrink-0 object-contain" />
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-bold text-blue-950">Spintify</div>
              <div className="truncate text-[11px] text-muted-foreground">Auditing Suite</div>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const active = pathname === item.to || (item.to !== "/auditing/dashboard" && pathname.startsWith(item.to));
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link to={item.to} className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-blue-100/70">
        {!collapsed && (
          <div className="px-2 py-2 text-[11px] text-muted-foreground">
            v1.0 · Enterprise Auditing
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
