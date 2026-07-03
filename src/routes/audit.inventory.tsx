import { createFileRoute } from "@tanstack/react-router";
import { AuditPlaceholder } from "@/components/AuditPlaceholder";
import { Boxes } from "lucide-react";

export const Route = createFileRoute("/audit/inventory")({
  component: () => (
    <AuditPlaceholder
      title="Inventory Audit"
      description="Run detailed inventory audits across warehouses, categories, and SKUs with structured checklists."
      icon={<Boxes className="h-4 w-4" />}
      bullets={["SKU-level audit sheets", "Category-wise sampling", "Bin/location tracking", "Discrepancy tagging"]}
    />
  ),
});
