import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { SectionCard } from "@/features/auditing/components/SectionCard";
import { DataTable, type Column } from "@/features/auditing/components/DataTable";
import { StatusBadge, PriorityBadge } from "@/features/auditing/components/Badges";
import { ExportMenu } from "@/features/auditing/components/ExportMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actions, useStore } from "@/features/auditing/data/store";
import {
  AUDITORS,
  CATEGORIES,
  DEALERS,
  WAREHOUSES,
  auditorName,
  dealerName,
  warehouseName,
} from "@/features/auditing/data/seed";
import type { Audit, AuditStatus, Priority } from "@/features/auditing/data/types";
import { toast } from "sonner";

export const Route = createFileRoute("/auditing/audits")({
  head: () => ({ meta: [{ title: "Audit Management — Spintify Auditing" }] }),
  component: AuditsPage,
});

const STATUSES: AuditStatus[] = ["Draft", "In Progress", "Submitted", "Approved", "Rejected", "Completed"];
const PRIORITIES: Priority[] = ["Low", "Medium", "High", "Critical"];

function AuditsPage() {
  const audits = useStore((s) => s.audits);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [warehouse, setWarehouse] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return audits.filter((a) => {
      if (status !== "all" && a.status !== status) return false;
      if (priority !== "all" && a.priority !== priority) return false;
      if (warehouse !== "all" && a.warehouseId !== warehouse) return false;
      if (q && !`${a.auditNumber} ${a.name}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [audits, q, status, priority, warehouse]);

  const cols: Column<Audit>[] = [
    { key: "n", header: "Audit ID", cell: (r) => <span className="font-mono text-xs">{r.auditNumber}</span>, sortValue: (r) => r.auditNumber },
    { key: "name", header: "Name", cell: (r) => r.name, sortValue: (r) => r.name },
    { key: "wh", header: "Warehouse", cell: (r) => warehouseName(r.warehouseId), sortValue: (r) => warehouseName(r.warehouseId) },
    { key: "dl", header: "Dealer", cell: (r) => dealerName(r.dealerId) },
    { key: "as", header: "Assignee", cell: (r) => auditorName(r.assigneeId) },
    { key: "pr", header: "Priority", cell: (r) => <PriorityBadge priority={r.priority} />, sortValue: (r) => r.priority },
    { key: "st", header: "Status", cell: (r) => <StatusBadge status={r.status} />, sortValue: (r) => r.status },
    { key: "due", header: "Due", cell: (r) => format(new Date(r.dueDate), "d MMM yyyy"), sortValue: (r) => r.dueDate },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-950">Audit Management</h1>
          <p className="text-sm text-muted-foreground">Create, assign and track audits across your warehouses.</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu
            filename="audits"
            rows={filtered.map((a) => ({
              id: a.auditNumber,
              name: a.name,
              warehouse: warehouseName(a.warehouseId),
              dealer: dealerName(a.dealerId),
              assignee: auditorName(a.assigneeId),
              priority: a.priority,
              status: a.status,
              due: a.dueDate,
            }))}
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> New audit
              </Button>
            </DialogTrigger>
            <NewAuditDialog onClose={() => setOpen(false)} />
          </Dialog>
        </div>
      </div>

      <SectionCard>
        <div className="grid gap-3 md:grid-cols-5">
          <Input placeholder="Search audit id or name…" value={q} onChange={(e) => setQ(e.target.value)} />
          <FilterSelect value={status} onChange={setStatus} label="Status" all="All statuses" options={STATUSES} />
          <FilterSelect value={priority} onChange={setPriority} label="Priority" all="All priorities" options={PRIORITIES} />
          <Select value={warehouse} onValueChange={setWarehouse}>
            <SelectTrigger>
              <SelectValue placeholder="All warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All warehouses</SelectItem>
              {WAREHOUSES.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-right text-xs text-muted-foreground self-center">
            {filtered.length} of {audits.length} audits
          </div>
        </div>
      </SectionCard>

      <DataTable
        rows={filtered}
        columns={cols}
        rowKey={(r) => r.id}
        pageSize={12}
        onRowClick={(r) => toast.info(`Opening ${r.auditNumber}`)}
      />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  all,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  all: string;
  options: readonly string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{all}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function NewAuditDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [warehouseId, setWarehouseId] = useState(WAREHOUSES[0].id);
  const [dealerId, setDealerId] = useState(DEALERS[0].id);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [assigneeId, setAssigneeId] = useState(AUDITORS[0].id);
  const [priority, setPriority] = useState<Priority>("Medium");
  const [dueDate, setDueDate] = useState(format(new Date(Date.now() + 7 * 864e5), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");

  function submit() {
    if (!name.trim()) {
      toast.error("Please enter an audit name");
      return;
    }
    const now = new Date();
    const seq = Math.floor(Math.random() * 9000 + 1000);
    const audit = {
      id: `a-${Date.now()}`,
      name: name.trim(),
      auditNumber: `AUD-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}-${seq}`,
      status: "Draft" as AuditStatus,
      priority,
      warehouseId,
      dealerId,
      category,
      assigneeId,
      dueDate: new Date(dueDate).toISOString(),
      createdAt: now.toISOString(),
      notes: notes || undefined,
      items: [],
    };
    actions.addAudit(audit);
    actions.addNotification({ title: "New audit created", body: `${audit.auditNumber} scheduled` });
    toast.success(`Audit ${audit.auditNumber} created`);
    onClose();
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Create audit</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label>Audit name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Q4 Filters — Chennai" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Warehouse</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{WAREHOUSES.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Dealer</Label>
            <Select value={dealerId} onValueChange={setDealerId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DEALERS.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Assignee</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{AUDITORS.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Due date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Notes</Label>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes for the auditor" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Create audit</Button>
      </DialogFooter>
    </DialogContent>
  );
}
