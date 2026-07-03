import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Bill,
  BillItem,
  Buyer,
  LOW_STOCK_THRESHOLD,
  Product,
  calcFinalPrice,
  createBill,
  fetchBuyers,
  fetchProducts,
  fmtINR,
  nextBillNumber,
} from "@/lib/storage";
import { Invoice } from "@/components/Invoice";
import { Plus, Trash2, Printer, FileDown, Save, Search, Users, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: BillingPage,
});

type Draft = BillItem & { uid: string };

function BillingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [items, setItems] = useState<Draft[]>([]);
  const [search, setSearch] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const [gstRate, setGstRate] = useState(18);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [savedBill, setSavedBill] = useState<Bill | null>(null);
  const [buyerDialogOpen, setBuyerDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Bank / UPI defaults persist locally so they auto-fill every bill, but stay editable.
  const [bankAccountHolder, setBankAccountHolder] = useState("BEE SQUARE ENTERPRISES");
  const [bankName, setBankName] = useState("UCO BANK");
  const [bankAccountNumber, setBankAccountNumber] = useState("20100210003497");
  const [bankIfsc, setBankIfsc] = useState("UCBA0002010");
  const [upiId, setUpiId] = useState("beesquareenterprises@uco");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bsq.payment");
      if (raw) {
        const p = JSON.parse(raw);
        setBankAccountHolder(p.bankAccountHolder || "BEE SQUARE ENTERPRISES");
        setBankName(p.bankName || "UCO BANK");
        setBankAccountNumber(p.bankAccountNumber || "20100210003497");
        setBankIfsc(p.bankIfsc || "UCBA0002010");
        setUpiId(p.upiId || "beesquareenterprises@uco");
      }
    } catch { /* ignore */ }
  }, []);

  function savePaymentDefaults() {
    localStorage.setItem(
      "bsq.payment",
      JSON.stringify({ bankAccountHolder, bankName, bankAccountNumber, bankIfsc, upiId })
    );
    toast.success("Payment details saved as default");
  }

  async function loadAll() {
    try {
      const [p, b] = await Promise.all([fetchProducts(), fetchBuyers()]);
      setProducts(p);
      setBuyers(b);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load data");
    }
  }

  useEffect(() => {
    loadAll();
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

  const lowStock = products.filter((p) => p.quantity < LOW_STOCK_THRESHOLD);

  function addProduct(p: Product) {
    if (p.quantity <= 0) {
      toast.error(`${p.name} is out of stock`);
      return;
    }
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

  function updateQty(uid: string, qty: number) {
    const q = Math.max(1, Math.floor(qty || 1));
    setItems((prev) =>
      prev.map((i) => (i.uid === uid ? { ...i, quantity: q, lineTotal: +(i.finalPrice * q).toFixed(2) } : i))
    );
  }

  function updateDiscount(uid: string, disc: number) {
    const d = Math.max(0, Math.min(100, isFinite(disc) ? disc : 0));
    setItems((prev) =>
      prev.map((i) => {
        if (i.uid !== uid) return i;
        const finalPrice = calcFinalPrice(i.price, d);
        return { ...i, discount: d, finalPrice, lineTotal: +(finalPrice * i.quantity).toFixed(2) };
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

  async function saveBill() {
    if (items.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    // Stock check
    for (const it of items) {
      const p = products.find((x) => x.productId === it.productId);
      if (!p || p.quantity < it.quantity) {
        toast.error(`Insufficient stock for ${it.name} (have ${p?.quantity ?? 0}, need ${it.quantity})`);
        return;
      }
    }

    setSaving(true);
    try {
      const billNumber = await nextBillNumber();
      const bill = await createBill({
        billNumber,
        date: new Date().toISOString(),
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        customerGstin: customerGstin.trim() || undefined,
        items: items.map(({ uid: _uid, ...rest }) => rest),
        ...totals,
        gstRate,
        bankAccountHolder: bankAccountHolder.trim() || undefined,
        bankAccountNumber: bankAccountNumber.trim() || undefined,
        bankIfsc: bankIfsc.trim() || undefined,
        bankName: bankName.trim() || undefined,
        upiId: upiId.trim() || undefined,
      });
      setSavedBill(bill);
      toast.success(`Bill ${bill.billNumber} saved`);
      await loadAll(); // refresh stock
      setTimeout(() => {
        document.getElementById("invoice-print")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save bill");
    } finally {
      setSaving(false);
    }
  }

  function newBill() {
    setItems([]);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setCustomerGstin("");
    setSavedBill(null);
  }

  return (
    <div className="space-y-6">
      {!savedBill && (
        <>
          {lowStock.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Low stock alert</AlertTitle>
              <AlertDescription>
                {lowStock.length} product{lowStock.length > 1 ? "s have" : " has"} less than {LOW_STOCK_THRESHOLD} units:{" "}
                {lowStock
                  .slice(0, 4)
                  .map((p) => `${p.name} (${p.quantity})`)
                  .join(", ")}
                {lowStock.length > 4 && ` and ${lowStock.length - 4} more`}.{" "}
                <Link to="/products" className="underline font-medium">
                  Restock →
                </Link>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Create Bill</h1>
              <p className="text-sm text-muted-foreground">Search products, add items, generate invoice.</p>
            </div>
            {products.length === 0 && (
              <Link to="/products" className="text-sm text-primary hover:underline">
                Add your first product →
              </Link>
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
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setShowSuggest(true);
                    }}
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
                            <div className="text-xs text-muted-foreground">
                              {p.productId} • Stock: <span className={p.quantity < LOW_STOCK_THRESHOLD ? "text-destructive font-semibold" : ""}>{p.quantity}</span>
                            </div>
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
                    No items yet. Search and add products above.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Rate/unit</TableHead>
                        <TableHead className="text-right w-20">Disc %</TableHead>
                        <TableHead className="text-right w-24">Qty</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((it) => {
                        const stock = products.find((p) => p.productId === it.productId)?.quantity ?? 0;
                        const over = it.quantity > stock;
                        return (
                          <TableRow key={it.uid}>
                            <TableCell>
                              <div className="font-medium">{it.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {it.productId} • Stock: {stock}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div>{fmtINR(it.finalPrice)}</div>
                              {it.discount > 0 && (
                                <div className="text-xs text-muted-foreground line-through">{fmtINR(it.price)}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                value={it.discount || ""}
                                onChange={(e) => updateDiscount(it.uid, parseFloat(e.target.value) || 0)}
                                className="w-20 text-right ml-auto"
                                placeholder="0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={1}
                                value={it.quantity}
                                onChange={(e) => updateQty(it.uid, parseInt(e.target.value))}
                                className={`w-20 text-right ml-auto ${over ? "border-destructive" : ""}`}
                              />
                            </TableCell>
                            <TableCell className="text-right font-semibold">{fmtINR(it.lineTotal)}</TableCell>
                            <TableCell>
                              <Button size="icon" variant="ghost" onClick={() => removeItem(it.uid)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="shadow-[var(--shadow-card)]">
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-lg">Buyer</CardTitle>
                  <Dialog open={buyerDialogOpen} onOpenChange={setBuyerDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Users className="h-4 w-4" /> Saved Buyers
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Saved Buyers</DialogTitle>
                        <DialogDescription>
                          Pick a buyer to autofill, or manage them on the Buyers tab.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="max-h-80 overflow-y-auto space-y-2">
                        {buyers.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            No saved buyers yet.{" "}
                            <Link
                              to="/buyers"
                              className="text-primary underline"
                              onClick={() => setBuyerDialogOpen(false)}
                            >
                              Add one →
                            </Link>
                          </p>
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
                      <Link
                        to="/buyers"
                        onClick={() => setBuyerDialogOpen(false)}
                        className="text-sm text-primary hover:underline"
                      >
                        Manage buyers →
                      </Link>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="cn">Name</Label>
                    <Input id="cn" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="cp">Phone</Label>
                    <Input id="cp" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="cg">GSTIN</Label>
                    <Input id="cg" value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="ca">Address</Label>
                    <Textarea
                      id="ca"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-[var(--shadow-card)]">
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-lg">Payment Details</CardTitle>
                  <Button size="sm" variant="ghost" onClick={savePaymentDefaults} type="button">
                    <Save className="h-4 w-4" /> Save default
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground -mt-1">
                    Printed on the invoice with an auto-generated UPI QR code.
                  </p>
                  <div>
                    <Label htmlFor="bah">Account Holder</Label>
                    <Input id="bah" value={bankAccountHolder} onChange={(e) => setBankAccountHolder(e.target.value)} placeholder="Bee Square Enterprises" />
                  </div>
                  <div>
                    <Label htmlFor="bn">Bank Name</Label>
                    <Input id="bn" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. HDFC Bank" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="ban">Account No.</Label>
                      <Input id="ban" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="bif">IFSC</Label>
                      <Input id="bif" value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value.toUpperCase())} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="upi">UPI ID</Label>
                    <Input id="upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@bank" />
                    <p className="text-[11px] text-muted-foreground mt-1">QR code is auto-generated from this UPI ID.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-[var(--shadow-card)]">
                <CardHeader>
                  <CardTitle className="text-lg">Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row label="Subtotal" value={fmtINR(totals.subtotal)} />
                  <Row label="Discount" value={`− ${fmtINR(totals.totalDiscount)}`} muted />
                  <Row label="Taxable" value={fmtINR(totals.taxable)} />
                  <div className="flex items-center justify-between">
                    <Label htmlFor="gst" className="text-muted-foreground">GST %</Label>
                    <Input
                      id="gst"
                      type="number"
                      min={0}
                      max={100}
                      step="0.5"
                      value={gstRate}
                      onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                      className="w-20 h-8 text-right"
                    />
                  </div>
                  <Row label="GST Amount" value={fmtINR(totals.gstAmount)} />
                  <div className="flex justify-between items-center pt-3 border-t border-border mt-2">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-xl" style={{ color: "var(--primary)" }}>
                      {fmtINR(totals.total)}
                    </span>
                  </div>
                  <Button onClick={saveBill} disabled={saving} className="w-full mt-2" size="lg">
                    <Save className="h-4 w-4" /> {saving ? "Saving…" : "Generate Bill"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {savedBill && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 no-print">
            <div>
              <h1 className="text-2xl font-bold">Invoice Generated</h1>
              <p className="text-sm text-muted-foreground">Bill #{savedBill.billNumber}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={newBill}>
                <Plus className="h-4 w-4" /> New Bill
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <FileDown className="h-4 w-4" /> Save as PDF
              </Button>
              <Button onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print
              </Button>
            </div>
          </div>
          <Invoice bill={savedBill} />
        </div>
      )}
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
