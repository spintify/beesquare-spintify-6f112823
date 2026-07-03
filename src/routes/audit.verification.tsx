import { createFileRoute } from "@tanstack/react-router";
import { AuditPlaceholder } from "@/components/AuditPlaceholder";
import { ScanSearch } from "lucide-react";

export const Route = createFileRoute("/audit/verification")({
  component: () => (
    <AuditPlaceholder
      title="Physical Verification"
      description="Perform on-ground physical stock verification with barcode/QR scanning and mobile-friendly workflows."
      icon={<ScanSearch className="h-4 w-4" />}
      bullets={["Barcode & QR scanning", "Team assignments", "Photo evidence capture", "Sign-off & approvals"]}
    />
  ),
});
