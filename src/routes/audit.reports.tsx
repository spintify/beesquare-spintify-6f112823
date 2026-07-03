import { createFileRoute } from "@tanstack/react-router";
import { AuditPlaceholder } from "@/components/AuditPlaceholder";
import { FileBarChart } from "lucide-react";

export const Route = createFileRoute("/audit/reports")({
  component: () => (
    <AuditPlaceholder
      title="Audit Reports"
      description="Generate and export detailed audit reports for management review, compliance, and statutory filings."
      icon={<FileBarChart className="h-4 w-4" />}
      bullets={["Executive summary", "Category-wise variance", "PDF & Excel exports", "Scheduled deliveries"]}
    />
  ),
});
