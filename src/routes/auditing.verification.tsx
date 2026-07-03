import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { SectionCard } from "@/features/auditing/components/SectionCard";
import { VarianceBadge } from "@/features/auditing/components/Badges";
import { ExportMenu } from "@/features/auditing/components/ExportMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { VarianceStatus } from "@/features/auditing/data/types";
import { PARTS } from "@/features/auditing/data/seed";

export const Route = createFileRoute("/auditing/verification")({
  head: () => ({ meta: [{ title: "Physical Stock Entry — Spintify Auditing" }] }),
  component: VerificationPage,
});

interface Entry {
  id: string;
  partNumber: string;
  name: string;
  barcode: string;
  oemCode: string;
  location: string;
  bin: string;
  systemStock: number;
  physicalStock: number;
  remarks: string;
}

const LS_KEY = "spintify:physical-entry:draft";

function calcStatus(sys: number, phy: number): VarianceStatus {
  if (phy === sys) return "Verified";
  if (phy === 0 && sys > 0) return "Missing";
  return phy > sys ? "Extra Stock" : "Mismatch";
}

function VerificationPage() {
  const [rows, setRows] = useState<Entry[]>(() => {
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(LS_KEY);
      if (raw) try { return JSON.parse(raw); } catch { /* ignore */ }
    }
    return Array.from({ length: 5 }).map((_, i) => blank(i));
  });
  const savedRef = useRef<number | null>(null);

  useEffect(() => {
    if (savedRef.current) window.clearTimeout(savedRef.current);
    savedRef.current = window.setTimeout(() => {
      window.localStorage.setItem(LS_KEY, JSON.stringify(rows));
    }, 400);
  }, [rows]);

  function blank(i: number): Entry {
    return {
      id: `e-${Date.now()}-${i}`,
      partNumber: "",
      name: "",
      barcode: "",
      oemCode: "",
      location: "",
      bin: "",
      systemStock: 0,
      physicalStock: 0,
      remarks: "",
    };
  }

  function autofill(idx: number, partNumber: string) {
    const p = PARTS.find((pp) => pp.partNumber.toLowerCase() === partNumber.toLowerCase());
    if (!p) return;
    setRows((rs) =>
      rs.map((r, i) =>
        i === idx
          ? { ...r, partNumber: p.partNumber, name: p.name, barcode: p.barcode, oemCode: p.oemCode, location: p.location, bin: p.bin, systemStock: p.systemQty }
          : r,
      ),
    );
  }

  function update(idx: number, patch: Partial<Entry>) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, blank(rs.length)]);
  }
  function removeRow(idx: number) {
    setRows((rs) => rs.filter((_, i) => i !== idx));
  }

  const summary = useMemo(() => {
    const filled = rows.filter((r) => r.partNumber);
    const variance = filled.filter((r) => calcStatus(r.systemStock, r.physicalStock) !== "Verified").length;
    return { filled: filled.length, variance };
  }, [rows]);

  function onKey(e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, isLast: boolean) {
    if (e.key === "Enter" && isLast && rowIdx === rows.length - 1) addRow();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-950">Physical Stock Entry</h1>
          <p className="text-sm text-muted-foreground">Bulk-enter physical counts. Drafts auto-save locally.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{summary.filled} rows · {summary.variance} variance</span>
          <ExportMenu filename="physical-stock-entry" rows={rows.map((r) => ({ ...r, status: calcStatus(r.systemStock, r.physicalStock) }))} />
          <Button size="sm" variant="outline" onClick={addRow}><Plus className="mr-1.5 h-4 w-4" /> Add row</Button>
          <Button size="sm" onClick={() => toast.success("Draft saved locally")}>
            <Save className="mr-1.5 h-4 w-4" /> Save draft
          </Button>
        </div>
      </div>

      <SectionCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-blue-50/60 text-left text-xs uppercase text-blue-900/70">
              <tr>
                {["Part No.", "Name", "Barcode", "OEM", "Loc", "Bin", "System", "Physical", "Diff", "Status", "Remarks", ""].map((h) => (
                  <th key={h} className="px-2 py-2 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const status = calcStatus(r.systemStock, r.physicalStock);
                const diff = r.physicalStock - r.systemStock;
                return (
                  <tr key={r.id} className="border-t border-blue-50">
                    <td className="p-1"><Input className="h-8" value={r.partNumber} onChange={(e) => update(i, { partNumber: e.target.value })} onBlur={(e) => autofill(i, e.target.value)} placeholder="PN-01000" onKeyDown={(e) => onKey(e, i, false)} /></td>
                    <td className="p-1"><Input className="h-8 min-w-[160px]" value={r.name} onChange={(e) => update(i, { name: e.target.value })} /></td>
                    <td className="p-1"><Input className="h-8" value={r.barcode} onChange={(e) => update(i, { barcode: e.target.value })} /></td>
                    <td className="p-1"><Input className="h-8" value={r.oemCode} onChange={(e) => update(i, { oemCode: e.target.value })} /></td>
                    <td className="p-1"><Input className="h-8 w-16" value={r.location} onChange={(e) => update(i, { location: e.target.value })} /></td>
                    <td className="p-1"><Input className="h-8 w-16" value={r.bin} onChange={(e) => update(i, { bin: e.target.value })} /></td>
                    <td className="p-1"><Input className="h-8 w-20 text-right tabular-nums" type="number" value={r.systemStock} onChange={(e) => update(i, { systemStock: Number(e.target.value) || 0 })} /></td>
                    <td className="p-1"><Input className="h-8 w-20 text-right tabular-nums" type="number" value={r.physicalStock} onChange={(e) => update(i, { physicalStock: Number(e.target.value) || 0 })} onKeyDown={(e) => onKey(e, i, true)} /></td>
                    <td className={`px-2 py-1 text-right tabular-nums font-medium ${diff === 0 ? "text-emerald-600" : diff > 0 ? "text-amber-600" : "text-rose-600"}`}>{diff > 0 ? `+${diff}` : diff}</td>
                    <td className="px-2 py-1"><VarianceBadge status={status} /></td>
                    <td className="p-1"><Input className="h-8 min-w-[140px]" value={r.remarks} onChange={(e) => update(i, { remarks: e.target.value })} placeholder="—" /></td>
                    <td className="p-1"><Button size="icon" variant="ghost" onClick={() => removeRow(i)} aria-label="Remove"><Trash2 className="h-4 w-4 text-rose-600" /></Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
