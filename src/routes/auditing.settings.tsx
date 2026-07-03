import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/features/auditing/components/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actions, useStore, currentUser } from "@/features/auditing/data/store";
import { WAREHOUSES } from "@/features/auditing/data/seed";
import { toast } from "sonner";

export const Route = createFileRoute("/auditing/settings")({
  head: () => ({ meta: [{ title: "Settings — Spintify Auditing" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const user = currentUser();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-blue-950">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure audit rules, notifications, and appearance.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Audit Rules">
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Tolerance %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={settings.tolerance}
                onChange={(e) => actions.setSetting("tolerance", Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Default warehouse</Label>
              <Select value={settings.defaultWarehouseId} onValueChange={(v) => actions.setSetting("defaultWarehouseId", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WAREHOUSES.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Audit number format</Label>
              <Input value={settings.auditNumberFormat} onChange={(e) => actions.setSetting("auditNumberFormat", e.target.value)} />
              <p className="text-xs text-muted-foreground">Placeholders: {"{YY}"} {"{MM}"} ####</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Notifications & Theme">
          <div className="grid gap-4">
            <div className="flex items-center justify-between rounded-lg border border-blue-100/70 bg-white p-3">
              <div>
                <div className="text-sm font-medium">Email notifications</div>
                <div className="text-xs text-muted-foreground">Alerts for assignments, approvals & mismatches.</div>
              </div>
              <Switch checked={settings.emailNotifications} onCheckedChange={(v) => actions.setSetting("emailNotifications", v)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-blue-100/70 bg-white p-3">
              <div>
                <div className="text-sm font-medium">Dark mode</div>
                <div className="text-xs text-muted-foreground">Switch appearance for the auditing suite.</div>
              </div>
              <Switch checked={settings.theme === "dark"} onCheckedChange={(v) => actions.setSetting("theme", v ? "dark" : "light")} />
            </div>
            <Button variant="outline" onClick={() => { actions.resetToSeed(); toast.success("Reset to seed data"); }}>
              Reset auditing data
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="Company Information">
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Company name</Label>
              <Input defaultValue="Spintify Tech Solutions" />
            </div>
            <div className="grid gap-1.5">
              <Label>GSTIN</Label>
              <Input defaultValue="33AABCS0000Z0" />
            </div>
            <div className="grid gap-1.5">
              <Label>Support email</Label>
              <Input defaultValue="support@spintify.io" />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Profile & Security">
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Name</Label>
              <Input defaultValue={user.name} />
            </div>
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input defaultValue={user.email} />
            </div>
            <div className="grid gap-1.5">
              <Label>Role</Label>
              <Input defaultValue={user.role} disabled />
            </div>
            <Button className="w-fit" onClick={() => toast.success("Profile updated")}>Save profile</Button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
