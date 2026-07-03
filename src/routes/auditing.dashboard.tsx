import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import {
  Boxes,
  BadgeIndianRupee,
  ClipboardCheck,
  ClipboardList,
  Users2,
  Warehouse as WarehouseIcon,
  AlertTriangle,
  Percent,
  CalendarClock,
  CalendarPlus,
  ScanLine,
  Scale,
  FileBarChart2,
} from "lucide-react";
import { StatCard } from "@/features/auditing/components/StatCard";
import { SectionCard } from "@/features/auditing/components/SectionCard";
import { StatusBadge, PriorityBadge } from "@/features/auditing/components/Badges";
import { Button } from "@/components/ui/button";
import {
  kpis,
  monthlyAuditTrend,
  accuracySeries,
  categoryVariance,
  warehouseComparison,
  topMismatched,
  warehouseName,
  auditorName,
} from "@/features/auditing/data/seed";
import { useStore } from "@/features/auditing/data/store";
import { format } from "date-fns";

export const Route = createFileRoute("/auditing/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Spintify Auditing" }] }),
  component: DashboardPage,
});

const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function DashboardPage() {
  const audits = useStore((s) => s.audits);
  const activity = useStore((s) => s.activity);
  const k = kpis();
  const upcoming = [...audits]
    .filter((a) => a.status === "Draft" || a.status === "In Progress")
    .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-950">Auditing Dashboard</h1>
          <p className="text-sm text-muted-foreground">Enterprise-wide inventory audit health at a glance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/auditing/audits">
              <CalendarPlus className="mr-1.5 h-4 w-4" /> New audit
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/auditing/barcode">
              <ScanLine className="mr-1.5 h-4 w-4" /> Scan
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/auditing/reconciliation">
              <Scale className="mr-1.5 h-4 w-4" /> Reconcile
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auditing/reports">
              <FileBarChart2 className="mr-1.5 h-4 w-4" /> Reports
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total Parts" value={k.totalParts.toLocaleString()} icon={<Boxes className="h-5 w-5" />} delta={2.4} />
        <StatCard label="Inventory Value" value={fmtINR(k.inventoryValue)} icon={<BadgeIndianRupee className="h-5 w-5" />} delta={1.1} />
        <StatCard label="Audits Completed" value={k.completed} icon={<ClipboardCheck className="h-5 w-5" />} delta={5.8} />
        <StatCard label="Pending Audits" value={k.pending} icon={<ClipboardList className="h-5 w-5" />} delta={-3.2} />
        <StatCard label="Active Auditors" value={k.activeAuditors} icon={<Users2 className="h-5 w-5" />} hint={`${k.warehouses} warehouses`} />
        <StatCard label="Warehouses" value={k.warehouses} icon={<WarehouseIcon className="h-5 w-5" />} />
        <StatCard label="Variance Detected" value={k.variance} icon={<AlertTriangle className="h-5 w-5" />} delta={-4.6} />
        <StatCard label="Stock Accuracy" value={`${k.accuracy.toFixed(1)}%`} icon={<Percent className="h-5 w-5" />} delta={0.7} />
        <StatCard
          label="Last Audit"
          value={k.lastAuditDate ? format(new Date(k.lastAuditDate), "d MMM yyyy") : "—"}
          icon={<CalendarClock className="h-5 w-5" />}
        />
        <StatCard
          label="Next Scheduled"
          value={k.nextAuditDate ? format(new Date(k.nextAuditDate), "d MMM yyyy") : "—"}
          icon={<CalendarPlus className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Monthly Audit Trend" className="xl:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyAuditTrend()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="audits" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="variance" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title="Inventory Accuracy">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={accuracySeries()}>
                <defs>
                  <linearGradient id="acc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="accuracy" stroke="#0284c7" fill="url(#acc)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Category-wise Variance">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryVariance()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="variance" radius={[6, 6, 0, 0]}>
                  {categoryVariance().map((_, i) => (
                    <Cell key={i} fill={`hsl(${210 + i * 8} 80% ${55 - i * 2}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title="Warehouse Comparison">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={warehouseComparison()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="warehouse" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="verified" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="issues" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title="Top Mismatched Parts">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topMismatched()} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="part" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Recent Activity" className="lg:col-span-2">
          <ul className="divide-y divide-blue-50">
            {activity.slice(0, 8).map((e) => (
              <li key={e.id} className="flex items-start gap-3 py-2.5">
                <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-blue-950">{e.message}</div>
                  <div className="text-xs text-muted-foreground">
                    {e.actor} · {format(new Date(e.when), "d MMM, HH:mm")}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Upcoming Audits" action={<Link to="/auditing/audits" className="text-xs text-blue-600 hover:underline">View all</Link>}>
          <ul className="space-y-2.5">
            {upcoming.map((a) => (
              <li key={a.id} className="rounded-lg border border-blue-50 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-blue-950">{a.auditNumber}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {warehouseName(a.warehouseId)} · {auditorName(a.assigneeId)}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge status={a.status} />
                    <PriorityBadge priority={a.priority} />
                  </div>
                </div>
                <div className="mt-1.5 text-[11px] text-muted-foreground">Due {format(new Date(a.dueDate), "d MMM yyyy")}</div>
              </li>
            ))}
            {upcoming.length === 0 && <li className="py-6 text-center text-xs text-muted-foreground">No upcoming audits</li>}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
