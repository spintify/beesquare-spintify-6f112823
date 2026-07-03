import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  createPurchase, deletePurchase, fetchPurchases, updatePurchase, fmtINR,
  fetchSuppliers, createSupplier, updateSupplier, deleteSupplier,
  fetchProducts, upsertProductByProductId,
  type Purchase, type PurchaseItem, type Supplier, type Product,
} from "@/lib/storage";
import { filterByDate, exportExcel, generateReportPDF, type DateFilter, type PdfReportLine } from "@/lib/report-utils";
import { FileDown, FileSpreadsheet, Plus, Search, Trash2, X, Pencil, Eye, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/purchase-report")({
  head: () => ({
    meta: [
      { title: "Purchase Report — Bee Square" },
      { name: "description", content: "Manually record supplier purchases and export PDF/Excel reports." },
    ],
  }),
  component: PurchaseReportPage,
});

type DraftItem = { name: string; partNo: string; hsn: string; qty: number; price: number; gstRate: number; mrp: number };

function emptyItem(): DraftItem {
  return { name: "", partNo: "", hsn: "", qty: 1, price: 0, gstRate: 18, mrp: 0 };
}

function PurchaseReportPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [mode, setMode] = useState<DateFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");

  // entry dialog (create + edit)
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);

  // form state
  const [pDate, setPDate] = useState(new Date().toISOString().slice(0, 10));
  const [pNum, setPNum] = useState("");
  const [sName, setSName] = useState("");
  const [sPhone, setSPhone] = useState("");
  const [sAddr, setSAddr] = useState("");
  const [sGstin, setSGstin] = useState("");
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);

  // suppliers dialog
  const [supOpen, setSupOpen] = useState(false);
  const [supEditId, setSupEditId] = useState<string | null>(null);
  const [supName, setSupName] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supAddr, setSupAddr] = useState("");
  const [supGstin, setSupGstin] = useState("");

  useEffect(() => { reload(); reloadSuppliers(); reloadProducts(); }, []);
  const reload = () => fetchPurchases().then(setPurchases).catch((e) => toast.error(e.message));
  const reloadSuppliers = () => fetchSuppliers().then(setSuppliers).catch((e) => toast.error(e.message));
  const reloadProducts = () => fetchProducts().then(setProducts).catch(() => {});

  function lookupHsn(partNo: string): string | undefined {
    const q = partNo.trim().toLowerCase();
    if (!q) return undefined;
    const m = products.find((p) => p.productId.toLowerCase() === q);
    return m?.hsn;
  }

  function onPartNoChange(i: number, partNo: string) {
    const hsn = lookupHsn(partNo);
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, partNo, ...(hsn && !it.hsn ? { hsn } : {}) } : it)));
  }

  const filtered = useMemo(() => {
    let rows = filterByDate(purchases, mode, from, to);
    const s = q.trim().toLowerCase();
    if (s) {
      rows = rows.filter(
        (p) =>
          p.purchaseNumber.toLowerCase().includes(s) ||
          (p.supplierName ?? "").toLowerCase().includes(s) ||
          (p.supplierPhone ?? "").toLowerCase().includes(s)
      );
    }
    return rows;
  }, [purchases, mode, from, to, q]);

  const totals = useMemo(() => {
    let sub = 0, gst = 0, total = 0;
    filtered.forEach((p) => { sub += p.subtotal; gst += p.gstAmount; total += p.total; });
    return { sub, gst, total };
  }, [filtered]);

  function setItem(i: number, patch: Partial<DraftItem>) {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  const draftTotals = useMemo(() => {
    let sub = 0, gst = 0;
    items.forEach((it) => {
      const s = (Number(it.qty) || 0) * (Number(it.price) || 0);
      sub += s;
      gst += (s * (Number(it.gstRate) || 0)) / 100;
    });
    return { sub, gst, total: sub + gst };
  }, [items]);

  function resetForm() {
    setEditingId(null);
    setReadOnly(false);
    setPDate(new Date().toISOString().slice(0, 10));
    setPNum("");
    setSName(""); setSPhone(""); setSAddr(""); setSGstin("");
    setItems([emptyItem()]);
  }

  function openNew() {
    resetForm();
    setOpen(true);
  }

  function openEdit(p: Purchase, view = false) {
    setEditingId(p.id);
    setReadOnly(view);
    setPDate(p.date.slice(0, 10));
    setPNum(p.purchaseNumber);
    setSName(p.supplierName ?? "");
    setSPhone(p.supplierPhone ?? "");
    setSAddr(p.supplierAddress ?? "");
    setSGstin(p.supplierGstin ?? "");
    setItems(p.items.length
      ? p.items.map((it) => ({ name: it.name, partNo: it.productId, hsn: it.hsn ?? "", qty: it.quantity, price: it.price, gstRate: it.gstRate, mrp: (it as PurchaseItem & { mrp?: number }).mrp ?? +(it.price * (1 + it.gstRate / 100)).toFixed(2) }))
      : [emptyItem()]);
    setOpen(true);
  }

  function pickSupplier(id: string) {
    const s = suppliers.find((x) => x.id === id);
    if (!s) return;
    setSName(s.name);
    setSPhone(s.phone ?? "");
    setSAddr(s.address ?? "");
    setSGstin(s.gstin ?? "");
  }

  async function save() {
    if (!pNum.trim()) return toast.error("Purchase bill number required");
    if (!sName.trim()) return toast.error("Supplier name required");
    if (!items.some((it) => it.name.trim() && it.qty > 0)) return toast.error("Add at least one item");

    // duplicate check (client-side)
    const dup = purchases.find(
      (p) => p.purchaseNumber.trim().toLowerCase() === pNum.trim().toLowerCase() && p.id !== editingId
    );
    if (dup) return toast.error(`Purchase # "${pNum.trim()}" already exists`);

    const validItems: (PurchaseItem & { mrp?: number })[] = items
      .filter((it) => it.name.trim() && it.qty > 0)
      .map((it) => {
        const sub = it.qty * it.price;
        const gstAmt = +((sub * it.gstRate) / 100).toFixed(2);
        return {
          productId: it.partNo,
          name: it.name,
          hsn: it.hsn?.trim() || undefined,
          quantity: it.qty,
          price: it.price,
          gstRate: it.gstRate,
          gstAmount: gstAmt,
          lineTotal: +(sub + gstAmt).toFixed(2),
          mrp: +(it.mrp || 0).toFixed(2),
        };
      });
    const subtotal = +validItems.reduce((a, it) => a + it.price * it.quantity, 0).toFixed(2);
    const gstAmount = +validItems.reduce((a, it) => a + it.gstAmount, 0).toFixed(2);
    const total = +(subtotal + gstAmount).toFixed(2);
    const payload = {
      purchaseNumber: pNum.trim(),
      date: new Date(pDate).toISOString(),
      supplierName: sName, supplierPhone: sPhone, supplierAddress: sAddr, supplierGstin: sGstin,
      items: validItems, subtotal, gstAmount, total,
    };
    try {
      if (editingId) {
        await updatePurchase(editingId, payload);
        toast.success("Purchase updated");
      } else {
        await createPurchase(payload);
        // Auto-add each item to inventory using MRP (GST-inclusive → strip GST for base price)
        for (const it of validItems) {
          if (!it.productId?.trim() || !it.name.trim()) continue;
          const mrp = it.mrp ?? 0;
          const basePrice = mrp > 0 ? +(mrp / (1 + (it.gstRate || 18) / 100)).toFixed(2) : it.price;
          try {
            await upsertProductByProductId({
              name: it.name,
              productId: it.productId.trim(),
              hsn: it.hsn,
              price: basePrice,
              discount: 0,
              quantityToAdd: it.quantity,
            });
          } catch (invErr) {
            console.error("Inventory sync failed for", it.productId, invErr);
          }
        }
        toast.success("Purchase saved & inventory updated");
        reloadProducts();
      }
      setOpen(false); resetForm(); reload();
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.toLowerCase().includes("duplicate") || msg.includes("purchases_purchase_number_key")) {
        toast.error(`Purchase # "${pNum.trim()}" already exists`);
      } else {
        toast.error(msg);
      }
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this purchase entry?")) return;
    await deletePurchase(id); reload();
  }

  // ---- Suppliers CRUD ----
  function resetSupplierForm() {
    setSupEditId(null);
    setSupName(""); setSupPhone(""); setSupAddr(""); setSupGstin("");
  }
  function editSupplier(s: Supplier) {
    setSupEditId(s.id);
    setSupName(s.name);
    setSupPhone(s.phone ?? "");
    setSupAddr(s.address ?? "");
    setSupGstin(s.gstin ?? "");
  }
  async function saveSupplier() {
    if (!supName.trim()) return toast.error("Supplier name required");
    const dup = suppliers.find(
      (s) => s.name.trim().toLowerCase() === supName.trim().toLowerCase() && s.id !== supEditId
    );
    if (dup) return toast.error(`Supplier "${supName.trim()}" already exists`);
    try {
      const payload = { name: supName.trim(), phone: supPhone, address: supAddr, gstin: supGstin };
      if (supEditId) {
        await updateSupplier(supEditId, payload);
        toast.success("Supplier updated");
      } else {
        await createSupplier(payload);
        toast.success("Supplier added");
      }
      resetSupplierForm();
      reloadSuppliers();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function removeSupplier(id: string) {
    if (!confirm("Delete this supplier?")) return;
    await deleteSupplier(id);
    if (supEditId === id) resetSupplierForm();
    reloadSuppliers();
  }

  const rangeLabel = () => {
    if (mode === "all") return "All time";
    if (mode === "daily") return `Today: ${new Date().toLocaleDateString("en-IN")}`;
    if (mode === "monthly") return new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });
    return from && to ? `${from} to ${to}` : "Custom range";
  };

  function toPdfLines(): PdfReportLine[] {
    return filtered.map((p) => ({
      date: p.date,
      number: p.purchaseNumber,
      party: p.supplierName ?? "—",
      phone: p.supplierPhone ?? "",
      subtotal: p.subtotal, gst: p.gstAmount, total: p.total,
      items: p.items.map((it) => ({
        name: it.name, partNo: it.productId, qty: it.quantity,
        price: it.price, gstPct: it.gstRate, gstAmt: it.gstAmount, total: it.lineTotal,
      })),
    }));
  }

  function handlePDF() {
    if (!filtered.length) return toast.error("No data to export");
    generateReportPDF({
      title: "Purchase Report", partyLabel: "Supplier", range: rangeLabel(), lines: toPdfLines(),
      gstBreakup: { cgst: totals.gst / 2, sgst: totals.gst / 2, igst: 0 },
    });
  }
  function handleExcel() {
    if (!filtered.length) return toast.error("No data to export");
    const rows: Record<string, unknown>[] = [];
    filtered.forEach((p) => p.items.forEach((it) => rows.push({
      Date: new Date(p.date).toLocaleDateString("en-IN"),
      "Purchase #": p.purchaseNumber, Supplier: p.supplierName ?? "", Phone: p.supplierPhone ?? "",
      Product: it.name, "Part No": it.productId, Qty: it.quantity,
      "Price (excl. GST)": it.price, "GST %": it.gstRate, "GST Amount": it.gstAmount, Total: it.lineTotal,
    })));
    rows.push({});
    rows.push({ Product: "TOTAL", "Price (excl. GST)": totals.sub, "GST Amount": totals.gst, Total: totals.total });
    exportExcel(`Purchase_Report_${Date.now()}.xlsx`, "Purchases", rows);
  }

  const dialogTitle = readOnly ? "View Purchase Entry" : editingId ? "Edit Purchase Entry" : "Add Purchase Entry";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold">Purchase Report</h2>
            <p className="text-sm text-muted-foreground">Manually log supplier bills.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleExcel}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</Button>
            <Button variant="outline" onClick={handlePDF}><FileDown className="h-4 w-4 mr-2" />PDF</Button>

            {/* Suppliers manager */}
            <Dialog open={supOpen} onOpenChange={(o) => { setSupOpen(o); if (!o) resetSupplierForm(); }}>
              <DialogTrigger asChild>
                <Button variant="outline"><Users className="h-4 w-4 mr-2" />Suppliers</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Manage Suppliers</DialogTitle></DialogHeader>
                <div className="grid gap-3 md:grid-cols-2">
                  <div><Label>Name *</Label><Input value={supName} onChange={(e) => setSupName(e.target.value)} /></div>
                  <div><Label>Phone</Label><Input value={supPhone} onChange={(e) => setSupPhone(e.target.value)} /></div>
                  <div className="md:col-span-2"><Label>Address</Label><Input value={supAddr} onChange={(e) => setSupAddr(e.target.value)} /></div>
                  <div className="md:col-span-2"><Label>GSTIN</Label><Input value={supGstin} onChange={(e) => setSupGstin(e.target.value)} /></div>
                </div>
                <div className="flex gap-2 justify-end">
                  {supEditId && <Button variant="ghost" onClick={resetSupplierForm}>Cancel edit</Button>}
                  <Button onClick={saveSupplier}>{supEditId ? "Update Supplier" : "Add Supplier"}</Button>
                </div>
                <div className="border-t pt-3">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>GSTIN</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.name}</TableCell>
                          <TableCell>{s.phone ?? "—"}</TableCell>
                          <TableCell className="text-xs">{s.gstin ?? "—"}</TableCell>
                          <TableCell className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => editSupplier(s)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => removeSupplier(s.id)}><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!suppliers.length && (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No suppliers yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </DialogContent>
            </Dialog>

            {/* Entry dialog (new / edit / view) */}
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New Purchase</Button>
              </DialogTrigger>
              <DialogContent className="!max-w-[95vw] w-[95vw] max-h-[95vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{dialogTitle}</DialogTitle></DialogHeader>
                <fieldset disabled={readOnly} className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div><Label>Date</Label><Input type="date" value={pDate} onChange={(e) => setPDate(e.target.value)} /></div>
                    <div><Label>Purchase Bill #</Label><Input value={pNum} onChange={(e) => setPNum(e.target.value)} placeholder="e.g. INV-1234" /></div>
                    {!readOnly && suppliers.length > 0 && (
                      <div className="md:col-span-2">
                        <Label>Pick saved supplier (optional)</Label>
                        <Select onValueChange={pickSupplier}>
                          <SelectTrigger><SelectValue placeholder="Select to autofill…" /></SelectTrigger>
                          <SelectContent>
                            {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div><Label>Supplier Name</Label><Input value={sName} onChange={(e) => setSName(e.target.value)} /></div>
                    <div><Label>Supplier Phone</Label><Input value={sPhone} onChange={(e) => setSPhone(e.target.value)} /></div>
                    <div className="md:col-span-2"><Label>Address</Label><Input value={sAddr} onChange={(e) => setSAddr(e.target.value)} /></div>
                    <div className="md:col-span-2"><Label>GSTIN</Label><Input value={sGstin} onChange={(e) => setSGstin(e.target.value)} /></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Items</Label>
                      {!readOnly && (
                        <Button size="sm" variant="outline" onClick={() => setItems((a) => [...a, emptyItem()])}><Plus className="h-3 w-3 mr-1" />Add row</Button>
                      )}
                    </div>
                    {items.map((it, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-2"><Label className="text-xs">Product</Label><Input value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} /></div>
                        <div className="col-span-2"><Label className="text-xs">Part No</Label><Input value={it.partNo} onChange={(e) => onPartNoChange(i, e.target.value)} /></div>
                        <div className="col-span-1"><Label className="text-xs">HSN</Label><Input value={it.hsn} onChange={(e) => setItem(i, { hsn: e.target.value })} placeholder="auto" /></div>
                        <div className="col-span-1"><Label className="text-xs">Qty</Label><Input type="number" value={it.qty || ""} onChange={(e) => setItem(i, { qty: parseFloat(e.target.value) || 0 })} /></div>
                        <div className="col-span-1"><Label className="text-xs">Price</Label><Input type="number" value={it.price || ""} onChange={(e) => setItem(i, { price: parseFloat(e.target.value) || 0 })} /></div>
                        <div className="col-span-1"><Label className="text-xs">GST%</Label><Input type="number" value={it.gstRate || ""} onChange={(e) => setItem(i, { gstRate: parseFloat(e.target.value) || 0 })} /></div>
                        <div className="col-span-2"><Label className="text-xs">MRP (incl GST)</Label><Input type="number" value={it.mrp || ""} onChange={(e) => setItem(i, { mrp: parseFloat(e.target.value) || 0 })} placeholder="for inventory" /></div>
                        <div className="col-span-1 text-xs text-right pb-2">{fmtINR(it.qty * it.price * (1 + it.gstRate / 100))}</div>
                        <div className="col-span-1">
                          {!readOnly && (
                            <Button size="icon" variant="ghost" onClick={() => setItems((a) => a.filter((_, idx) => idx !== i))}><X className="h-4 w-4" /></Button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="text-right text-sm pt-2 border-t">
                      Subtotal: <strong>{fmtINR(draftTotals.sub)}</strong> • GST: <strong>{fmtINR(draftTotals.gst)}</strong> • Total: <strong>{fmtINR(draftTotals.total)}</strong>
                    </div>
                  </div>
                </fieldset>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>{readOnly ? "Close" : "Cancel"}</Button>
                  {!readOnly && <Button onClick={save}>{editingId ? "Update Purchase" : "Save Purchase"}</Button>}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="p-4 grid gap-3 md:grid-cols-5">
          <div>
            <Label>Filter</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as DateFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="daily">Today</SelectItem>
                <SelectItem value="monthly">This Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} disabled={mode !== "custom"} /></div>
          <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} disabled={mode !== "custom"} /></div>
          <div className="md:col-span-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Purchase #, supplier name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3"><div className="text-xs text-muted-foreground">Entries</div><div className="text-lg font-semibold">{filtered.length}</div></Card>
          <Card className="p-3"><div className="text-xs text-muted-foreground">Without GST</div><div className="text-lg font-semibold">{fmtINR(totals.sub)}</div></Card>
          <Card className="p-3"><div className="text-xs text-muted-foreground">Total GST</div><div className="text-lg font-semibold">{fmtINR(totals.gst)}</div></Card>
          <Card className="p-3"><div className="text-xs text-muted-foreground">Grand Total</div><div className="text-lg font-semibold">{fmtINR(totals.total)}</div></Card>
        </div>

        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Purchase #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Without GST</TableHead>
                <TableHead className="text-right">GST</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.date).toLocaleDateString("en-IN")}</TableCell>
                  <TableCell className="font-mono text-xs">{p.purchaseNumber}</TableCell>
                  <TableCell>{p.supplierName ?? "—"}</TableCell>
                  <TableCell>{p.supplierPhone ?? "—"}</TableCell>
                  <TableCell className="text-right">{p.items.length}</TableCell>
                  <TableCell className="text-right">{fmtINR(p.subtotal)}</TableCell>
                  <TableCell className="text-right">{fmtINR(p.gstAmount)}</TableCell>
                  <TableCell className="text-right font-semibold">{fmtINR(p.total)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" title="View" onClick={() => openEdit(p, true)}><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(p, false)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Delete" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No purchase entries yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
}
