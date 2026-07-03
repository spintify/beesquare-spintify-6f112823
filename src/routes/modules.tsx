import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Receipt, ClipboardCheck, ArrowRight, LogOut, Cog, Wrench, Truck } from "lucide-react";
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
      {/* Decorative automotive-themed background */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
        <Cog className="absolute -top-10 -left-10 h-72 w-72 text-blue-900" />
        <Wrench className="absolute bottom-10 left-24 h-56 w-56 -rotate-12 text-blue-900" />
        <Truck className="absolute top-1/3 left-1/3 h-48 w-48 text-blue-900" />
        <Cog className="absolute bottom-20 right-40 h-40 w-40 text-blue-900" />
      </div>
      <div className="pointer-events-none absolute -top-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-sky-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-blue-400/20 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <img src={SPINTIFY_LOGO} alt="Spintify" className="h-10 w-10 object-contain" />
          <span className="font-semibold tracking-tight">{BRAND.name}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-1.5" /> Sign out
        </Button>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-8 pt-10 pb-20 grid gap-12 lg:grid-cols-2 items-center">
        {/* Left */}
        <section>
          <h1
            className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-blue-900 via-blue-700 to-sky-500 bg-clip-text text-transparent"
            style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}
          >
            {BRAND.name}
          </h1>
          <p className="mt-4 text-lg font-medium text-blue-900/80">{BRAND.tagline}</p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground max-w-lg">
            {BRAND.description}
          </p>
          <div className="mt-8 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Secure enterprise access
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> OEM parts optimized
            </span>
          </div>
        </section>

        {/* Right */}
        <section className="space-y-5">
          <ModuleCard
            number="01"
            title="Bee Square Billing"
            description="Generate invoices and manage customer billing."
            icon={<Receipt className="h-7 w-7" />}
            onClick={() => navigate({ to: "/" })}
          />
          <ModuleCard
            number="02"
            title="Auditing Application"
            description="Track inventory, verify records, and manage audits."
            icon={<ClipboardCheck className="h-7 w-7" />}
            onClick={() => navigate({ to: "/audit" })}
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
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-7 shadow-xl shadow-blue-200/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-300/50 hover:border-sky-300"
    >
      <div className="absolute top-5 right-6 text-5xl font-bold text-blue-100 select-none group-hover:text-sky-200 transition-colors">
        {number}
      </div>
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-lg shadow-blue-500/30">
        {icon}
      </div>
      <h3 className="mt-5 text-xl font-semibold tracking-tight text-blue-950">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 group-hover:gap-3 transition-all">
        Open module <ArrowRight className="h-4 w-4" />
      </div>
    </button>
  );
}
