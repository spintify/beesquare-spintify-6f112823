import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface Props {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  delta?: number;
  hint?: string;
  className?: string;
}

export function StatCard({ label, value, icon, delta, hint, className }: Props) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/70 bg-white/70 backdrop-blur-xl p-5 shadow-sm shadow-blue-100 transition-all hover:shadow-lg hover:shadow-blue-200/60 hover:-translate-y-0.5 animate-fade-in",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground truncate">{label}</div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight text-blue-950 truncate">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground truncate">{hint}</div>}
        </div>
        {icon && (
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-100 to-blue-200 text-blue-800 ring-1 ring-white/70">
            {icon}
          </div>
        )}
      </div>
      {typeof delta === "number" && (
        <div
          className={cn(
            "mt-3 inline-flex items-center gap-1 text-xs font-medium",
            positive ? "text-emerald-600" : "text-rose-600",
          )}
        >
          {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {Math.abs(delta).toFixed(1)}% vs last period
        </div>
      )}
    </div>
  );
}
