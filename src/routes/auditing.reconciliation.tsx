import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SectionCard } from "@/features/auditing/components/SectionCard";
import { DataTable, type Column } from "@/features/auditing/components/DataTable";
import { VarianceBadge } from "@/features/auditing/components/Badges";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PARTS, partById, warehouseName } from "@/features/auditing/data/seed";
import { useStore, actions } from "@/features/auditing/data/store";
import type { VarianceStatus } from "@/features/auditing/data/types";
import { toast } from "sonner";
import { Check, X, RotateCcw, CheckCheck, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auditing/reconciliation")({
  head: () => ({ meta: [{ title: "Stock Reconciliation — Spintify Auditing" }] }),
  component: ReconciliationPage,
});

interface Row {
  auditId: string;
  auditNumber: string;
  partId: string;
  systemQty: number;
  physicalQty: number;
  status: VarianceStatus;
  price: number;
}

function ReconciliationPage() {
  const audits = useStore((s) => s.audits);
  const [filter, setFilter] = useState<string>("all");
  const [resolved, setResolved] = useState<Record<string, string>>({});

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const a of audits) {
      for (const i of a.items) {
        if (i.status === "Verified") continue;
        const p = partById(i.partId);
        if (!p) continue;
        out.push({
          auditId: a.id,
          auditNumber: a.auditNumber,
          partId: i.partId,
          systemQty: i.systemQty,
          physicalQty: i.physicalQty ?? 0,
          status: i.status,
          price: p.price,
        });
      }
    }
    return out.filter((r) => filter === "all" || r.status === filter);
  }, [audits, filter]);

  function act(key: string, action: string) {
    setResolved((r) => ({ ...r, [key]: action }));
    toast.success(`Marked as ${action}`);
  }

  const cols: Column<Row>[] = [
    { key: "au", header: "Audit", cell: (r) => <span className="font-mono text-xs">{r.auditNumber}</span>, sortValue: (r) => r.auditNumber },
    { key: "pn", header: "Part", cell: (r) => <span className="font-mono text-xs">{partById(r.partId)?.partNumber}</span> },
    { key: "wh", header: "Warehouse", cell: (r) => warehouseName(partById(r.partId)?.warehouseId ?? "") },
    { key: "sys", header: "System", cell: (r) => <span className="tabular-nums">{r.systemQty}</span>, className: "text-right" },
    { key: "phy", header: "Physical", cell: (r) => <span className="tabular-nums">{r.physicalQty}</span>, className: "text-right" },
    {
      key: "diff",
      header: "Diff",
      cell: (r) => {
        const d = r.physicalQty - r.systemQty;
        return <span className={`tabular-nums font-medium ${d > 0 ? "text-amber-600" : "text-rose-600"}`}>{d > 0 ? `+${d}` : d}</span>;
      },
      className: "text-right",
      sortValue: (r) => r.physicalQty - r.systemQty,
    },
    {
      key: "val",
      header: "Value",
      cell: (r) => <span className="tabular-nums">₹{((r.physicalQty - r.systemQty) * r.price).toLocaleString("en-IN")}</span>,
      className: "text-right",
    },
    { key: "st", header: "Status", cell: (r) => <VarianceBadge status={r.status} /> },
    {
      key: "reason",
      header: "Suggested",
      cell: (r) =>
        r.status === "Missing" ? "Recount & write-off"
        : r.status === "Extra Stock" ? "Bin re-check"
        : r.status === "Damaged" ? "Insurance claim"
        : "Ledger correction",
    },
    {
      key: "act",
      header: "Actions",
      cell: (r) => {
        const key = `${r.auditId}:${r.partId}`;
        const done = resolved[key];
        if (done) return <span className="text-xs text-emerald-600">{done}</span>;
        return (
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="outline" onClick={() => act(key, "Accepted")}><Check className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="outline" onClick={() => act(key, "Rejected")}><X className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="outline" onClick={() => act(key, "Recount")}><RotateCcw className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="outline" onClick={() => { act(key, "Approved"); actions.updateItem(r.auditId, r.partId, { status: "Verified" }); }}><ShieldCheck className="h-3.5 w-3.5" /></Button>
            <Button size="sm" onClick={() => act(key, "Resolved")}><CheckCheck className="h-3.5 w-3.5" /></Button>
          </div>
        );
      },
    },
  ];

  const total = rows.reduce((s, r) => s + Math.abs((r.physicalQty - r.systemQty) * r.price), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-950">Stock Reconciliation</h1>
          <p className="text-sm text-muted-foreground">Review variances and post ledger corrections.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">Financial impact <span className="font-semibold text-blue-950">₹{total.toLocaleString("en-IN")}</span></div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All variances</SelectItem>
              <SelectItem value="Missing">Missing</SelectItem>
              <SelectItem value="Extra Stock">Extra Stock</SelectItem>
              <SelectItem value="Damaged">Damaged</SelectItem>
              <SelectItem value="Mismatch">Mismatch</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <SectionCard>
        <DataTable rows={rows} columns={cols} rowKey={(r) => `${r.auditId}:${r.partId}`} pageSize={12} />
      </SectionCard>
    </div>
  );
}
