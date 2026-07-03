import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { AuditHeader } from "@/components/AuditHeader";

export const Route = createFileRoute("/audit")({
  component: AuditLayout,
});

function AuditLayout() {
  const loc = useLocation();
  const isLanding = loc.pathname === "/audit" || loc.pathname === "/audit/";
  if (isLanding) {
    return <Outlet />;
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      <AuditHeader />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
