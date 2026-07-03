import { cn } from "@/lib/utils";
import type { AuditStatus, Priority, VarianceStatus } from "@/features/auditing/data/types";

const statusStyles: Record<AuditStatus, string> = {
  Draft: "bg-slate-100 text-slate-700 ring-slate-200",
  "In Progress": "bg-blue-50 text-blue-700 ring-blue-200",
  Submitted: "bg-violet-50 text-violet-700 ring-violet-200",
  Approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  Completed: "bg-teal-50 text-teal-700 ring-teal-200",
};
const priStyles: Record<Priority, string> = {
  Low: "bg-slate-50 text-slate-600 ring-slate-200",
  Medium: "bg-amber-50 text-amber-700 ring-amber-200",
  High: "bg-orange-50 text-orange-700 ring-orange-200",
  Critical: "bg-rose-50 text-rose-700 ring-rose-200",
};
const varStyles: Record<VarianceStatus, string> = {
  Verified: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Missing: "bg-rose-50 text-rose-700 ring-rose-200",
  "Extra Stock": "bg-amber-50 text-amber-700 ring-amber-200",
  Damaged: "bg-orange-50 text-orange-700 ring-orange-200",
  Mismatch: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}
export const StatusBadge = ({ status }: { status: AuditStatus }) => <Badge className={statusStyles[status]}>{status}</Badge>;
export const PriorityBadge = ({ priority }: { priority: Priority }) => <Badge className={priStyles[priority]}>{priority}</Badge>;
export const VarianceBadge = ({ status }: { status: VarianceStatus }) => <Badge className={varStyles[status]}>{status}</Badge>;
