import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/features/auditing/components/SectionCard";
import { Button } from "@/components/ui/button";
import {
  Boxes,
  AlertTriangle,
  Percent,
  Warehouse as WarehouseIcon,
  UserCheck,
  Layers,
  Building2,
  Factory,
  PackageMinus,
  PackageX,
  PackagePlus,
  Download,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auditing/reports")({
  head: () => ({ meta: [{ title: "Reports — Spintify Auditing" }] }),
  component: ReportsPage,
});

const REPORTS = [
  { name: "Inventory Report", desc: "Full snapshot of stock across warehouses.", icon: Boxes },
  { name: "Variance Report", desc: "All variances by audit and category.", icon: AlertTriangle },
  { name: "Stock Accuracy Report", desc: "Monthly stock accuracy trend.", icon: Percent },
  { name: "Warehouse Report", desc: "Per-warehouse performance.", icon: WarehouseIcon },
  { name: "Auditor Performance", desc: "Audits per auditor, accuracy and SLA.", icon: UserCheck },
  { name: "Category Report", desc: "Category-wise mismatch analysis.", icon: Layers },
  { name: "Dealer Report", desc: "Dealer-wise reconciliation summary.", icon: Building2 },
  { name: "OEM Report", desc: "Cross-check of OEM vs dealer records.", icon: Factory },
  { name: "Missing Parts", desc: "Parts flagged as missing during audits.", icon: PackageMinus },
  { name: "Damaged Parts", desc: "Parts marked damaged with financial impact.", icon: PackageX },
  { name: "Excess Inventory", desc: "SKUs with extra physical stock.", icon: PackagePlus },
];

function ReportsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-blue-950">Reports</h1>
        <p className="text-sm text-muted-foreground">Generate audit reports in PDF, Excel, CSV, or print directly.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((r) => (
          <SectionCard key={r.name} title={r.name}>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-100 to-blue-200 text-blue-800">
                <r.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{r.desc}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["PDF", "Excel", "CSV", "Print"] as const).map((f) => (
                    <Button key={f} size="sm" variant="outline" onClick={() => toast.success(`${r.name} → ${f}`)}>
                      <Download className="mr-1.5 h-3.5 w-3.5" /> {f}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
