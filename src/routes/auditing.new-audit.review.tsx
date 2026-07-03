import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const search = z.object({ id: z.string().uuid().optional() });

export const Route = createFileRoute("/auditing/new-audit/review")({
  validateSearch: (s) => search.parse(s),
  component: ReviewPage,
});

function ReviewPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const [audit, setAudit] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      navigate({ to: "/auditing/new-audit" });
      return;
    }
    (async () => {
      const { data } = await supabase.from("audits").select("*").eq("id", id).maybeSingle();
      setAudit(data ?? null);
      setLoading(false);
    })();
  }, [id, navigate]);

  return (
    <div className="relative min-h-screen bg-[#050b1e] text-white overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.35),_transparent_60%)]" />
      <div className="relative mx-auto max-w-4xl px-6 py-8 animate-fade-in">
        <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">Review Audit</h1>
            <p className="text-[11px] tracking-widest text-sky-200/60">STEP 2 — UPLOAD REVIEW</p>
          </div>
          <nav className="flex items-center gap-6 text-sm text-sky-100/80">
            <Link to="/modules" className="hover:text-white">Home</Link>
            <Link to="/audit" className="hover:text-white">Auditing Dashboard</Link>
          </nav>
        </header>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-8">
          {loading ? (
            <p className="text-sky-100/70">Loading…</p>
          ) : !audit ? (
            <p className="text-sky-100/70">Audit not found.</p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                <div>
                  <p className="text-2xl font-bold">{String(audit.audit_id)}</p>
                  <p className="text-sm text-sky-100/60">Audit created successfully</p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <Info label="Firm" value={String(audit.firm_name)} />
                <Info label="Owner" value={String(audit.owner_name)} />
                <Info label="GST" value={String(audit.gst_number)} />
                <Info label="Mobile" value={String(audit.mobile_number)} />
                <Info label="State" value={String(audit.state)} />
                <Info label="Pincode" value={String(audit.pincode)} />
                <Info label="File" value={String(audit.file_name ?? "-")} />
                <Info label="Items" value={String(audit.item_count)} />
              </div>
              <div className="mt-8 flex gap-3">
                <Link
                  to="/auditing/new-audit"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm hover:bg-white/10"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Link>
                <Link
                  to="/audit"
                  className="inline-flex items-center rounded-full border border-sky-400/50 bg-gradient-to-b from-sky-500/40 to-blue-600/40 px-6 py-2 text-sm font-semibold hover:shadow-[0_0_25px_rgba(56,189,248,0.5)]"
                >
                  Return to Dashboard
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] uppercase tracking-widest text-sky-100/50">{label}</p>
      <p className="mt-0.5 truncate">{value}</p>
    </div>
  );
}
