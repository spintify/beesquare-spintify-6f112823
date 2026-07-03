import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bill, BillItem, deleteBill, fetchBills, fmtINR, updateBill } from "@/lib/storage";
import { Invoice } from "@/components/Invoice";
import { Eye, Trash2, Printer, ArrowLeft, FileDown, Pencil, Save, X, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/bills")({
  component: BillsPage,
  head: () => ({ meta: [{ title: "Saved Bills — Bee Square Enterprises" }] }),
});

function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [view, setView] = useState<Bill | null>(null);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      setBills(await fetchBills());
    } catch (e) {
      console.error(e);
      toast.error("Failed to load bills");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function del(id: string) {
    if (!confirm("Delete this bill? (Stock will NOT be restored.)")) return;
    try {
      await deleteBill(id);
      await refresh();
      toast.success("Deleted");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete");
    }
  }

  if (editing) {
    return <EditBill bill={editing} onCancel={() => setEditing(null)} onSaved={async (b) => { setEditing(null); setView(b); await refresh(); }} />;
  }

  if (view) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between no-print">
          <Button variant="outline" onClick={() => setView(null)}>
            <ArrowLeft className="h-4 w-4" /> Back to bills
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(view)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <FileDown className="h-4 w-4" /> Save as PDF
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </div>
        <Invoice bill={view} />
      </div>
    );
  }

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="text-lg">Saved Bills ({bills.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading…</div>
        ) : bills.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No bills yet. Generate one from the Create Bill tab.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.billNumber}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(b.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </TableCell>
                  <TableCell>{b.customerName || "—"}</TableCell>
                  <TableCell className="text-right">{b.items.length}</TableCell>
                  <TableCell className="text-right font-semibold">{fmtINR(b.total)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => setView(b)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditing(b)}>
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
  );
}

function EditBill({ bill, onCancel, onSaved }: { bill: Bill; onCancel: () => void; onSaved: (b: Bill) => void }) {
  const [billNumber, setBillNumber] = useState(bill.billNumber);
  const [date, setDate] = useState(bill.date.slice(0, 10));
  const [customerName, setCustomerName] = useState(bill.customerName || "");
  const [customerPhone, setCustomerPhone] = useState(bill.customerPhone || "");
  const [customerAddress, setCustomerAddress] = useState(bill.customerAddress || "");
  const [customerGstin, setCustomerGstin] = useState(bill.customerGstin || "");
  const [gstRate, setGstRate] = useState(bill.gstRate);
  const [items, setItems] = useState<BillItem[]>(bill.items.map((i) => ({ ...i })));
  const [saving, setSaving] = useState(false);

  function recalcLine(it: BillItem): BillItem {
    const finalPrice = +(it.price - (it.price * it.discount) / 100).toFixed(2);
    const lineTotal = +(finalPrice * it.quantity).toFixed(2);
    return { ...it, finalPrice, lineTotal };
  }

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const taxable = items.reduce((s, i) => s + i.lineTotal, 0);
    const totalDiscount = +(subtotal - taxable).toFixed(2);
    const gstAmount = +((taxable * gstRate) / 100).toFixed(2);
    const total = +(taxable + gstAmount).toFixed(2);
    return { subtotal: +subtotal.toFixed(2), taxable: +taxable.toFixed(2), totalDiscount, gstAmount, total };
  }, [items, gstRate]);

  function update(idx: number, patch: Partial<BillItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? recalcLine({ ...it, ...patch }) : it)));
  }

  function addRow() {
    setItems((prev) => [...prev, { productId: "", name: "", hsn: "", price: 0, discount: 0, quantity: 1, finalPrice: 0, lineTotal: 0 }]);
  }

  function removeRow(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    if (!billNumber.trim()) { toast.error("Invoice number required"); return; }
    setSaving(true);
    try {
      const updated = await updateBill(bill.id, {
        billNumber: billNumber.trim(),
        date: new Date(date).toISOString(),
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        customerGstin: customerGstin.trim() || undefined,
        items,
        gstRate,
        ...totals,
      });
      toast.success("Bill updated");
      onSaved(updated);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onCancel}><X className="h-4 w-4" /> Cancel</Button>
        <Button onClick={save} disabled={saving}><Save className="h-4 w-4" /> Save changes</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Edit Invoice</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Invoice Number</Label>
              <Input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>GST Rate (%)</Label>
              <Input type="number" value={gstRate} onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Customer Name</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
            <div>
              <Label>GSTIN</Label>
              <Input value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Items</h3>
              <Button size="sm" variant="outline" onClick={addRow}><Plus className="h-4 w-4" /> Add row</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Product ID</TableHead>
                  <TableHead>HSN</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Disc%</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Input value={it.name} onChange={(e) => update(idx, { name: e.target.value })} /></TableCell>
                    <TableCell><Input value={it.productId} onChange={(e) => update(idx, { productId: e.target.value })} /></TableCell>
                    <TableCell><Input value={it.hsn || ""} onChange={(e) => update(idx, { hsn: e.target.value })} className="w-20" /></TableCell>
                    <TableCell><Input type="number" step="0.01" value={it.price} onChange={(e) => update(idx, { price: parseFloat(e.target.value) || 0 })} className="w-24 text-right" /></TableCell>
                    <TableCell><Input type="number" step="0.01" value={it.discount} onChange={(e) => update(idx, { discount: parseFloat(e.target.value) || 0 })} className="w-20 text-right" /></TableCell>
                    <TableCell><Input type="number" min={1} value={it.quantity} onChange={(e) => update(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })} className="w-20 text-right" /></TableCell>
                    <TableCell className="text-right font-semibold">{fmtINR(it.lineTotal)}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => removeRow(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <div className="w-full sm:w-72 space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{fmtINR(totals.subtotal)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>− {fmtINR(totals.totalDiscount)}</span></div>
              <div className="flex justify-between"><span>Taxable</span><span>{fmtINR(totals.taxable)}</span></div>
              <div className="flex justify-between"><span>GST ({gstRate}%)</span><span>{fmtINR(totals.gstAmount)}</span></div>
              <div className="flex justify-between font-bold text-base pt-2 border-t"><span>Total</span><span>{fmtINR(totals.total)}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
