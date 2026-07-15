import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Loader2, ClipboardCheck, ScanSearch, ScanLine, Radio, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BarcodeScanner } from "@/components/BarcodeScanner";

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

function rowToData(r: Row) {
  const counted = toNum(r.countedQty);
  const shortQ = Math.max(0, r.inventoryQty - counted);
  const excessQ = Math.max(0, counted - r.inventoryQty);
  return {
    "Part Number": r.partNumber,
    "Part Name": r.partName,
    "HSN Code": r.hsn,
    NDP: r.mrp,
    "Quantity (Inventory)": r.inventoryQty,
    "Quantity Counted": counted,
    "Short Quantity": shortQ,
    "Excess Quantity": excessQ,
    "Short Values": shortQ * r.mrp,
    "Excess Values": excessQ * r.mrp,
    "Variance in Values": excessQ * r.mrp - shortQ * r.mrp,
    "Outward": toNum(r.outwardQty),
  };
}

function VerificationPage() {
  const { id: idFromSearch } = Route.useSearch();
  const navigate = useNavigate();
  const [audit, setAudit] = useState<{ id: string; audit_id: string; firm_name: string } | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const rowsRef = useRef<Row[]>([]);
  useEffect(() => { rowsRef.current = rows; }, [rows]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const emptyForm = { partNumber: "", partName: "", hsn: "", mrp: "", countedQty: "1", outwardQty: "0" };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    (async () => {
      setLoading(true);
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
        const rawCounted = pick(d, ["Quantity Counted"]);
        return {
          itemId: it.id,
          partNumber: String(pick(d, ["Part Number", "PartNumber", "Part No", "SKU", "Product ID"]) || ""),
          partName: String(pick(d, ["Part Name", "PartName", "Name", "Product", "Description", "Item"]) || ""),
          hsn: String(pick(d, ["HSN Code", "HSN"]) || ""),
          mrp: toNum(pick(d, ["NDP", "MRP", "Price", "Rate", "Unit Price"])),
          inventoryQty: toNum(pick(d, ["Quantity (Inventory)", "Inventory", "Quantity", "Qty", "Stock"])),
          countedQty: rawCounted === "" || rawCounted === null || rawCounted === undefined ? "0" : String(rawCounted),
          outwardQty: String(pick(d, ["Outward"]) || "0"),
        };
      });
      setRows(mapped);
      setLoading(false);
    })();
  }, [idFromSearch]);

  // Live sync: subscribe to audit_items updates for this audit
  useEffect(() => {
    if (!audit) return;
    const channel = supabase
      .channel(`audit_items:${audit.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "audit_items", filter: `audit_id=eq.${audit.id}` },
        (payload) => {
          const nd = (payload.new as { id: string; data: Record<string, unknown> }).data ?? {};
          const id = (payload.new as { id: string }).id;
          setRows((prev) =>
            prev.map((r) => {
              if (r.itemId !== id) return r;
              const rawCounted = (nd as Record<string, unknown>)["Quantity Counted"];
              const rawOutward = (nd as Record<string, unknown>)["Outward"];
              return {
                ...r,
                countedQty:
                  rawCounted === undefined || rawCounted === null || rawCounted === ""
                    ? r.countedQty
                    : String(rawCounted),
                outwardQty:
                  rawOutward === undefined || rawOutward === null
                    ? r.outwardQty
                    : String(rawOutward),
              };
            }),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [audit]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.partNumber.toLowerCase().includes(q) || r.partName.toLowerCase().includes(q));
  }, [rows, query]);

  const totals = useMemo(() => {
    let shortVal = 0, excessVal = 0, countedItems = 0, totalValue = 0, outwardVal = 0, countedVal = 0;
    for (const r of rows) {
      totalValue += r.mrp * r.inventoryQty;
      const counted = toNum(r.countedQty);
      if (counted > 0) countedItems++;
      countedVal += counted * r.mrp;
      shortVal += Math.max(0, r.inventoryQty - counted) * r.mrp;
      excessVal += Math.max(0, counted - r.inventoryQty) * r.mrp;
      const out = toNum(r.outwardQty);
      if (out > 0) outwardVal += out * r.mrp;
    }
    return { shortVal, excessVal, variance: excessVal - shortVal, countedItems, totalValue, outwardVal, countedVal };
  }, [rows]);

  const persistRow = useCallback(async (row: Row) => {
    await supabase.from("audit_items").update({ data: rowToData(row) }).eq("id", row.itemId);
  }, []);

  const setCounted = (itemId: string, value: string) => {
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
    setRows((prev) => prev.map((r) => (r.itemId === itemId ? { ...r, countedQty: value } : r)));
  };

  const commitCounted = (itemId: string) => {
    const row = rowsRef.current.find((r) => r.itemId === itemId);
    if (!row) return;
    const normalized = row.countedQty === "" ? "0" : row.countedQty;
    const updated = { ...row, countedQty: normalized };
    if (normalized !== row.countedQty) {
      setRows((prev) => prev.map((r) => (r.itemId === itemId ? updated : r)));
    }
    persistRow(updated);
  };

  const setOutward = (itemId: string, value: string) => {
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
    setRows((prev) => prev.map((r) => (r.itemId === itemId ? { ...r, outwardQty: value } : r)));
  };

  const commitOutward = (itemId: string) => {
    const row = rowsRef.current.find((r) => r.itemId === itemId);
    if (!row) return;
    const normalized = row.outwardQty === "" ? "0" : row.outwardQty;
    const updated = { ...row, outwardQty: normalized };
    if (normalized !== row.outwardQty) {
      setRows((prev) => prev.map((r) => (r.itemId === itemId ? updated : r)));
    }
    persistRow(updated);
  };

  const handleScan = useCallback(
    (code: string) => {
      const cleaned = code.trim();
      if (!cleaned) return;
      setLastScan(cleaned);

      // Exact, case-insensitive, trimmed comparison against imported Part Number column.
      const key = cleaned.toLowerCase();
      const match = rowsRef.current.find(
        (r) => r.partNumber.trim().toLowerCase() === key,
      );

      if (!match) {
        toast.error("Part Number not found.");
        return;
      }
      // Exactly one +1 per accepted scan.
      const next = { ...match, countedQty: String(toNum(match.countedQty) + 1) };
      setRows((prev) => prev.map((r) => (r.itemId === match.itemId ? next : r)));
      persistRow(next);
      toast.success(`+1 ${match.partNumber} → ${next.countedQty}`);
    },
    [persistRow],
  );

  const handleAddRow = async () => {
    if (!audit) return;
    const partNumber = form.partNumber.trim();
    if (!partNumber) {
      toast.error("Part Number is required.");
      return;
    }
    const dup = rowsRef.current.find(
      (r) => r.partNumber.trim().toLowerCase() === partNumber.toLowerCase(),
    );
    if (dup) {
      toast.error("Part Number already exists in the sheet.");
      return;
    }
    setAdding(true);
    try {
      const newRow: Omit<Row, "itemId"> = {
        partNumber,
        partName: form.partName.trim(),
        hsn: form.hsn.trim(),
        mrp: toNum(form.mrp),
        inventoryQty: 0,
        countedQty: form.countedQty === "" ? "0" : form.countedQty,
        outwardQty: form.outwardQty === "" ? "0" : form.outwardQty,
      };
      const nextIndex =
        rowsRef.current.reduce((max, _r, i) => Math.max(max, i), -1) + rowsRef.current.length > 0
          ? rowsRef.current.length
          : 0;
      // Use current length as row_index (append)
      const rowIndex = rowsRef.current.length;
      const { data, error } = await supabase
        .from("audit_items")
        .insert({
          audit_id: audit.id,
          row_index: rowIndex,
          data: rowToData({ ...newRow, itemId: "" } as Row),
        })
        .select("id")
        .single();
      if (error) throw error;
      const inserted: Row = { ...newRow, itemId: data.id };
      setRows((prev) => [...prev, inserted]);
      await supabase
        .from("audits")
        .update({ item_count: rowsRef.current.length + 1 })
        .eq("id", audit.id);
      toast.success(`Added ${partNumber}`);
      setForm(emptyForm);
      setAddOpen(false);
      void nextIndex;
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to add row");
    } finally {
      setAdding(false);
    }
  };

  const onFinish = async () => {
    if (!audit) return;
    setSaving(true);
    try {
      const updates = rows.map((r) =>
        supabase.from("audit_items").update({ data: rowToData(r) }).eq("id", r.itemId),
      );
      await Promise.all(updates);
      await supabase.from("audits").update({ status: "closed" }).eq("id", audit.id);
      toast.success("Audit ended. Generating report…");
      navigate({ to: "/audit/report", search: { id: audit.id } });
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
            <Radio className="h-3.5 w-3.5 animate-pulse" /> Live — scan on any device, counts sync instantly
          </div>
          <h2 className="mt-3 text-3xl md:text-4xl font-black tracking-tight">Inventory Verification</h2>
          <p className="mt-2 text-sky-100/70 text-sm">
            {audit?.firm_name ? `${audit.firm_name} — ` : ""}Scan a barcode to add +1 to Quantity Counted, or edit manually.
          </p>
        </section>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-4">
          <Stat label="Total Items" value={rows.length.toString()} />
          <Stat label="Counted" value={`${totals.countedItems} / ${rows.length}`} />
          <Stat label="Total Value" value={`₹ ${fmt(totals.totalValue)}`} tone="sky" />
          <Stat label="Total Counted Value" value={`₹ ${fmt(totals.countedVal)}`} tone="sky" />
          <Stat label="Total Outward Value" value={`₹ ${fmt(totals.outwardVal)}`} tone="amber" />
          <Stat label="Short Value" value={`₹ ${fmt(totals.shortVal)}`} tone="rose" />
          <Stat label="Excess Value" value={`₹ ${fmt(totals.excessVal)}`} tone="emerald" />
          <Stat label="Total Variance" value={`₹ ${fmt(totals.variance)}`} tone={totals.variance >= 0 ? "emerald" : "rose"} />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex w-full sm:w-auto items-center gap-2 flex-wrap">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search part number or name…"
                className="w-full sm:w-72 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-sky-100/40 outline-none focus:border-sky-400/60 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.15)]"
              />
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-100 hover:bg-sky-500/20"
              >
                <ScanLine className="h-4 w-4" /> Scan (+1)
              </button>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                disabled={!audit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> Add Row
              </button>
              {lastScan && (
                <span className="text-[11px] text-sky-100/60">
                  Last: <span className="text-sky-200 font-medium">{lastScan}</span>
                </span>
              )}
            </div>
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
                  <Th align="right">NDP</Th>
                  <Th align="right">Qty (Inventory)</Th>
                  <Th align="right" highlight>Qty Counted</Th>
                  <Th align="right">Short Qty</Th>
                  <Th align="right">Excess Qty</Th>
                  <Th align="right">Short Value</Th>
                  <Th align="right">Excess Value</Th>
                  <Th align="right">Variance</Th>
                  <Th align="right" highlight>Outward</Th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={12} className="py-10 text-center text-sky-100/60">Loading inventory…</td></tr>
                ) : !audit ? (
                  <tr><td colSpan={12} className="py-10 text-center text-sky-100/60">
                    No audit found. <Link to="/auditing/new-audit" className="text-sky-300 hover:underline">Start a new audit</Link>.
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={12} className="py-10 text-center text-sky-100/60">No items found.</td></tr>
                ) : (
                  filtered.map((r) => {
                    const counted = toNum(r.countedQty);
                    const shortQ = Math.max(0, r.inventoryQty - counted);
                    const excessQ = Math.max(0, counted - r.inventoryQty);
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
                            onBlur={() => commitCounted(r.itemId)}
                            placeholder="0"
                            className="w-24 rounded-md border border-sky-400/30 bg-sky-500/10 px-2 py-1 text-right text-white outline-none focus:border-sky-400 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.2)]"
                          />
                        </Td>
                        <Td align="right" className={shortQ > 0 ? "text-rose-300" : "text-sky-100/50"}>{shortQ || "—"}</Td>
                        <Td align="right" className={excessQ > 0 ? "text-emerald-300" : "text-sky-100/50"}>{excessQ || "—"}</Td>
                        <Td align="right" className={shortV > 0 ? "text-rose-300" : "text-sky-100/50"}>{shortV ? fmt(shortV) : "—"}</Td>
                        <Td align="right" className={excessV > 0 ? "text-emerald-300" : "text-sky-100/50"}>{excessV ? fmt(excessV) : "—"}</Td>
                        <Td align="right" className={variance === 0 ? "text-sky-100/50" : variance > 0 ? "text-emerald-300" : "text-rose-300"}>
                          {fmt(variance)}
                        </Td>
                        <Td align="right">
                          <input
                            inputMode="decimal"
                            value={r.outwardQty}
                            onChange={(e) => setOutward(r.itemId, e.target.value)}
                            onBlur={() => commitOutward(r.itemId)}
                            placeholder="0"
                            className="w-24 rounded-md border border-sky-400/30 bg-sky-500/10 px-2 py-1 text-right text-white outline-none focus:border-sky-400 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.2)]"
                          />
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
              search={{ editId: audit?.id }}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Edit Info
            </Link>
            <button
              type="button"
              onClick={onFinish}
              disabled={saving || !audit}
              className="inline-flex items-center gap-2 rounded-full border border-sky-400/50 bg-gradient-to-b from-sky-500/40 to-blue-600/40 px-7 py-2.5 text-sm font-semibold hover:shadow-[0_0_28px_rgba(56,189,248,0.6)] disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              End Audit
            </button>
          </div>
          <p className="mt-3 text-[11px] text-sky-100/50 text-center">
            <ClipboardCheck className="inline h-3 w-3 mr-1" />
            Every scan and edit saves instantly and syncs to other devices viewing this audit.
          </p>
        </div>
      </div>
      <BarcodeScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDetected={handleScan}
      />
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a1330] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Plus className="h-5 w-5 text-emerald-300" /> Add Physical Item
                </h3>
                <p className="text-[11px] text-sky-100/60 mt-0.5">
                  For parts physically present but not in the inventory sheet.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-md p-1 text-sky-100/60 hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Part Number *">
                <input
                  value={form.partNumber}
                  onChange={(e) => setForm((f) => ({ ...f, partNumber: e.target.value }))}
                  className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
                />
              </Field>
              <Field label="Part Name">
                <input
                  value={form.partName}
                  onChange={(e) => setForm((f) => ({ ...f, partName: e.target.value }))}
                  className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
                />
              </Field>
              <Field label="HSN Code">
                <input
                  value={form.hsn}
                  onChange={(e) => setForm((f) => ({ ...f, hsn: e.target.value }))}
                  className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
                />
              </Field>
              <Field label="NDP">
                <input
                  inputMode="decimal"
                  value={form.mrp}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*\.?\d*$/.test(v)) setForm((f) => ({ ...f, mrp: v }));
                  }}
                  className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
                />
              </Field>
              <Field label="Quantity Counted">
                <input
                  inputMode="decimal"
                  value={form.countedQty}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*\.?\d*$/.test(v)) setForm((f) => ({ ...f, countedQty: v }));
                  }}
                  className="w-full rounded-md border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                />
              </Field>
              <Field label="Outward">
                <input
                  inputMode="decimal"
                  value={form.outwardQty}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*\.?\d*$/.test(v)) setForm((f) => ({ ...f, outwardQty: v }));
                  }}
                  className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
                />
              </Field>
            </div>
            <p className="mt-3 text-[11px] text-sky-100/50">
              Inventory Quantity will be set to 0 — the counted qty appears as an excess.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddRow}
                disabled={adding}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-gradient-to-b from-emerald-500/40 to-emerald-600/40 px-5 py-2 text-sm font-semibold text-white hover:shadow-[0_0_20px_rgba(52,211,153,0.5)] disabled:opacity-60"
              >
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: "rose" | "emerald" | "sky" | "amber" }) {
  const toneCls = tone === "rose" ? "text-rose-300" : tone === "emerald" ? "text-emerald-300" : tone === "sky" ? "text-sky-300" : tone === "amber" ? "text-amber-300" : "text-white";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-xl px-4 py-3">
      <p className="text-[11px] uppercase tracking-widest text-sky-100/60">{label}</p>
      <p className={`mt-1 text-lg font-bold ${toneCls}`}>{value}</p>
    </div>
  );
}
