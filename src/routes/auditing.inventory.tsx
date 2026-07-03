import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SectionCard } from "@/features/auditing/components/SectionCard";
import { DataTable, type Column } from "@/features/auditing/components/DataTable";
import { VarianceBadge } from "@/features/auditing/components/Badges";
import { ExportMenu } from "@/features/auditing/components/ExportMenu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BRANDS, CATEGORIES, PARTS, SUPPLIERS, WAREHOUSES, warehouseName } from "@/features/auditing/data/seed";
import type { Part, VarianceStatus } from "@/features/auditing/data/types";
import { useStore } from "@/features/auditing/data/store";

export const Route = createFileRoute("/auditing/inventory")({
  head: () => ({ meta: [{ title: "Inventory Verification — Spintify Auditing" }] }),
  component: InventoryPage,
});

interface Row {
  part: Part;
  physical: number;
  status: VarianceStatus;
}

function calcStatus(sys: number, phy: number, tol: number): VarianceStatus {
  if (phy === sys) return "Verified";
  if (phy === 0 && sys > 0) return "Missing";
  const pct = Math.abs(phy - sys) / Math.max(1, sys) * 100;
  if (pct <= tol) return "Verified";
  if (phy > sys) return "Extra Stock";
  return "Mismatch";
}

function InventoryPage() {
  const tolerance = useStore((s) => s.settings.tolerance);
  const [q, setQ] = useState("");
  const [warehouseId, setWarehouseId] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [brand, setBrand] = useState<string>("all");
  const [supplier, setSupplier] = useState<string>("all");
  const [physical, setPhysical] = useState<Record<string, number>>({});

  const rows: Row[] = useMemo(() => {
    return PARTS.filter((p) => {
      if (warehouseId !== "all" && p.warehouseId !== warehouseId) return false;
      if (category !== "all" && p.category !== category) return false;
      if (brand !== "all" && p.brand !== brand) return false;
      if (supplier !== "all" && p.supplier !== supplier) return false;
      if (q) {
        const s = q.toLowerCase();
        if (
          !p.partNumber.toLowerCase().includes(s) &&
          !p.name.toLowerCase().includes(s) &&
          !p.barcode.includes(s) &&
          !p.oemCode.toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    }).map((p) => {
      const phy = physical[p.id] ?? p.systemQty;
      return { part: p, physical: phy, status: calcStatus(p.systemQty, phy, tolerance) };
    });
  }, [q, warehouseId, category, brand, supplier, physical, tolerance]);

  const cols: Column<Row>[] = [
    { key: "pn", header: "Part Number", cell: (r) => <span className="font-mono text-xs">{r.part.partNumber}</span>, sortValue: (r) => r.part.partNumber },
    { key: "name", header: "Name", cell: (r) => <div className="min-w-0"><div className="truncate">{r.part.name}</div><div className="text-[11px] text-muted-foreground">{r.part.brand} · {r.part.category}</div></div> },
    { key: "wh", header: "Warehouse", cell: (r) => warehouseName(r.part.warehouseId) },
    { key: "loc", header: "Location", cell: (r) => `${r.part.location} / ${r.part.bin}` },
    { key: "sys", header: "System", cell: (r) => <span className="tabular-nums">{r.part.systemQty}</span>, sortValue: (r) => r.part.systemQty, className: "text-right" },
    {
      key: "phy",
      header: "Physical",
      cell: (r) => (
        <Input
          type="number"
          className="h-8 w-20 text-right tabular-nums"
          value={r.physical}
          onChange={(e) => setPhysical((p) => ({ ...p, [r.part.id]: Number(e.target.value) || 0 }))}
        />
      ),
      className: "text-right",
    },
    {
      key: "diff",
      header: "Diff",
      cell: (r) => {
        const d = r.physical - r.part.systemQty;
        return (
          <span className={`tabular-nums font-medium ${d === 0 ? "text-emerald-600" : d > 0 ? "text-amber-600" : "text-rose-600"}`}>
            {d > 0 ? `+${d}` : d}
          </span>
        );
      },
      sortValue: (r) => r.physical - r.part.systemQty,
      className: "text-right",
    },
    {
      key: "pct",
      header: "Diff %",
      cell: (r) => {
        const pct = ((r.physical - r.part.systemQty) / Math.max(1, r.part.systemQty)) * 100;
        return <span className="tabular-nums text-xs">{pct.toFixed(1)}%</span>;
      },
      className: "text-right",
    },
    { key: "st", header: "Status", cell: (r) => <VarianceBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-950">Inventory Verification</h1>
          <p className="text-sm text-muted-foreground">Reconcile physical stock against the system in real time.</p>
        </div>
        <ExportMenu
          filename="inventory-verification"
          rows={rows.map((r) => ({
            partNumber: r.part.partNumber,
            name: r.part.name,
            warehouse: warehouseName(r.part.warehouseId),
            system: r.part.systemQty,
            physical: r.physical,
            diff: r.physical - r.part.systemQty,
            status: r.status,
          }))}
        />
      </div>

      <SectionCard>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Input placeholder="Search part / barcode / OEM…" value={q} onChange={(e) => setQ(e.target.value)} className="lg:col-span-2" />
          <FilterSelect value={warehouseId} onChange={setWarehouseId} label="Warehouse" all="All warehouses" options={WAREHOUSES.map((w) => ({ v: w.id, l: w.name }))} />
          <FilterSelect value={category} onChange={setCategory} label="Category" all="All categories" options={CATEGORIES.map((c) => ({ v: c, l: c }))} />
          <FilterSelect value={brand} onChange={setBrand} label="Brand" all="All brands" options={BRANDS.map((b) => ({ v: b, l: b }))} />
          <FilterSelect value={supplier} onChange={setSupplier} label="Supplier" all="All suppliers" options={SUPPLIERS.map((s) => ({ v: s, l: s }))} />
        </div>
      </SectionCard>

      <DataTable
        rows={rows}
        columns={cols}
        rowKey={(r) => r.part.id}
        pageSize={12}
        highlightRow={(r) => r.status !== "Verified"}
      />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  all,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  all: string;
  options: { v: string; l: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{all}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
