import { createFileRoute } from "@tanstack/react-router";
import { AuditPlaceholder } from "@/components/AuditPlaceholder";
import { Scale } from "lucide-react";

export const Route = createFileRoute("/audit/reconciliation")({
  component: () => (
    <AuditPlaceholder
      title="Stock Reconciliation"
      description="Reconcile system stock with physical counts, resolve variances, and post adjustments with a full audit trail."
      icon={<Scale className="h-4 w-4" />}
      bullets={["Variance detection", "Reason-code tagging", "Adjustment postings", "Audit trail & approvals"]}
    />
  ),
});
