import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { SectionCard } from "@/features/auditing/components/SectionCard";
import { DataTable, type Column } from "@/features/auditing/components/DataTable";
import { StatusBadge } from "@/features/auditing/components/Badges";
import { Button } from "@/components/ui/button";
import { ExportMenu } from "@/features/auditing/components/ExportMenu";
import { auditorName, dealerName, warehouseName } from "@/features/auditing/data/seed";
import { actions, useStore } from "@/features/auditing/data/store";
import type { Audit } from "@/features/auditing/data/types";
import { Copy, Download, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auditing/history")({
  head: () => ({ meta: [{ title: "Audit History — Spintify Auditing" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const audits = useStore((s) => s.audits);
  const history = [...audits].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const cols: Column<Audit>[] = [
    { key: "n", header: "Audit ID", cell: (r) => <span className="font-mono text-xs">{r.auditNumber}</span>, sortValue: (r) => r.auditNumber },
    { key: "c", header: "Created", cell: (r) => format(new Date(r.createdAt), "d MMM yyyy"), sortValue: (r) => r.createdAt },
    { key: "cmp", header: "Completed", cell: (r) => (r.completedAt ? format(new Date(r.completedAt), "d MMM yyyy") : "—") },
    { key: "au", header: "Auditor", cell: (r) => auditorName(r.assigneeId) },
    { key: "wh", header: "Warehouse", cell: (r) => warehouseName(r.warehouseId) },
    { key: "dl", header: "Dealer", cell: (r) => dealerName(r.dealerId) },
    { key: "st", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: "act",
      header: "",
      cell: (r) => (
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => toast.info(`Viewing ${r.auditNumber}`)}><Eye className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => toast.success("Report downloaded")}><Download className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => { const dup = { ...r, id: `a-${Date.now()}`, auditNumber: `${r.auditNumber}-COPY`, status: "Draft" as const, createdAt: new Date().toISOString(), completedAt: undefined }; actions.addAudit(dup); toast.success("Audit duplicated"); }}><Copy className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-950">Audit History</h1>
          <p className="text-sm text-muted-foreground">Complete history with drill-down, download and duplication.</p>
        </div>
        <ExportMenu
          filename="audit-history"
          rows={history.map((a) => ({
            id: a.auditNumber,
            created: a.createdAt,
            completed: a.completedAt ?? "",
            auditor: auditorName(a.assigneeId),
            warehouse: warehouseName(a.warehouseId),
            dealer: dealerName(a.dealerId),
            status: a.status,
          }))}
        />
      </div>

      <SectionCard>
        <DataTable rows={history} columns={cols} rowKey={(r) => r.id} pageSize={15} />
      </SectionCard>
    </div>
  );
}
