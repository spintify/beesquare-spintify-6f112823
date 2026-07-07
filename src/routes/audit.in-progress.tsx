import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, FolderClock, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/audit/in-progress")({
  component: InProgressPage,
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

function progressFor(status: string) {
  if (status === "closed") return 100;
  if (status === "reviewed") return 95;
  if (status === "verified") return 60;
  if (status === "draft") return 15;
  return 0;
}

function statusLabel(status: string) {
  if (status === "closed") return "Closed";
  if (status === "reviewed") return "Reviewed";
  if (status === "verified") return "Verified";
  return "In Progress";
}

function InProgressPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("audits")
        .select("id, audit_id, firm_name, owner_name, status, item_count, created_at")
        .neq("status", "closed")
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      setRows((data ?? []) as AuditRow[]);
      setLoading(false);
    })();
  }, []);

  const handleDelete = async (a: AuditRow) => {
    if (!confirm(`Delete audit "${a.firm_name || a.audit_id}"? This cannot be undone.`)) return;
    const { error: e1 } = await supabase.from("audit_items").delete().eq("audit_id", a.id);
    if (e1) { toast.error(e1.message); return; }
    const { error: e2 } = await supabase.from("audits").delete().eq("id", a.id);
    if (e2) { toast.error(e2.message); return; }
    setRows((prev) => prev.filter((r) => r.id !== a.id));
    toast.success("Audit deleted");
  };



  return (
    <div className="relative min-h-screen bg-[#050b1e] text-white overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.35),_transparent_60%)]" />
      <div className="relative mx-auto max-w-6xl px-6 py-8 animate-fade-in">
        <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl border border-sky-400/30 bg-sky-500/10 flex items-center justify-center text-sky-300">
              <FolderClock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Audit In Progress</h1>
              <p className="text-[11px] tracking-widest text-sky-200/60">ONGOING SESSIONS</p>
            </div>
          </div>
          <nav className="flex items-center gap-6 text-sm text-sky-100/80">
            <Link to="/modules" className="hover:text-white">Home</Link>
            <Link to="/audit" className="hover:text-white">Auditing Dashboard</Link>
          </nav>
        </header>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.03]">
            <h2 className="text-xs font-bold tracking-widest text-sky-100/70">AUDIT IN PROGRESS</h2>
            <span className="text-xs text-sky-100/60">{rows.length} session{rows.length === 1 ? "" : "s"}</span>
          </div>

          {loading ? (
            <div className="py-16 flex items-center justify-center text-sky-100/60">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-sky-100/60">
              No audits currently in progress.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {rows.map((a) => {
                const pct = progressFor(a.status);
                return (
                  <li
                    key={a.id}
                    className="flex flex-col md:flex-row md:items-center gap-4 px-6 py-5 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-white truncate">{a.firm_name || a.audit_id}</p>
                      <p className="text-xs text-sky-100/60 truncate">
                        Client: {a.owner_name || "—"} • {a.audit_id}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 md:w-64">
                      <span className="text-xs text-sky-100/70 w-9 tabular-nums">{pct}%</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-sky-400 to-blue-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <span className="inline-flex items-center justify-center rounded-full border border-sky-400/40 bg-sky-500/10 px-3 py-1 text-xs text-sky-200 whitespace-nowrap">
                      {statusLabel(a.status)}
                    </span>

                    <button
                      type="button"
                      onClick={() => navigate({ to: "/audit/verification", search: { id: a.id } })}
                      className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-1.5 text-sm text-white hover:bg-white/10 whitespace-nowrap"
                    >
                      Manage
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(a)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/10 px-4 py-1.5 text-sm text-rose-200 hover:bg-rose-500/20 whitespace-nowrap"
                      aria-label="Delete audit"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="mt-6">
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
