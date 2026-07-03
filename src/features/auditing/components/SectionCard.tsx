import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-white/70 bg-white/70 backdrop-blur-xl shadow-sm shadow-blue-100 animate-fade-in",
        className,
      )}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-blue-100/60 px-5 py-3">
          <h3 className="text-sm font-semibold text-blue-950">{title}</h3>
          <div>{action}</div>
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
