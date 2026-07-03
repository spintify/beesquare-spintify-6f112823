import { createFileRoute } from "@tanstack/react-router";
import { AuditPlaceholder } from "@/components/AuditPlaceholder";
import { History } from "lucide-react";

export const Route = createFileRoute("/audit/history")({
  component: () => (
    <AuditPlaceholder
      title="Audit History"
      description="Browse the full history of past audits, verifications, and reconciliations with searchable timelines."
      icon={<History className="h-4 w-4" />}
      bullets={["Timeline view", "Filter by user, date, warehouse", "Version diff of counts", "Immutable log"]}
    />
  ),
});
