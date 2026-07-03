import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Buyer, createBuyer, deleteBuyer, fetchBuyers, updateBuyer } from "@/lib/storage";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/buyers")({
  component: BuyersPage,
  head: () => ({ meta: [{ title: "Buyers — Bee Square Enterprises" }] }),
});

const empty = { name: "", phone: "", gstin: "", address: "" };

function BuyersPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [form, setForm] = useState({ ...empty });
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      setBuyers(await fetchBuyers());
    } catch (e) {
      console.error(e);
      toast.error("Failed to load buyers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function reset() {
    setForm({ ...empty });
    setEditId(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const payload: Omit<Buyer, "id"> = {
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      gstin: form.gstin.trim() || undefined,
      address: form.address.trim() || undefined,
    };
    try {
      if (editId) {
        await updateBuyer(editId, payload);
        toast.success("Buyer updated");
      } else {
        await createBuyer(payload);
        toast.success("Buyer added");
      }
      await refresh();
      reset();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save");
    }
  }

  function edit(b: Buyer) {
    setEditId(b.id);
    setForm({
      name: b.name,
      phone: b.phone || "",
      gstin: b.gstin || "",
      address: b.address || "",
    });
  }

  async function del(id: string) {
    if (!confirm("Delete this buyer?")) return;
    try {
      await deleteBuyer(id);
      if (editId === id) reset();
      await refresh();
      toast.success("Deleted");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete");
    }
  }

  return (
    <div className="grid lg:grid-cols-[400px_1fr] gap-6">
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-lg">{editId ? "Edit Buyer" : "Add Buyer"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="bn">Name of Buyer</Label>
              <Input id="bn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Himanshu Singh" />
            </div>
            <div>
              <Label htmlFor="bp">Phone</Label>
              <Input id="bp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit number" />
            </div>
            <div>
              <Label htmlFor="bg">GSTIN</Label>
              <Input id="bg" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} placeholder="15-char GSTIN" />
            </div>
            <div>
              <Label htmlFor="ba">Address</Label>
              <Textarea id="ba" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                <Plus className="h-4 w-4" /> {editId ? "Update" : "Save Buyer"}
              </Button>
              {editId && (
                <Button type="button" variant="outline" onClick={reset}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-lg">Saved Buyers ({buyers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading…</div>
          ) : buyers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No saved buyers yet. Add one on the left →
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buyers.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="text-sm">{b.phone || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{b.gstin || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {b.address || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => edit(b)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => del(b.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
