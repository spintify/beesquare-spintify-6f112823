import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Receipt, ClipboardCheck, LogOut, ArrowUpRight, Cog, Wrench, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SPINTIFY_LOGO, BRAND } from "@/lib/brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/modules")({
  head: () => ({
    meta: [
      { title: "Spintify — Choose a module" },
      { name: "description", content: "Choose Billing or Auditing to continue in Spintify." },
    ],
  }),
  component: ModulesPage,
});

function ModulesPage() {
  const navigate = useNavigate();
  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-white to-blue-100">
      {/* Decorative automotive background */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] select-none">
        <Cog className="absolute top-24 left-[42%] h-64 w-64 text-blue-900 animate-[spin_60s_linear_infinite]" />
        <Cog className="absolute bottom-24 left-[8%] h-40 w-40 text-blue-900 animate-[spin_45s_linear_infinite_reverse]" />
        <Wrench className="absolute top-1/3 right-[6%] h-56 w-56 -rotate-12 text-blue-900" />
        <Truck className="absolute bottom-16 left-1/3 h-40 w-40 text-blue-900" />
        <Cog className="absolute top-[55%] right-[30%] h-32 w-32 text-blue-900" />
      </div>
      <div className="pointer-events-none absolute -top-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-sky-300/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-blue-400/20 blur-3xl" />

      {/* Top nav */}
      <header className="relative z-10 mx-auto mt-5 max-w-7xl px-6">
        <div className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl px-5 py-3 shadow-lg shadow-blue-200/40">
          <div className="flex items-center gap-3">
            <img src={SPINTIFY_LOGO} alt="Spintify" className="h-12 w-12 object-contain" />
            <div className="leading-tight">
              <div
                className="text-sm md:text-base font-bold tracking-wide text-blue-950"
                style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}
              >
                SPINTIFY TECH SOLUTIONS
              </div>
              <div className="text-xs text-muted-foreground">Authorized Dealer of OEM Parts</div>
            </div>
          </div>
          <nav className="flex items-center gap-6">
            <button className="hidden sm:inline text-sm font-medium text-blue-950 hover:text-blue-700 transition-colors">
              Home
            </button>
            <button className="hidden sm:inline text-sm font-medium text-blue-950 hover:text-blue-700 transition-colors">
              Contact Us
            </button>
            <Button
              onClick={signOut}
              className="rounded-full bg-gradient-to-r from-sky-500 to-blue-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:from-sky-400 hover:to-blue-600"
            >
              Sign out <LogOut className="ml-1 h-4 w-4" />
            </Button>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 pt-16 pb-20 grid gap-10 lg:grid-cols-2 items-center">
        {/* Left — Hero */}
        <section>
          <div className="flex items-center gap-5">
            <img
              src={SPINTIFY_LOGO}
              alt="Spintify"
              className="h-20 w-20 object-contain drop-shadow-md"
            />
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.02] text-blue-950"
              style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}
            >
              SPINTIFY TECH<br />SOLUTIONS
            </h1>
          </div>
          <h2
            className="mt-6 text-2xl md:text-3xl font-semibold tracking-tight text-blue-900"
            style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}
          >
            {BRAND.tagline}
          </h2>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
            {BRAND.description}
          </p>
        </section>

        {/* Right — Module cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <ModuleCard
            number="1"
            title={<>BEE SQUARE<br />BILLING</>}
            description="Generate invoices and manage customer billing"
            icon={<Receipt className="h-7 w-7" />}
            onClick={() => navigate({ to: "/" })}
          />
          <ModuleCard
            number="2"
            title={<>AUDITING<br />APPLICATION</>}
            description="Track inventory, verify records, and manage audits"
            icon={<ClipboardCheck className="h-7 w-7" />}
            onClick={() => navigate({ to: "/auditing/dashboard" })}
          />
        </section>
      </main>
    </div>
  );
}

function ModuleCard({
  number,
  title,
  description,
  icon,
  onClick,
}: {
  number: string;
  title: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative aspect-[4/4.3] w-full text-left rounded-3xl border border-white/70 bg-white/60 backdrop-blur-xl p-6 shadow-xl shadow-blue-200/40 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-blue-300/60 hover:border-sky-300 hover:bg-white/75 overflow-hidden"
    >
      <span className="absolute top-4 right-5 text-4xl font-bold text-blue-200/80 select-none group-hover:text-sky-300 transition-colors">
        {number}
      </span>
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-blue-200 text-blue-800 shadow-inner ring-1 ring-white/70">
        {icon}
      </div>
      <h3
        className="mt-6 text-xl md:text-2xl font-extrabold tracking-tight text-blue-950 leading-tight"
        style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}
      >
        {title}
      </h3>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed pr-2">{description}</p>
      <span className="absolute bottom-5 right-5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-950 text-white opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
        <ArrowUpRight className="h-4 w-4" />
      </span>
    </button>
  );
}
