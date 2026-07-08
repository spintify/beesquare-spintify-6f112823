import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SPINTIFY_LOGO } from "@/lib/brand";

const search = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/audit/final-report")({
  validateSearch: (s) => search.parse(s),
  component: FinalReportPage,
});

type AuditRow = {
  id: string;
  audit_id: string;
  firm_name: string;
  owner_name: string;
  branch_name: string | null;
  city: string | null;
  state: string;
  gst_number: string;
  created_at: string;
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
function fmt2(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function FinalReportPage() {
  const { id } = Route.useSearch();
  const [audit, setAudit] = useState<AuditRow | null>(null);
  const [rows, setRows] = useState<Array<{ mrp: number; inv: number; counted: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: a }, { data: items }] = await Promise.all([
        supabase.from("audits").select("*").eq("id", id).maybeSingle(),
        supabase.from("audit_items").select("data").eq("audit_id", id).order("row_index"),
      ]);
      setAudit((a as AuditRow) ?? null);
      const mapped = (items ?? []).map((it) => {
        const d = (it.data ?? {}) as Record<string, unknown>;
        return {
          mrp: toNum(pick(d, ["NDP", "MRP", "Price", "Rate", "Unit Price"])),
          inv: toNum(pick(d, ["Quantity (Inventory)", "Inventory", "Quantity", "Qty", "Stock"])),
          counted: toNum(pick(d, ["Quantity Counted"])),
        };
      });
      setRows(mapped);
      setLoading(false);
    })();
  }, [id]);

  const stats = useMemo(() => {
    let totalParts = rows.length;
    let bkNoPhy = 0;
    let physAvail = 0;
    let zeroVar = 0, posVar = 0, negVar = 0;
    let siebelVal = 0, phyVal = 0, posVarVal = 0, negVarVal = 0;
    for (const r of rows) {
      if (r.inv > 0 && r.counted === 0) bkNoPhy++;
      if (r.counted > 0) physAvail++;
      const diff = r.counted - r.inv;
      if (diff === 0) zeroVar++;
      else if (diff > 0) { posVar++; posVarVal += diff * r.mrp; }
      else { negVar++; negVarVal += Math.abs(diff) * r.mrp; }
      siebelVal += r.inv * r.mrp;
      phyVal += r.counted * r.mrp;
    }
    const toLacs = (n: number) => n / 100000;
    const varianceVal = Math.abs(phyVal - siebelVal);
    const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);
    return {
      totalParts, bkNoPhy, physAvail,
      zeroVar, posVar, negVar,
      zeroPct: pct(zeroVar, totalParts),
      posPct: pct(posVar, totalParts),
      negPct: pct(negVar, totalParts),
      siebelValL: toLacs(siebelVal),
      phyValL: toLacs(phyVal),
      varValL: toLacs(varianceVal),
      posVarValL: toLacs(posVarVal),
      negVarValL: toLacs(negVarVal),
      varPct: pct(varianceVal, siebelVal),
      posVarPct: pct(posVarVal, siebelVal),
      negVarPct: pct(negVarVal, siebelVal),
    };
  }, [rows]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050b1e] text-white flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading final report…
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
  const fyStart = new Date(audit.created_at).getMonth() >= 3 ? new Date(audit.created_at).getFullYear() : new Date(audit.created_at).getFullYear() - 1;
  const fy = `${fyStart}-${String(fyStart + 1).slice(-2)}`;
  const firmLine = `${audit.firm_name}${audit.city ? " - " + audit.city : ""}`;

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-slate-900">
      <div className="print:hidden bg-[#050b1e] text-white">
        <div className="mx-auto max-w-[1100px] px-6 py-3 flex items-center justify-between">
          <Link to="/audit/history" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" /> Back to Reports
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full border border-sky-400/50 bg-gradient-to-b from-sky-500/40 to-blue-600/40 px-5 py-2 text-sm font-semibold hover:shadow-[0_0_28px_rgba(56,189,248,0.6)]"
          >
            <Printer className="h-4 w-4" /> Print Final Report
          </button>
        </div>
      </div>

      <div id="print-area" className="mx-auto max-w-[1000px] bg-white shadow print:shadow-none my-6 print:my-0 p-8 print:p-6">
        {/* Letterhead — matches audit report */}
        <header className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
          <img src={SPINTIFY_LOGO} alt="Spintify" className="h-16 w-16 object-contain" />
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-black tracking-wide text-slate-900">SPINTIFY TECH SOLUTIONS</h1>
            <p className="text-xs tracking-widest text-slate-600 mt-1">WALL TO WALL INVENTORY — FINAL REPORT</p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p><span className="font-semibold">Audit ID:</span> {audit.audit_id}</p>
            <p><span className="font-semibold">Date:</span> {dateStr}</p>
          </div>
        </header>

        {/* Summary Table */}
        <section className="mt-6">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th colSpan={5} className="bg-amber-400 text-slate-900 text-lg font-bold border-2 border-slate-900 py-3 px-4">
                  Wall to Wall Inventory - {fy}
                  <div className="text-base font-bold">{firmLine}</div>
                </th>
              </tr>
              <tr className="bg-white">
                <th className="border-2 border-slate-900 text-left px-3 py-2 font-bold">Details of parts considered in WWI</th>
                <th className="border-2 border-slate-900 bg-amber-300 px-3 py-2 font-bold text-center w-[110px]">Spares</th>
                <th className="border-2 border-slate-900 bg-amber-300 px-3 py-2 font-bold text-center w-[110px]">BSTS/Nano</th>
                <th className="border-2 border-slate-900 bg-slate-200 px-3 py-2 font-bold text-center w-[110px]">All</th>
                <th className="border-2 border-slate-900 px-3 py-2 font-bold text-center w-[80px]">%</th>
              </tr>
            </thead>
            <tbody>
              <TR label="Total no of parts" spares={stats.totalParts} all={stats.totalParts} />
              <TR label="Bk stk without phy stk" spares={stats.bkNoPhy} all={stats.bkNoPhy} />
              <TR label="Number of line items physically available" spares={stats.physAvail} all={stats.physAvail} />

              <tr>
                <th colSpan={5} className="bg-white border-2 border-slate-900 text-center text-base font-bold py-2">
                  Details of variance for ALL parts
                </th>
              </tr>
              <TR label="Parts with zero variance" spares={stats.zeroVar} all={stats.zeroVar} pct={stats.zeroPct} />
              <TR label="Parts with positive variance" spares={stats.posVar} all={stats.posVar} pct={stats.posPct} />
              <TR label="Parts with negative variance" spares={stats.negVar} all={stats.negVar} pct={stats.negPct} />
              <TR label="Total no of parts" spares={stats.totalParts} all={stats.totalParts} bold />

              <tr>
                <th colSpan={5} className="bg-white border-2 border-slate-900 text-center text-base font-bold py-2">
                  Value wise data @ NDP for ALL parts (Values in Lacs)
                </th>
              </tr>
              <TR label="SIEBEL stk value" spares={fmt2(stats.siebelValL)} all={fmt2(stats.siebelValL)} />
              <TR label="Phy stk value" spares={fmt2(stats.phyValL)} all={fmt2(stats.phyValL)} />
              <TR label="Variance value" spares={fmt2(stats.varValL)} all={fmt2(stats.varValL)} pct={stats.varPct} highlight />
              <TR label="Positive variance value" spares={fmt2(stats.posVarValL)} all={fmt2(stats.posVarValL)} pct={stats.posVarPct} />
              <TR label="Negative variance value" spares={fmt2(stats.negVarValL)} all={fmt2(stats.negVarValL)} pct={stats.negVarPct} />
            </tbody>
          </table>

          <div className="mt-4 text-xs italic text-slate-700 space-y-1">
            <p>Note :-</p>
            <p>1 . Positive variance if physical stk is more than SIEBEL stk.</p>
            <p>2 . Negative variance if Physical stk is less than SIEBEL stk.</p>
          </div>
        </section>

        {/* Signatures */}
        <section className="grid grid-cols-3 gap-6 mt-16 text-xs text-slate-700">
          <div className="border-t border-slate-500 pt-2 text-center font-semibold">Auditor</div>
          <div className="border-t border-slate-500 pt-2 text-center font-semibold">SPM (Spare Parts Manager)</div>
          <div className="border-t border-slate-500 pt-2 text-center font-semibold">GM (General Manager)</div>
        </section>

        <footer className="mt-8 pt-3 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between">
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
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}

function TR({
  label, spares, all, pct, bold, highlight,
}: {
  label: string;
  spares: string | number;
  all: string | number;
  pct?: number;
  bold?: boolean;
  highlight?: boolean;
}) {
  const cell = "border-2 border-slate-900 px-3 py-1.5";
  const hi = highlight ? "bg-amber-200" : "";
  return (
    <tr className={bold ? "font-bold" : ""}>
      <td className={`${cell} ${bold ? "font-bold" : ""}`}>{label}</td>
      <td className={`${cell} text-center ${hi}`}>{spares}</td>
      <td className={`${cell} text-center ${hi}`}>0{typeof spares === "string" ? ".00" : ""}</td>
      <td className={`${cell} text-center bg-slate-100 ${hi}`}>{all}</td>
      <td className={`${cell} text-center`}>{pct !== undefined ? `${pct.toFixed(pct >= 10 ? 0 : 2)}%` : ""}</td>
    </tr>
  );
}
