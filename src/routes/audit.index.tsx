import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ClipboardPlus, FolderClock, FileClock, LogOut } from "lucide-react";
import { SPINTIFY_LOGO } from "@/lib/brand";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/audit/")({
  component: AuditLanding,
});

function AuditLanding() {
  const navigate = useNavigate();
  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050b1e] text-white">
      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.35),_transparent_60%),radial-gradient(ellipse_at_bottom,_rgba(14,165,233,0.25),_transparent_55%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,197,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(148,197,255,0.4) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0">
        {[...Array(18)].map((_, i) => (
          <span
            key={i}
            className="absolute block h-1 w-1 rounded-full bg-sky-300/60 animate-pulse"
            style={{
              top: `${(i * 53) % 100}%`,
              left: `${(i * 37) % 100}%`,
              animationDelay: `${(i % 6) * 0.4}s`,
              animationDuration: `${3 + (i % 4)}s`,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-6">
        {/* Header */}
        <header className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-4 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.35)] animate-fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <img src={SPINTIFY_LOGO} alt="Spintify" className="h-10 w-10 shrink-0 object-contain" />
            <div className="min-w-0">
              <h1 className="text-lg font-semibold leading-tight truncate">Auditing Application</h1>
              <p className="text-xs text-sky-200/70">Spintify Tech Solution</p>
            </div>
          </div>
          <nav className="flex items-center gap-6 text-sm text-sky-100/80">
            <Link to="/modules" className="hover:text-white transition-colors">Home</Link>
            <a href="#contact" className="hover:text-white transition-colors">Contact Us</a>
            <button
              onClick={signOut}
              className="hidden sm:inline-flex items-center gap-1.5 text-sky-100/70 hover:text-white transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </nav>
        </header>

        {/* Hero */}
        <section className="relative text-center pt-20 pb-14 animate-fade-in">
          <h2
            className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white drop-shadow-[0_4px_30px_rgba(59,130,246,0.35)]"
            style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}
          >
            Automobile Parts Audit Management
          </h2>
          <p className="mt-6 max-w-3xl mx-auto text-base md:text-lg text-sky-100/70">
            Manage, monitor, and review inventory audits with a secure and organized workflow.
          </p>
        </section>

        {/* Cards */}
        <section className="grid gap-6 md:grid-cols-3 pb-16">
          <ActionCard
            index={1}
            icon={<ClipboardPlus className="h-6 w-6" />}
            title="Start a New Audit"
            description="Begin a fresh inventory audit for OEM automobile parts. Create a new audit session and start verifying stock records."
            buttonLabel="Start Audit"
            to="/auditing/new-audit"
          />
          <ActionCard
            index={2}
            icon={<FolderClock className="h-6 w-6" />}
            title="Audits in Progress"
            description="Resume ongoing audit sessions, continue verification, and monitor audit completion status."
            buttonLabel="Continue Audit"
            to="/audit/verification"
          />
          <ActionCard
            index={3}
            icon={<FileClock className="h-6 w-6" />}
            title="Previous Audits"
            description="View completed audits, generate reports, compare inventory history, and review previous records."
            buttonLabel="View Reports"
            to="/audit/history"
          />
        </section>
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  buttonLabel,
  to,
}: {
  index: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  to: "/auditing/new-audit" | "/audit/verification" | "/audit/history";
}) {
  return (
    <div className="group relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl p-7 shadow-[0_10px_40px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/40 hover:shadow-[0_20px_60px_rgba(56,189,248,0.25)]">
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_60%)]" />
      <div className="relative">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/10 text-sky-300 shadow-[inset_0_0_20px_rgba(56,189,248,0.15)]">
          {icon}
        </div>
        <h3 className="mt-6 text-2xl font-bold text-white">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-sky-100/70 min-h-[72px]">{description}</p>
        <div className="mt-6 flex justify-center">
          <Link
            to={to}
            className="relative inline-flex items-center justify-center rounded-full border border-sky-400/50 bg-gradient-to-b from-sky-500/20 to-blue-600/20 px-7 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:from-sky-400/40 hover:to-blue-500/40 hover:shadow-[0_0_25px_rgba(56,189,248,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            <span className="absolute inset-0 rounded-full bg-sky-400/10 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative">{buttonLabel}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
