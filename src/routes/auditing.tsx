import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AuditingSidebar } from "@/features/auditing/components/AuditingSidebar";
import { AuditingTopBar } from "@/features/auditing/components/AuditingTopBar";

export const Route = createFileRoute("/auditing")({
  head: () => ({
    meta: [
      { title: "Spintify — Auditing" },
      { name: "description", content: "Enterprise auditing suite for OEM parts dealers." },
    ],
  }),
  component: AuditingLayout,
});

function AuditingLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-sky-50/60 via-white to-blue-50/60">
        <AuditingSidebar />
        <SidebarInset className="min-w-0 bg-transparent">
          <AuditingTopBar />
          <main className="min-w-0 flex-1 p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
