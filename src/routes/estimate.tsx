import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Buyer, BillItem, COMPANY, Product, calcFinalPrice, fetchBuyers, fetchProducts, fmtINR, nextEstimateNumber, saveBillNoStock } from "@/lib/storage";
import { amountInWords } from "@/components/Invoice";
import { Plus, Trash2, Printer, FileDown, Search, Users, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/estimate")({
  component: EstimatePage,
  head: () => ({ meta: [{ title: "Create Estimate — Bee Square Enterprises" }] }),
});

type Draft = BillItem & { uid: string };

type Estimate = {
  estimateNumber: string;
  date: string;
  validUntil?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGstin?: string;
  notes?: string;
  items: BillItem[];
  subtotal: number;
  totalDiscount: number;
  taxable: number;
  gstRate: number;
  gstAmount: number;
  total: number;
};

// Estimate numbers are allocated from the DB counter (EST-<FY>) via nextEstimateNumber().


function EstimatePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [items, setItems] = useState<Draft[]>([]);
  const [search, setSearch] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const [gstRate, setGstRate] = useState(18);
  const [estimateNumber, setEstimateNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [notes, setNotes] = useState("");
  const [generated, setGenerated] = useState<Estimate | null>(null);
  const [buyerDialogOpen, setBuyerDialogOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, b] = await Promise.all([fetchProducts(), fetchBuyers()]);
        setProducts(p);
        setBuyers(b);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load data");
      }
    })();
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggest(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.productId.toLowerCase().includes(q))
      .filter((p) => !items.some((i) => i.productId === p.productId))
      .slice(0, 6);
  }, [search, products, items]);

  function addProduct(p: Product) {
    const finalPrice = calcFinalPrice(p.price, p.discount);
    setItems((prev) => [
      ...prev,
      {
        uid: crypto.randomUUID(),
        productId: p.productId,
        name: p.name,
        hsn: p.hsn,
        price: p.price,
        discount: p.discount,
        quantity: 1,
        finalPrice,
        lineTotal: finalPrice,
      },
    ]);
    setSearch("");
    setShowSuggest(false);
  }

  function addBlankRow() {
    setItems((prev) => [
      ...prev,
      { uid: crypto.randomUUID(), productId: "", name: "", hsn: "", price: 0, discount: 0, quantity: 1, finalPrice: 0, lineTotal: 0 },
    ]);
  }

  function updateRow(uid: string, patch: Partial<BillItem>) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.uid !== uid) return i;
        const merged = { ...i, ...patch } as Draft;
        const finalPrice = calcFinalPrice(merged.price, merged.discount);
        const lineTotal = +(finalPrice * merged.quantity).toFixed(2);
        return { ...merged, finalPrice, lineTotal };
      })
    );
  }

  function removeItem(uid: string) {
    setItems((prev) => prev.filter((i) => i.uid !== uid));
  }

  function pickBuyer(b: Buyer) {
    setCustomerName(b.name);
    setCustomerPhone(b.phone || "");
    setCustomerAddress(b.address || "");
    setCustomerGstin(b.gstin || "");
    setBuyerDialogOpen(false);
    toast.success(`Loaded ${b.name}`);
  }

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const taxable = items.reduce((s, i) => s + i.lineTotal, 0);
    const totalDiscount = +(subtotal - taxable).toFixed(2);
    const gstAmount = +((taxable * gstRate) / 100).toFixed(2);
    const total = +(taxable + gstAmount).toFixed(2);
    return { subtotal: +subtotal.toFixed(2), taxable: +taxable.toFixed(2), totalDiscount, gstAmount, total };
  }, [items, gstRate]);

  async function allocateNumber() {
    try {
      const n = await nextEstimateNumber();
      setEstimateNumber(n);
      return n;
    } catch (e) {
      console.error(e);
      toast.error("Failed to allocate estimate number");
      return "";
    }
  }

  useEffect(() => {
    if (!estimateNumber) void allocateNumber();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    if (items.length === 0) { toast.error("Add at least one item"); return; }
    let num = estimateNumber.trim();
    if (!num) num = await allocateNumber();
    if (!num) return;
    setSaving(true);
    const finalItems = items.map(({ uid: _uid, ...rest }) => rest);
    const est: Estimate = {
      estimateNumber: num,
      date: new Date(date).toISOString(),
      validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      customerGstin: customerGstin.trim() || undefined,
      notes: notes.trim() || undefined,
      items: finalItems,
      gstRate,
      ...totals,
    };
    try {
      await saveBillNoStock({
        billNumber: num,
        date: est.date,
        customerName: est.customerName,
        customerPhone: est.customerPhone,
        customerAddress: est.customerAddress,
        customerGstin: est.customerGstin,
        items: finalItems,
        subtotal: est.subtotal,
        totalDiscount: est.totalDiscount,
        taxable: est.taxable,
        gstRate: est.gstRate,
        gstAmount: est.gstAmount,
        total: est.total,
      });
      toast.success(`Estimate ${num} saved to Bills`);
    } catch (e) {
      console.error(e);
      toast.error("Saved locally, but couldn't sync to Bills");
    } finally {
      setSaving(false);
    }
    setGenerated(est);
    setTimeout(() => document.getElementById("estimate-print")?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function reset() {
    setItems([]);
    setCustomerName(""); setCustomerPhone(""); setCustomerAddress(""); setCustomerGstin("");
    setNotes(""); setValidUntil("");
    setEstimateNumber("");
    await allocateNumber();
    setDate(new Date().toISOString().slice(0, 10));
    setGenerated(null);
  }

  if (generated) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 no-print">
          <Button variant="outline" onClick={() => setGenerated(null)}>
            <ArrowLeft className="h-4 w-4" /> Back to edit
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reset}>
              <Plus className="h-4 w-4" /> New Estimate
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <FileDown className="h-4 w-4" /> Save as PDF
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </div>
        <EstimateDoc est={generated} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Create Estimate</h1>
          <p className="text-sm text-muted-foreground">Build a quotation for a buyer. Stock is not affected.</p>
        </div>
        {products.length === 0 && (
          <Link to="/products" className="text-sm text-primary hover:underline">Add your first product →</Link>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-lg">Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div ref={searchRef} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product name or ID..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowSuggest(true); }}
                onFocus={() => setShowSuggest(true)}
                className="pl-9"
              />
              {showSuggest && suggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                  {suggestions.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-accent text-left transition-colors"
                    >
                      <div>
                        <div className="font-medium text-sm">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.productId} • Stock: {p.quantity}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{fmtINR(calcFinalPrice(p.price, p.discount))}</div>
                        {p.discount > 0 && (
                          <div className="text-xs text-muted-foreground line-through">{fmtINR(p.price)}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-lg">
                No items yet. Search products above or add a custom row.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right w-20">Disc%</TableHead>
                    <TableHead className="text-right w-20">Qty</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.uid}>
                      <TableCell>
                        <Input value={it.name} onChange={(e) => updateRow(it.uid, { name: e.target.value })} placeholder="Item name" />
                        <div className="flex gap-2 mt-1">
                          <Input value={it.productId} onChange={(e) => updateRow(it.uid, { productId: e.target.value })} placeholder="Product ID" className="h-7 text-xs" />
                          <Input value={it.hsn || ""} onChange={(e) => updateRow(it.uid, { hsn: e.target.value })} placeholder="HSN" className="h-7 text-xs w-24" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input type="number" step="0.01" value={it.price} onChange={(e) => updateRow(it.uid, { price: parseFloat(e.target.value) || 0 })} className="w-24 text-right ml-auto" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min={0} max={100} step="0.01" value={it.discount || ""} onChange={(e) => updateRow(it.uid, { discount: parseFloat(e.target.value) || 0 })} className="w-20 text-right ml-auto" placeholder="0" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min={1} value={it.quantity} onChange={(e) => updateRow(it.uid, { quantity: Math.max(1, parseInt(e.target.value) || 1) })} className="w-20 text-right ml-auto" />
                      </TableCell>
                      <TableCell className="text-right font-semibold">{fmtINR(it.lineTotal)}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => removeItem(it.uid)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <Button size="sm" variant="outline" onClick={addBlankRow}>
              <Plus className="h-4 w-4" /> Add custom row
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader><CardTitle className="text-lg">Estimate Info</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Estimate #</Label>
                <Input value={estimateNumber} onChange={(e) => setEstimateNumber(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <Label>Valid Until</Label>
                  <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-lg">Buyer</CardTitle>
              <Dialog open={buyerDialogOpen} onOpenChange={setBuyerDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><Users className="h-4 w-4" /> Saved Buyers</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Saved Buyers</DialogTitle>
                    <DialogDescription>Pick a buyer to autofill.</DialogDescription>
                  </DialogHeader>
                  <div className="max-h-80 overflow-y-auto space-y-2">
                    {buyers.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No saved buyers yet.</p>
                    ) : (
                      buyers.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => pickBuyer(b)}
                          className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent border border-border transition-colors"
                        >
                          <div className="font-medium text-sm">{b.name}</div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {b.phone && <div>Ph: {b.phone}</div>}
                            {b.gstin && <div>GSTIN: {b.gstin}</div>}
                            {b.address && <div className="line-clamp-1">{b.address}</div>}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Name</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></div>
              <div><Label>GSTIN</Label><Input value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value)} /></div>
              <div><Label>Address</Label><Textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} rows={2} /></div>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader><CardTitle className="text-lg">Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Subtotal" value={fmtINR(totals.subtotal)} />
              <Row label="Discount" value={`− ${fmtINR(totals.totalDiscount)}`} muted />
              <Row label="Taxable" value={fmtINR(totals.taxable)} />
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">GST %</Label>
                <Input type="number" min={0} max={100} step="0.5" value={gstRate} onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)} className="w-20 h-8 text-right" />
              </div>
              <Row label="GST Amount" value={fmtINR(totals.gstAmount)} />
              <div className="flex justify-between items-center pt-3 border-t border-border mt-2">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-xl" style={{ color: "var(--primary)" }}>{fmtINR(totals.total)}</span>
              </div>
              <div>
                <Label>Notes / Terms</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional notes shown on the estimate" />
              </div>
              <Button onClick={generate} disabled={saving} className="w-full mt-2" size="lg">
                <FileDown className="h-4 w-4" /> {saving ? "Saving…" : "Generate & Save Estimate"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={muted ? "text-muted-foreground" : ""}>{value}</span>
    </div>
  );
}

function EstimateDoc({ est }: { est: Estimate }) {
  const d = new Date(est.date);
  const halfRate = +(est.gstRate / 2).toFixed(2);
  const cgst = +(est.gstAmount / 2).toFixed(2);
  const sgst = +(est.gstAmount - cgst).toFixed(2);
  const rounded = Math.round(est.total);
  const roundOff = +(rounded - est.total).toFixed(2);

  return (
    <div id="estimate-print" className="invoice-page bg-[var(--invoice-bg)] text-[oklch(0.18_0.03_255)] rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="px-8 py-6 text-white" style={{ background: "#2a179e" }}>
        <div className="flex justify-between items-start gap-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{COMPANY.name}</h2>
            <p className="text-sm opacity-90 mt-1">{COMPANY.address}</p>
            <p className="text-sm opacity-90">GSTIN: {COMPANY.gst}</p>
            <p className="text-sm opacity-90">Phone: {COMPANY.phone}</p>
          </div>
          <div className="text-right">
            <div className="inline-block bg-white/15 backdrop-blur px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider">
              Estimate / Quotation
            </div>
            <p className="text-xs opacity-80 mt-2">This is not a tax invoice</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-5 grid grid-cols-2 gap-6 border-b border-border bg-muted/30">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Estimate For</p>
          <p className="font-semibold">{est.customerName || "—"}</p>
          {est.customerAddress && <p className="text-sm text-muted-foreground whitespace-pre-line">{est.customerAddress}</p>}
          {est.customerGstin && <p className="text-sm text-muted-foreground">GSTIN: {est.customerGstin}</p>}
          {est.customerPhone && <p className="text-sm text-muted-foreground">Ph: {est.customerPhone}</p>}
        </div>
        <div className="text-right space-y-1">
          <div className="flex justify-end gap-3">
            <span className="text-muted-foreground text-sm">Estimate #</span>
            <span className="font-semibold">{est.estimateNumber}</span>
          </div>
          <div className="flex justify-end gap-3">
            <span className="text-muted-foreground text-sm">Date</span>
            <span>{d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
          </div>
          {est.validUntil && (
            <div className="flex justify-end gap-3">
              <span className="text-muted-foreground text-sm">Valid Until</span>
              <span>{new Date(est.validUntil).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-8 py-5">
        <table className="w-full text-sm border-collapse [&_th]:border [&_td]:border [&_th]:border-foreground/80 [&_td]:border-foreground/80">
          <thead>
            <tr className="bg-muted/60 text-left">
              <th className="px-2 py-2 w-8 text-center">#</th>
              <th className="px-2 py-2">Product</th>
              <th className="px-2 py-2">Product ID</th>
              <th className="px-2 py-2">HSN</th>
              <th className="px-2 py-2 text-right">Price</th>
              <th className="px-2 py-2 text-right">Disc%</th>
              <th className="px-2 py-2 text-right">Qty</th>
              <th className="px-2 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {est.items.map((it, idx) => (
              <tr key={idx}>
                <td className="px-2 py-2 text-center text-muted-foreground">{idx + 1}</td>
                <td className="px-2 py-2 font-medium">{it.name}</td>
                <td className="px-2 py-2 text-xs">{it.productId || "—"}</td>
                <td className="px-2 py-2 text-xs">{it.hsn || "—"}</td>
                <td className="px-2 py-2 text-right">{fmtINR(it.price)}</td>
                <td className="px-2 py-2 text-right">{it.discount.toFixed(1)}%</td>
                <td className="px-2 py-2 text-right">{it.quantity}</td>
                <td className="px-2 py-2 text-right font-semibold">{fmtINR(it.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-8 pb-6 grid grid-cols-2 gap-6">
        <div className="self-end space-y-3">
          <div className="text-xs text-muted-foreground">
            Total Items / Qty: {est.items.length} / {est.items.reduce((s, i) => s + i.quantity, 0)}
          </div>
          <div className="rounded-md border-2 p-3" style={{ borderColor: "#2a179e", background: "rgba(42,23,158,0.06)" }}>
            <div className="uppercase tracking-wider text-[11px] font-semibold mb-1" style={{ color: "#2a179e" }}>
              Amount in Words
            </div>
            <div className="text-base font-bold leading-snug" style={{ color: "#2a179e" }}>
              {amountInWords(rounded)}
            </div>
          </div>
          {est.notes && (
            <div className="text-sm">
              <div className="uppercase tracking-wider text-[11px] font-semibold mb-1 text-muted-foreground">Notes / Terms</div>
              <p className="whitespace-pre-line">{est.notes}</p>
            </div>
          )}
        </div>
        <div className="space-y-2 text-sm">
          <DocRow label="Subtotal" value={fmtINR(est.subtotal)} />
          <DocRow label="Total Discount" value={`− ${fmtINR(est.totalDiscount)}`} muted />
          <DocRow label="Taxable Value" value={fmtINR(est.taxable)} />
          <DocRow label={`CGST @ ${halfRate}%`} value={fmtINR(cgst)} />
          <DocRow label={`SGST @ ${halfRate}%`} value={fmtINR(sgst)} />
          <DocRow label="Round Off" value={`${roundOff >= 0 ? "+" : "−"} ${fmtINR(Math.abs(roundOff))}`} muted />
          <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-foreground/10">
            <span className="font-semibold text-base">Estimated Total</span>
            <span className="font-bold text-lg" style={{ color: "#2a179e" }}>{fmtINR(rounded)}</span>
          </div>
        </div>
      </div>

      <div className="px-8 pt-6 pb-4 flex justify-end">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide">For {COMPANY.name}</p>
          <div className="mt-2 mx-auto w-32 h-32 border-2 border-foreground/80 rounded" />
          <p className="mt-2 text-sm">Authorised Signatory</p>
        </div>
      </div>

      <div className="px-8 py-4 border-t border-border text-center text-xs text-muted-foreground">
        This is an estimate only. Prices and availability are subject to change.
      </div>
    </div>
  );
}

function DocRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={muted ? "text-muted-foreground" : ""}>{value}</span>
    </div>
  );
}
