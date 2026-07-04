import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Loader2, ClipboardCheck, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const search = z.object({ id: z.string().uuid().optional() });

export const Route = createFileRoute("/audit/verification")({
  validateSearch: (s) => search.parse(s),
  component: VerificationPage,
});

type Row = {
  itemId: string;
  partNumber: string;
  partName: string;
  hsn: string;
  mrp: number;
  inventoryQty: number;
  countedQty: string;
  outwardQty: string;
};

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  const norm = (s: string) => s.toLowerCase().replace(/[\s_()-]+/g, "");
  const map = new Map<string, unknown>();
  for (const k of Object.keys(row)) map.set(norm(k), row[k]);
  for (const k of keys) {
    const v = map.get(norm(k));
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return "";
}

function toNum(v: unknown): number {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[,₹$\s]/g, ""));
    return isFinite(n) ? n : 0;
  }
  return 0;
}

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function VerificationPage() {
  const { id: idFromSearch } = Route.useSearch();
  const navigate = useNavigate();
  const [audit, setAudit] = useState<{ id: string; audit_id: string; firm_name: string } | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Determine which audit to load: explicit ?id=... or fallback to latest draft
      let auditRow: { id: string; audit_id: string; firm_name: string } | null = null;
      if (idFromSearch) {
        const { data } = await supabase
          .from("audits")
          .select("id, audit_id, firm_name")
          .eq("id", idFromSearch)
          .maybeSingle();
        auditRow = data ?? null;
      } else {
        const { data } = await supabase
          .from("audits")
          .select("id, audit_id, firm_name")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        auditRow = data ?? null;
      }
      setAudit(auditRow);

      if (!auditRow) {
        setRows([]);
        setLoading(false);
        return;
      }
      const { data: items } = await supabase
        .from("audit_items")
        .select("id, row_index, data")
        .eq("audit_id", auditRow.id)
        .order("row_index");
      const mapped: Row[] = (items ?? []).map((it) => {
        const d = (it.data ?? {}) as Record<string, unknown>;
        return {
          itemId: it.id,
          partNumber: String(pick(d, ["Part Number", "PartNumber", "Part No", "SKU", "Product ID"]) || ""),
          partName: String(pick(d, ["Part Name", "PartName", "Name", "Product", "Description", "Item"]) || ""),
          hsn: String(pick(d, ["HSN Code", "HSN"]) || ""),
          mrp: toNum(pick(d, ["MRP", "Price", "Rate", "Unit Price"])),
          inventoryQty: toNum(pick(d, ["Quantity (Inventory)", "Inventory", "Quantity", "Qty", "Stock"])),
          countedQty: String(pick(d, ["Quantity Counted"]) || ""),
          outwardQty: String(pick(d, ["Outward"]) || ""),
        };
      });
      setRows(mapped);
      setLoading(false);
    })();
  }, [idFromSearch]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.partNumber.toLowerCase().includes(q) || r.partName.toLowerCase().includes(q));
  }, [rows, query]);

  const totals = useMemo(() => {
    let shortVal = 0, excessVal = 0, countedItems = 0, totalValue = 0;
    for (const r of rows) {
      totalValue += r.mrp * r.inventoryQty;
      if (r.countedQty === "") continue;
      countedItems++;
      const counted = toNum(r.countedQty);
      shortVal += Math.max(0, r.inventoryQty - counted) * r.mrp;
      excessVal += Math.max(0, counted - r.inventoryQty) * r.mrp;
    }
    return { shortVal, excessVal, variance: excessVal - shortVal, countedItems, totalValue };
  }, [rows]);

  const setCounted = (itemId: string, value: string) => {
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
    setRows((prev) => prev.map((r) => (r.itemId === itemId ? { ...r, countedQty: value } : r)));
  };

  const setOutward = (itemId: string, value: string) => {
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
    setRows((prev) => prev.map((r) => (r.itemId === itemId ? { ...r, outwardQty: value } : r)));
  };

  const onFinish = async () => {
    if (!audit) return;
    setSaving(true);
    try {
      const updates = rows
        .filter((r) => r.countedQty !== "")
        .map(async (r) => {
          const counted = toNum(r.countedQty);
          const shortQ = Math.max(0, r.inventoryQty - counted);
          const excessQ = Math.max(0, counted - r.inventoryQty);
          return supabase
            .from("audit_items")
            .update({
              data: {
                "Part Number": r.partNumber,
                "Part Name": r.partName,
                "HSN Code": r.hsn,
                MRP: r.mrp,
                "Quantity (Inventory)": r.inventoryQty,
                "Quantity Counted": counted,
                "Short Quantity": shortQ,
                "Excess Quantity": excessQ,
                "Short Values": shortQ * r.mrp,
                "Excess Values": excessQ * r.mrp,
                "Variance in Values": excessQ * r.mrp - shortQ * r.mrp,
              },
            })
            .eq("id", r.itemId);
        });
      await Promise.all(updates);
      await supabase.from("audits").update({ status: "verified" }).eq("id", audit.id);
      toast.success("Physical verification saved");
      navigate({ to: "/audit/reconciliation" });
    } catch (e) {
      console.error(e);
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
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <ScanSearch className="h-5 w-5 text-sky-300" /> Physical Verification
            </h1>
            <p className="text-[11px] tracking-widest text-sky-200/60">
              STEP 2 — INVENTORY VERIFICATION {audit ? `• ${audit.audit_id}` : ""}
            </p>
          </div>
          <nav className="flex items-center gap-6 text-sm text-sky-100/80">
            <Link to="/modules" className="hover:text-white">Home</Link>
            <Link to="/audit" className="hover:text-white">Auditing Dashboard</Link>
          </nav>
        </header>

        <section className="text-center pt-8 pb-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-1.5 text-xs text-sky-200">
            <ClipboardCheck className="h-3.5 w-3.5" /> Enter Physically Counted Quantities
          </div>
          <h2 className="mt-3 text-3xl md:text-4xl font-black tracking-tight">Inventory Verification</h2>
          <p className="mt-2 text-sky-100/70 text-sm">
            {audit?.firm_name ? `${audit.firm_name} — ` : ""}Fill the “Quantity Counted” column. Other columns auto-calculate.
          </p>
        </section>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <Stat label="Total Items" value={rows.length.toString()} />
          <Stat label="Counted" value={`${totals.countedItems} / ${rows.length}`} />
          <Stat label="Total Value" value={`₹ ${fmt(totals.totalValue)}`} tone="sky" />
          <Stat label="Short Value" value={`₹ ${fmt(totals.shortVal)}`} tone="rose" />
          <Stat label="Excess Value" value={`₹ ${fmt(totals.excessVal)}`} tone="emerald" />
          <Stat label="Total Variance" value={`₹ ${fmt(totals.variance)}`} tone={totals.variance >= 0 ? "emerald" : "rose"} />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search part number or name…"
              className="w-full sm:max-w-xs rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-sky-100/40 outline-none focus:border-sky-400/60 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.15)]"
            />
            <p className="text-xs text-sky-100/60">
              Showing <span className="text-white">{filtered.length}</span> of {rows.length} items
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-white/[0.06] text-sky-100/80 text-[11px] uppercase tracking-wider">
                <tr>
                  <Th>Part Number</Th>
                  <Th>Part Name</Th>
                  <Th>HSN Code</Th>
                  <Th align="right">MRP</Th>
                  <Th align="right">Qty (Inventory)</Th>
                  <Th align="right" highlight>Qty Counted</Th>
                  <Th align="right">Short Qty</Th>
                  <Th align="right">Excess Qty</Th>
                  <Th align="right">Short Value</Th>
                  <Th align="right">Excess Value</Th>
                  <Th align="right">Variance</Th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className="py-10 text-center text-sky-100/60">Loading inventory…</td></tr>
                ) : !audit ? (
                  <tr><td colSpan={11} className="py-10 text-center text-sky-100/60">
                    No audit found. <Link to="/auditing/new-audit" className="text-sky-300 hover:underline">Start a new audit</Link>.
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={11} className="py-10 text-center text-sky-100/60">No items found.</td></tr>
                ) : (
                  filtered.map((r) => {
                    const counted = r.countedQty === "" ? null : toNum(r.countedQty);
                    const shortQ = counted === null ? 0 : Math.max(0, r.inventoryQty - counted);
                    const excessQ = counted === null ? 0 : Math.max(0, counted - r.inventoryQty);
                    const shortV = shortQ * r.mrp;
                    const excessV = excessQ * r.mrp;
                    const variance = excessV - shortV;
                    return (
                      <tr key={r.itemId} className="border-t border-white/5 hover:bg-white/[0.03] transition-colors">
                        <Td className="font-medium text-white">{r.partNumber || "—"}</Td>
                        <Td>{r.partName || "—"}</Td>
                        <Td>{r.hsn || "—"}</Td>
                        <Td align="right">{fmt(r.mrp)}</Td>
                        <Td align="right">{r.inventoryQty}</Td>
                        <Td align="right">
                          <input
                            inputMode="decimal"
                            value={r.countedQty}
                            onChange={(e) => setCounted(r.itemId, e.target.value)}
                            placeholder="0"
                            className="w-24 rounded-md border border-sky-400/30 bg-sky-500/10 px-2 py-1 text-right text-white outline-none focus:border-sky-400 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.2)]"
                          />
                        </Td>
                        <Td align="right" className={shortQ > 0 ? "text-rose-300" : "text-sky-100/50"}>{shortQ || "—"}</Td>
                        <Td align="right" className={excessQ > 0 ? "text-emerald-300" : "text-sky-100/50"}>{excessQ || "—"}</Td>
                        <Td align="right" className={shortV > 0 ? "text-rose-300" : "text-sky-100/50"}>{shortV ? fmt(shortV) : "—"}</Td>
                        <Td align="right" className={excessV > 0 ? "text-emerald-300" : "text-sky-100/50"}>{excessV ? fmt(excessV) : "—"}</Td>
                        <Td align="right" className={variance === 0 ? "text-sky-100/50" : variance > 0 ? "text-emerald-300" : "text-rose-300"}>
                          {counted === null ? "—" : fmt(variance)}
                        </Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <Link
              to="/auditing/new-audit"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <button
              type="button"
              onClick={onFinish}
              disabled={saving || !audit}
              className="inline-flex items-center gap-2 rounded-full border border-sky-400/50 bg-gradient-to-b from-sky-500/40 to-blue-600/40 px-7 py-2.5 text-sm font-semibold hover:shadow-[0_0_28px_rgba(56,189,248,0.6)] disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Save & Continue to Reconciliation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Th({ children, align = "left", highlight }: { children: React.ReactNode; align?: "left" | "right"; highlight?: boolean }) {
  return (
    <th className={`px-3 py-2.5 font-semibold ${align === "right" ? "text-right" : "text-left"} ${highlight ? "text-sky-200" : ""} whitespace-nowrap`}>
      {children}
    </th>
  );
}

function Td({ children, align = "left", className = "" }: { children: React.ReactNode; align?: "left" | "right"; className?: string }) {
  return (
    <td className={`px-3 py-2 ${align === "right" ? "text-right" : "text-left"} whitespace-nowrap ${className}`}>
      {children}
    </td>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "rose" | "emerald" | "sky" }) {
  const toneCls = tone === "rose" ? "text-rose-300" : tone === "emerald" ? "text-emerald-300" : tone === "sky" ? "text-sky-300" : "text-white";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-xl px-4 py-3">
      <p className="text-[11px] uppercase tracking-widest text-sky-100/60">{label}</p>
      <p className={`mt-1 text-lg font-bold ${toneCls}`}>{value}</p>
    </div>
  );
}
