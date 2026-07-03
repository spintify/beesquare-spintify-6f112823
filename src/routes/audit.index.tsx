import { createFileRoute } from "@tanstack/react-router";
import { AuditPlaceholder } from "@/components/AuditPlaceholder";
import { LayoutDashboard } from "lucide-react";

export const Route = createFileRoute("/audit/")({
  component: () => (
    <AuditPlaceholder
      title="Auditing Dashboard"
      description="A unified overview of inventory health, pending verifications, reconciliation gaps, and audit activity across your organization."
      icon={<LayoutDashboard className="h-4 w-4" />}
      bullets={[
        "Key audit KPIs & health score",
        "Recent reconciliation deltas",
        "Pending physical verifications",
        "Team activity feed",
      ]}
    />
  ),
});
