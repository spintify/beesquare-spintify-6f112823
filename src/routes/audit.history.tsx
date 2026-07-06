import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, FileClock, CheckCircle2, FileText, FileSignature, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/audit/history")({
  component: HistoryPage,
});

type AuditRow = {
  id: string;
  audit_id: string;
  firm_name: string;
  owner_name: string;
  status: string;
  item_count: number;
  created_at: string;
};

function HistoryPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("audits")
        .select("id, audit_id, firm_name, owner_name, status, item_count, created_at")
        .eq("status", "closed")
        .order("created_at", { ascending: false });
      setRows((data ?? []) as AuditRow[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="relative min-h-screen bg-[#050b1e] text-white overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.35),_transparent_60%)]" />
      <div className="relative mx-auto max-w-6xl px-6 py-8 animate-fade-in">
        <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl border border-sky-400/30 bg-sky-500/10 flex items-center justify-center text-sky-300">
              <FileClock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Previous Audits</h1>
              <p className="text-[11px] tracking-widest text-sky-200/60">COMPLETED AUDIT REPORTS</p>
            </div>
          </div>
          <nav className="flex items-center gap-6 text-sm text-sky-100/80">
            <Link to="/modules" className="hover:text-white">Home</Link>
            <Link to="/audit" className="hover:text-white">Auditing Dashboard</Link>
          </nav>
        </header>

        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold tracking-widest text-sky-100/70">SAVED AUDIT REPORTS</h2>
            <span className="text-xs text-sky-100/60">
              {rows.length} report{rows.length === 1 ? "" : "s"}
            </span>
          </div>

          {loading ? (
            <div className="py-16 flex items-center justify-center text-sky-100/60 rounded-2xl border border-white/10 bg-white/[0.04]">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-sky-100/60 rounded-2xl border border-white/10 bg-white/[0.04]">
              No completed audits yet. End an audit to save its report here.
            </div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {rows.map((a) => (
                <li
                  key={a.id}
                  className="group rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-400/40 hover:shadow-[0_20px_60px_rgba(56,189,248,0.25)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-white truncate">{a.firm_name || a.audit_id}</h3>
                      <p className="text-xs text-sky-100/60 truncate mt-0.5">
                        Owner: {a.owner_name || "—"} • {a.audit_id}
                      </p>
                      <p className="text-[11px] text-sky-100/50 mt-0.5">
                        {new Date(a.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                        {" • "}
                        {a.item_count} items
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-200 whitespace-nowrap">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Audit Completed
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/audit/report", search: { id: a.id } })}
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
                    >
                      <FileText className="h-4 w-4" /> View Report
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/audit/report", search: { id: a.id } })}
                      className="inline-flex items-center gap-2 rounded-full border border-sky-400/50 bg-gradient-to-b from-sky-500/30 to-blue-600/30 px-4 py-2 text-sm font-semibold text-white hover:from-sky-400/50 hover:to-blue-500/50 hover:shadow-[0_0_22px_rgba(56,189,248,0.55)]"
                    >
                      <FileSignature className="h-4 w-4" /> Prepare Final Report
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-8">
          <Link
            to="/audit"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
      </div>
    </div>
  );
}
