import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SectionCard } from "@/features/auditing/components/SectionCard";
import {
  accuracySeries,
  categoryVariance,
  monthlyAuditTrend,
  topMismatched,
  warehouseComparison,
} from "@/features/auditing/data/seed";

export const Route = createFileRoute("/auditing/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Spintify Auditing" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const trend = monthlyAuditTrend();
  const daily = trend.slice(-1)[0]?.audits ?? 0;
  const weekly = trend.slice(-3).reduce((s, t) => s + t.audits, 0);
  const monthly = trend.reduce((s, t) => s + t.audits, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-blue-950">Analytics</h1>
        <p className="text-sm text-muted-foreground">Deep dive into audit throughput, accuracy and problem areas.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard title="Daily Audits"><div className="text-3xl font-bold text-blue-950">{daily}</div></SectionCard>
        <SectionCard title="Weekly Audits"><div className="text-3xl font-bold text-blue-950">{weekly}</div></SectionCard>
        <SectionCard title="Monthly Audits"><div className="text-3xl font-bold text-blue-950">{monthly}</div></SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Audit throughput">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="audits" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title="Accuracy trend">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={accuracySeries()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="accuracy" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title="Warehouse performance">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={warehouseComparison()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="warehouse" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="verified" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="issues" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title="Category variance mix">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Pie data={categoryVariance()} dataKey="variance" nameKey="category" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {categoryVariance().map((_, i) => (
                    <Cell key={i} fill={`hsl(${210 + i * 20} 75% ${55 - i * 2}%)`} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Top problem areas">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topMismatched()} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="part" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
