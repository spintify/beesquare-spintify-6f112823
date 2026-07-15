import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SPINTIFY_LOGO } from "@/lib/brand";

const search = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/audit/report")({
  validateSearch: (s) => search.parse(s),
  component: ReportPage,
});

type AuditRow = {
  id: string;
  audit_id: string;
  firm_name: string;
  owner_name: string;
  branch_name: string | null;
  address_line1: string | null;
  city: string | null;
  state: string;
  pincode: string;
  gst_number: string;
  pan_number: string | null;
  mobile_number: string;
  contact_person: string | null;
  email: string | null;
  remarks: string | null;
  status: string;
  created_at: string;
};

type ReportRow = {
  partNumber: string;
  partName: string;
  hsn: string;
  mrp: number;
  inventoryQty: number;
  countedQty: number;
  shortQ: number;
  excessQ: number;
  shortV: number;
  excessV: number;
  variance: number;
  outward: number;
  outwardValue: number;
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

function ReportPage() {
  const { id } = Route.useSearch();
  const [audit, setAudit] = useState<AuditRow | null>(null);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: a }, { data: items }] = await Promise.all([
        supabase.from("audits").select("*").eq("id", id).maybeSingle(),
        supabase.from("audit_items").select("data").eq("audit_id", id).order("row_index"),
      ]);
      setAudit((a as AuditRow) ?? null);
      const mapped: ReportRow[] = (items ?? []).map((it) => {
        const d = (it.data ?? {}) as Record<string, unknown>;
        const mrp = toNum(pick(d, ["NDP", "MRP", "Price", "Rate", "Unit Price"]));
        const inventoryQty = toNum(pick(d, ["Quantity (Inventory)", "Inventory", "Quantity", "Qty", "Stock"]));
        const countedQty = toNum(pick(d, ["Quantity Counted"]));
        const shortQ = Math.max(0, inventoryQty - countedQty);
        const excessQ = Math.max(0, countedQty - inventoryQty);
        const outward = toNum(pick(d, ["Outward"]));
        return {
          partNumber: String(pick(d, ["Part Number", "PartNumber", "Part No", "SKU"]) || ""),
          partName: String(pick(d, ["Part Name", "PartName", "Name", "Product", "Description"]) || ""),
          hsn: String(pick(d, ["HSN Code", "HSN"]) || ""),
          mrp,
          inventoryQty,
          countedQty,
          shortQ,
          excessQ,
          shortV: shortQ * mrp,
          excessV: excessQ * mrp,
          variance: excessQ * mrp - shortQ * mrp,
          outward,
          outwardValue: outward * mrp,
        };
      });
      setRows(mapped);
      setLoading(false);
    })();
  }, [id]);

  const totals = useMemo(() => {
    let totalValue = 0, countedVal = 0, shortVal = 0, excessVal = 0, outwardVal = 0, counted = 0;
    for (const r of rows) {
      totalValue += r.mrp * r.inventoryQty;
      countedVal += r.mrp * r.countedQty;
      shortVal += r.shortV;
      excessVal += r.excessV;
      outwardVal += r.outwardValue;
      if (r.countedQty > 0) counted++;
    }
    return { totalValue, countedVal, shortVal, excessVal, outwardVal, counted, variance: excessVal - shortVal };
  }, [rows]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050b1e] text-white flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading report…
      </div>
    );
  }
  if (!audit) {
    return (
      <div className="min-h-screen bg-[#050b1e] text-white flex flex-col items-center justify-center gap-4">
        <p>Audit not found.</p>
        <Link to="/audit/history" className="underline">Back to reports</Link>
      </div>
    );
  }

  const dateStr = new Date(audit.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-slate-900">
      {/* Screen-only action bar */}
      <div className="print:hidden bg-[#050b1e] text-white">
        <div className="mx-auto max-w-[1100px] px-6 py-3 flex items-center justify-between">
          <Link to="/audit/history" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" /> Back to Reports
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full border border-sky-400/50 bg-gradient-to-b from-sky-500/40 to-blue-600/40 px-5 py-2 text-sm font-semibold hover:shadow-[0_0_28px_rgba(56,189,248,0.6)]"
          >
            <Printer className="h-4 w-4" /> Print Report
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div id="print-area" className="mx-auto max-w-[1100px] bg-white shadow print:shadow-none my-6 print:my-0 p-8 print:p-6">
        {/* Header */}
        <header className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
          <img src={SPINTIFY_LOGO} alt="Spintify" className="h-16 w-16 object-contain" />
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-black tracking-wide text-slate-900">SPINTIFY TECH SOLUTIONS</h1>
            <p className="text-xs tracking-widest text-slate-600 mt-1">INVENTORY AUDIT REPORT</p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p><span className="font-semibold">Audit ID:</span> {audit.audit_id}</p>
            <p><span className="font-semibold">Date:</span> {dateStr}</p>
          </div>
        </header>

        {/* Firm details */}
        <section className="grid grid-cols-2 gap-4 mt-5 text-sm">
          <div>
            <h2 className="text-[11px] font-bold tracking-widest text-slate-500">AUDITED FIRM</h2>
            <p className="mt-1 text-base font-bold">{audit.firm_name}</p>
            <p className="text-slate-700">Owner: {audit.owner_name}</p>
            {audit.branch_name && <p className="text-slate-700">Branch: {audit.branch_name}</p>}
            <p className="text-slate-700 mt-1">
              {[audit.address_line1, audit.city, audit.state, audit.pincode].filter(Boolean).join(", ")}
            </p>
          </div>
          <div>
            <h2 className="text-[11px] font-bold tracking-widest text-slate-500">CONTACT & TAX</h2>
            <p className="text-slate-700"><span className="font-semibold">GSTIN:</span> {audit.gst_number}</p>
            {audit.pan_number && <p className="text-slate-700"><span className="font-semibold">PAN:</span> {audit.pan_number}</p>}
            <p className="text-slate-700"><span className="font-semibold">Mobile:</span> {audit.mobile_number}</p>
            {audit.contact_person && <p className="text-slate-700"><span className="font-semibold">Contact:</span> {audit.contact_person}</p>}
            {audit.email && <p className="text-slate-700"><span className="font-semibold">Email:</span> {audit.email}</p>}
          </div>
        </section>

        {/* Summary tiles */}
        <section className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-5 text-xs">
          <SummaryBox label="Total Part Lines" value={rows.length.toString()} />
          <SummaryBox label="Part Line Counted" value={`${totals.counted}`} />
          <SummaryBox label="SIEBEL Stock Value" value={`₹ ${fmt(totals.totalValue)}`} />
          <SummaryBox label="Physical Stock Value" value={`₹ ${fmt(totals.countedVal)}`} />
          <SummaryBox label="Negative Variance" value={`₹ ${fmt(totals.shortVal)}`} tone="rose" />
          <SummaryBox label="Positive Variance" value={`₹ ${fmt(totals.excessVal)}`} tone="emerald" />
          <SummaryBox label="Variance Value" value={`₹ ${fmt(totals.variance)}`} tone={totals.variance >= 0 ? "emerald" : "rose"} />
          <SummaryBox label="Outward Value" value={`₹ ${fmt(totals.outwardVal)}`} tone="amber" />
        </section>

        {/* Table */}
        <section className="mt-5">
          <h2 className="text-[11px] font-bold tracking-widest text-slate-500 mb-2">ITEM DETAILS</h2>
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <Th>#</Th>
                <Th>Part Number</Th>
                <Th>Part Name</Th>
                <Th>HSN</Th>
                <Th right>NDP</Th>
                <Th right>Inv Qty</Th>
                <Th right>Counted</Th>
                <Th right>Short</Th>
                <Th right>Excess</Th>
                <Th right>Variance ₹</Th>
                <Th right>Outward</Th>
                <Th right>Outward ₹</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-200 even:bg-slate-50">
                  <Td>{i + 1}</Td>
                  <Td className="font-medium">{r.partNumber || "—"}</Td>
                  <Td>{r.partName || "—"}</Td>
                  <Td>{r.hsn || "—"}</Td>
                  <Td right>{fmt(r.mrp)}</Td>
                  <Td right>{r.inventoryQty}</Td>
                  <Td right>{r.countedQty || "—"}</Td>
                  <Td right className={r.shortQ ? "text-rose-600" : ""}>{r.shortQ || "—"}</Td>
                  <Td right className={r.excessQ ? "text-emerald-700" : ""}>{r.excessQ || "—"}</Td>
                  <Td right className={r.variance === 0 ? "" : r.variance > 0 ? "text-emerald-700" : "text-rose-600"}>
                    {r.countedQty ? fmt(r.variance) : "—"}
                  </Td>
                  <Td right>{r.outward || "—"}</Td>
                  <Td right className={r.outwardValue ? "text-amber-700" : ""}>{r.outwardValue ? fmt(r.outwardValue) : "—"}</Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold">
                <td colSpan={9} className="px-2 py-1.5 text-right">Totals</td>
                <td className="px-2 py-1.5 text-right">{fmt(totals.variance)}</td>
                <td></td>
                <td className="px-2 py-1.5 text-right">{fmt(totals.outwardVal)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        {audit.remarks && (
          <section className="mt-5">
            <h2 className="text-[11px] font-bold tracking-widest text-slate-500">REMARKS</h2>
            <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{audit.remarks}</p>
          </section>
        )}

        {/* Signatures */}
        <section className="grid grid-cols-2 gap-8 mt-10 text-xs text-slate-700">
          <div className="border-t border-slate-400 pt-2 text-center">Auditor Signature</div>
          <div className="border-t border-slate-400 pt-2 text-center">Firm Representative Signature</div>
        </section>

        <footer className="mt-6 pt-3 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between">
          <span>Generated by Spintify Tech Solutions</span>
          <span>Report ID: {audit.audit_id}</span>
        </footer>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; margin: 0 !important; padding: 6mm !important; }
          .min-h-screen { min-height: 0 !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`px-2 py-1.5 font-semibold ${right ? "text-right" : "text-left"} border border-slate-700`}>{children}</th>;
}
function Td({ children, right, className = "" }: { children: React.ReactNode; right?: boolean; className?: string }) {
  return <td className={`px-2 py-1 ${right ? "text-right" : "text-left"} border border-slate-200 ${className}`}>{children}</td>;
}
function SummaryBox({ label, value, tone }: { label: string; value: string; tone?: "rose" | "emerald" | "amber" }) {
  const toneCls =
    tone === "rose" ? "text-rose-700 border-rose-200 bg-rose-50" :
    tone === "emerald" ? "text-emerald-700 border-emerald-200 bg-emerald-50" :
    tone === "amber" ? "text-amber-700 border-amber-200 bg-amber-50" :
    "text-slate-800 border-slate-200 bg-slate-50";
  return (
    <div className={`rounded-md border px-2 py-1.5 ${toneCls}`}>
      <p className="text-[9px] uppercase tracking-widest opacity-70">{label}</p>
      <p className="font-bold text-[13px] leading-tight">{value}</p>
    </div>
  );
}
