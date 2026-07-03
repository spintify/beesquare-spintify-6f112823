import { createFileRoute } from "@tanstack/react-router";
import { AuditPlaceholder } from "@/components/AuditPlaceholder";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/audit/settings")({
  component: () => (
    <AuditPlaceholder
      title="Audit Settings"
      description="Configure audit policies, sampling rules, approval workflows, and access control for the auditing module."
      icon={<Settings className="h-4 w-4" />}
      bullets={["Sampling & thresholds", "Approval workflows", "Role-based access", "Notifications"]}
    />
  ),
});
