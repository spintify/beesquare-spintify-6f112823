import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/features/auditing/components/SectionCard";
import { DataTable, type Column } from "@/features/auditing/components/DataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { actions, useStore } from "@/features/auditing/data/store";
import type { Auditor, Role } from "@/features/auditing/data/types";

export const Route = createFileRoute("/auditing/users")({
  head: () => ({ meta: [{ title: "Users — Spintify Auditing" }] }),
  component: UsersPage,
});

const ROLES: Role[] = ["Administrator", "Audit Manager", "Senior Auditor", "Auditor", "Warehouse Manager", "Viewer"];

function UsersPage() {
  const auditors = useStore((s) => s.auditors);

  const cols: Column<Auditor>[] = [
    {
      key: "n",
      header: "User",
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-blue-700 text-xs font-semibold text-white">
            {r.name.split(" ").map((s) => s[0]).join("")}
          </span>
          <div className="min-w-0">
            <div className="truncate font-medium text-blue-950">{r.name}</div>
            <div className="truncate text-xs text-muted-foreground">{r.email}</div>
          </div>
        </div>
      ),
      sortValue: (r) => r.name,
    },
    {
      key: "role",
      header: "Role",
      cell: (r) => (
        <Select value={r.role} onValueChange={(v) => actions.setUserRole(r.id, v as Role)}>
          <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>{ROLES.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent>
        </Select>
      ),
    },
    {
      key: "st",
      header: "Active",
      cell: (r) => <Switch checked={r.active} onCheckedChange={() => { /* view-only demo */ }} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-blue-950">Users &amp; Roles</h1>
        <p className="text-sm text-muted-foreground">Manage auditors, permissions and access.</p>
      </div>
      <SectionCard>
        <DataTable rows={auditors} columns={cols} rowKey={(r) => r.id} pageSize={10} />
      </SectionCard>
    </div>
  );
}
