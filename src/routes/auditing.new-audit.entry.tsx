import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { ArrowLeft, Save, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const search = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/auditing/new-audit/entry")({
  validateSearch: (s) => search.parse(s),
  component: EntryPage,
});

type Row = {
  itemId: string;
  partNumber: string;
  partName: string;
  mrp: number;
  qtyInventory: number;
  qtyCounted: string; // user input
};

const COLUMNS = [
  "Part Number",
  "Part Name",
  "MRP",
  "Quantity (Inventory)",
  "Quantity (Counted)",
  "Short QTY",
  "Excess QTY",
  "Short Value",
  "Excess Value",
  "Variance in Values",
];

function pickKey(obj: Record<string, unknown>, keys: string[]): unknown {
  const lower: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) lower[k.toLowerCase().trim()] = obj[k];
  for (const k of keys) {
    const v = lower[k.toLowerCase()];
    if (v !== undefined && v !== "") return v;
  }
  return "";
}

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^0-9.\-]/g, ""));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function EntryPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const [audit, setAudit] = useState<{ audit_id: string; firm_name: string } | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: auditRow }, { data: items }] = await Promise.all([
        supabase.from("audits").select("audit_id, firm_name").eq("id", id).maybeSingle(),
        supabase.from("audit_items").select("id, row_index, data").eq("audit_id", id).order("row_index"),
      ]);
      setAudit(auditRow ?? null);
      const parsed: Row[] = (items ?? []).map((it) => {
        const d = (it.data ?? {}) as Record<string, unknown>;
        const values = Object.values(d);
        return {
          itemId: it.id,
          partNumber: String(pickKey(d, ["Part Number", "part number", "partnumber", "product_id"]) || values[0] || ""),
          partName: String(pickKey(d, ["Part Name", "part name", "name", "product_name"]) || values[1] || ""),
          mrp: toNum(pickKey(d, ["MRP", "mrp", "price"]) ?? values[3]),
          qtyInventory: toNum(pickKey(d, ["Quantity (Inventory)", "quantity (inventory)", "qty inventory", "quantity", "qty"]) ?? values[4]),
          qtyCounted: "",
        };
      });
      setRows(parsed);
      setLoading(false);
    })();
  }, [id]);

  const totals = useMemo(() => {
    let shortQty = 0, excessQty = 0, shortVal = 0, excessVal = 0;
    for (const r of rows) {
      const counted = r.qtyCounted === "" ? null : toNum(r.qtyCounted);
      if (counted === null) continue;
      const diff = counted - r.qtyInventory;
      if (diff < 0) { shortQty += -diff; shortVal += -diff * r.mrp; }
      else if (diff > 0) { excessQty += diff; excessVal += diff * r.mrp; }
    }
    return { shortQty, excessQty, shortVal, excessVal, variance: excessVal - shortVal };
  }, [rows]);

  const updateCounted = (idx: number, val: string) => {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, qtyCounted: val } : r)));
  };

  const computeRow = (r: Row) => {
    if (r.qtyCounted === "") return { shortQty: "", excessQty: "", shortVal: "", excessVal: "", variance: "" };
    const counted = toNum(r.qtyCounted);
    const diff = counted - r.qtyInventory;
    const shortQty = diff < 0 ? -diff : 0;
    const excessQty = diff > 0 ? diff : 0;
    const shortVal = shortQty * r.mrp;
    const excessVal = excessQty * r.mrp;
    return {
      shortQty: shortQty || "",
      excessQty: excessQty || "",
      shortVal: shortVal ? shortVal.toFixed(2) : "",
      excessVal: excessVal ? excessVal.toFixed(2) : "",
      variance: (excessVal - shortVal).toFixed(2),
    };
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const updates = rows.map((r) => {
        const c = computeRow(r);
        return supabase.from("audit_items").update({
          data: {
            "Part Number": r.partNumber,
            "Part Name": r.partName,
            MRP: r.mrp,
            "Quantity (Inventory)": r.qtyInventory,
            "Quantity (Counted)": r.qtyCounted === "" ? null : toNum(r.qtyCounted),
            "Short QTY": c.shortQty || 0,
            "Excess QTY": c.excessQty || 0,
            "Short Value": c.shortVal || 0,
            "Excess Value": c.excessVal || 0,
            "Variance in Values": c.variance || 0,
          },
        }).eq("id", r.itemId);
      });
      await Promise.all(updates);
      toast.success("Audit data saved");
      navigate({ to: "/auditing/new-audit/review", search: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#050b1e] text-white overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.35),_transparent_60%)]" />
      <div className="relative mx-auto max-w-[1400px] px-6 py-6 animate-fade-in">
        <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-tight">Audit Data Entry</h1>
            <p className="text-[11px] tracking-widest text-sky-200/60">
              {audit ? `${audit.audit_id} • ${audit.firm_name}` : "LOADING…"}
            </p>
          </div>
          <nav className="flex items-center gap-6 text-sm text-sky-100/80">
            <Link to="/modules" className="hover:text-white">Home</Link>
            <Link to="/audit" className="hover:text-white">Auditing Dashboard</Link>
          </nav>
        </header>

        <section className="mt-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Inventory Verification</h2>
            <p className="mt-2 text-sky-100/70 text-sm">
              First 5 columns are auto-filled from your uploaded Excel. Enter the counted quantity to auto-calculate variance.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            <Stat label="Short Qty" value={totals.shortQty.toString()} tone="rose" />
            <Stat label="Excess Qty" value={totals.excessQty.toString()} tone="emerald" />
            <Stat label="Short Value" value={totals.shortVal.toFixed(2)} tone="rose" />
            <Stat label="Excess Value" value={totals.excessVal.toFixed(2)} tone="emerald" />
            <Stat label="Variance" value={totals.variance.toFixed(2)} tone="sky" />
          </div>
        </section>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-sky-100/70">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading inventory…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-24 text-center text-sky-100/70">No rows found for this audit.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/[0.06] border-b border-white/10">
                    <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-sky-200/70 w-12">#</th>
                    {COLUMNS.map((c) => (
                      <th key={c} className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-sky-200/70 whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => {
                    const c = computeRow(r);
                    return (
                      <tr key={r.itemId} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                        <td className="px-3 py-2 text-sky-100/50">{idx + 1}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.partNumber}</td>
                        <td className="px-3 py-2">{r.partName}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.mrp ? r.mrp.toFixed(2) : ""}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.qtyInventory || ""}</td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            value={r.qtyCounted}
                            onChange={(e) => updateCounted(idx, e.target.value)}
                            placeholder="0"
                            className="w-24 rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-right text-sm text-white outline-none transition-all focus:border-sky-400/60 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(56,189,248,0.2)]"
                          />
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-rose-300">{c.shortQty}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-300">{c.excessQty}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-rose-300">{c.shortVal}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-300">{c.excessVal}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-sky-200">{c.variance}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <Link
            to="/auditing/new-audit"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/audit"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm hover:bg-white/10"
            >
              <Download className="h-4 w-4" /> Save Draft
            </Link>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || loading || rows.length === 0}
              className="inline-flex items-center gap-2 rounded-full border border-sky-400/50 bg-gradient-to-b from-sky-500/40 to-blue-600/40 px-7 py-2.5 text-sm font-semibold text-white transition-all hover:from-sky-400/60 hover:to-blue-500/60 hover:shadow-[0_0_28px_rgba(56,189,248,0.6)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "rose" | "emerald" | "sky" }) {
  const toneCls =
    tone === "rose" ? "text-rose-300 border-rose-400/30" :
    tone === "emerald" ? "text-emerald-300 border-emerald-400/30" :
    "text-sky-200 border-sky-400/30";
  return (
    <div className={`rounded-lg border ${toneCls} bg-white/[0.03] px-3 py-2`}>
      <p className="text-[10px] uppercase tracking-widest text-sky-100/60">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
