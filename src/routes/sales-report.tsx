import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchBills, fetchPurchases, fmtINR, type Bill, type Purchase } from "@/lib/storage";
import { filterByDate, exportExcel, generateReportPDF, type DateFilter, type PdfReportLine } from "@/lib/report-utils";
import { FileDown, FileSpreadsheet, Search, Package } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/sales-report")({
  head: () => ({
    meta: [
      { title: "Sales Report — Bee Square" },
      { name: "description", content: "Sales report with daily, monthly and custom range filters, PDF and Excel export." },
    ],
  }),
  component: SalesReportPage,
});

function SalesReportPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [mode, setMode] = useState<DateFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [productQ, setProductQ] = useState("");

  useEffect(() => {
    fetchBills().then(setBills).catch((e) => toast.error(e.message));
    fetchPurchases().then(setPurchases).catch((e) => toast.error(e.message));
  }, []);

  const filtered = useMemo(() => {
    let rows = filterByDate(bills, mode, from, to);
    const s = q.trim().toLowerCase();
    if (s) {
      rows = rows.filter(
        (b) =>
          b.billNumber.toLowerCase().includes(s) ||
          (b.customerName ?? "").toLowerCase().includes(s) ||
          (b.customerPhone ?? "").toLowerCase().includes(s)
      );
    }
    return rows;
  }, [bills, mode, from, to, q]);

  const totals = useMemo(() => {
    let sub = 0, gst = 0, total = 0;
    filtered.forEach((b) => { sub += Number(b.taxable); gst += Number(b.gstAmount); total += Number(b.total); });
    return { sub, gst, total, cgst: gst / 2, sgst: gst / 2, igst: 0 };
  }, [filtered]);

  const productHistory = useMemo(() => {
    const s = productQ.trim().toLowerCase();
    if (!s) return null;
    const purchaseRows: Array<{ date: string; number: string; party: string; qty: number; price: number; total: number }> = [];
    const saleRows: Array<{ date: string; number: string; party: string; phone: string; qty: number; price: number; total: number }> = [];

    purchases.forEach((p) => {
      p.items.forEach((it) => {
        if (
          it.productId?.toLowerCase().includes(s) ||
          it.name?.toLowerCase().includes(s)
        ) {
          purchaseRows.push({
            date: p.date,
            number: p.purchaseNumber,
            party: p.supplierName ?? "—",
            qty: it.quantity,
            price: it.price,
            total: it.lineTotal,
          });
        }
      });
    });

    bills.forEach((b) => {
      b.items.forEach((it) => {
        if (
          it.productId?.toLowerCase().includes(s) ||
          it.name?.toLowerCase().includes(s)
        ) {
          saleRows.push({
            date: b.date,
            number: b.billNumber,
            party: b.customerName ?? "—",
            phone: b.customerPhone ?? "",
            qty: it.quantity,
            price: it.finalPrice,
            total: it.lineTotal,
          });
        }
      });
    });

    purchaseRows.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    saleRows.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    return { purchaseRows, saleRows };
  }, [productQ, bills, purchases]);

  const rangeLabel = () => {
    if (mode === "all") return "All time";
    if (mode === "daily") return `Today: ${new Date().toLocaleDateString("en-IN")}`;
    if (mode === "monthly") return `${new Date().toLocaleString("en-IN", { month: "long", year: "numeric" })}`;
    return from && to ? `${from} to ${to}` : "Custom range";
  };

  function toPdfLines(): PdfReportLine[] {
    return filtered.map((b) => ({
      date: b.date,
      number: b.billNumber,
      party: b.customerName ?? "—",
      phone: b.customerPhone ?? "",
      gstin: b.customerGstin ?? "",
      subtotal: Number(b.taxable),
      gst: Number(b.gstAmount),
      total: Number(b.total),
      items: b.items.map((it) => {
        const sub = it.finalPrice * it.quantity;
        const gstAmt = (sub * Number(b.gstRate)) / 100;
        return {
          name: it.name,
          partNo: it.productId,
          qty: it.quantity,
          price: it.finalPrice,
          gstPct: Number(b.gstRate),
          gstAmt,
          total: sub + gstAmt,
        };
      }),
    }));
  }

  function handlePDF() {
    if (!filtered.length) return toast.error("No data to export");
    generateReportPDF({
      title: "Sales Report",
      partyLabel: "Buyer",
      range: rangeLabel(),
      lines: toPdfLines(),
      gstBreakup: { cgst: totals.cgst, sgst: totals.sgst, igst: totals.igst },
    });
  }

  function handleExcel() {
    if (!filtered.length) return toast.error("No data to export");
    const rows: Record<string, unknown>[] = [];
    filtered.forEach((b) => {
      b.items.forEach((it) => {
        const sub = it.finalPrice * it.quantity;
        const gstAmt = (sub * Number(b.gstRate)) / 100;
        rows.push({
          Date: new Date(b.date).toLocaleDateString("en-IN"),
          "Bill Number": b.billNumber,
          Buyer: b.customerName ?? "",
          Phone: b.customerPhone ?? "",
          Product: it.name,
          "Part No": it.productId,
          Qty: it.quantity,
          "Price (excl. GST)": it.finalPrice,
          "GST %": Number(b.gstRate),
          "GST Amount": gstAmt,
          Total: sub + gstAmt,
        });
      });
    });
    rows.push({});
    rows.push({ Product: "TOTAL", "Price (excl. GST)": totals.sub, "GST Amount": totals.gst, Total: totals.total });
    exportExcel(`Sales_Report_${Date.now()}.xlsx`, "Sales", rows);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Sales Report</h2>
          <p className="text-sm text-muted-foreground">Auto-fetched from saved bills.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExcel}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</Button>
          <Button onClick={handlePDF}><FileDown className="h-4 w-4 mr-2" />PDF</Button>
        </div>
      </div>

      <Card className="p-4 space-y-2">
        <Label className="flex items-center gap-2"><Package className="h-4 w-4" /> Product history — search by name or product ID</Label>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="e.g. BSE-001 or Bearing"
            value={productQ}
            onChange={(e) => setProductQ(e.target.value)}
          />
        </div>
        {productHistory && (
          <div className="grid gap-4 md:grid-cols-2 pt-2">
            <div>
              <div className="text-sm font-semibold mb-2">Purchases ({productHistory.purchaseRows.length})</div>
              <div className="border rounded overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Bill #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productHistory.purchaseRows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{new Date(r.date).toLocaleDateString("en-IN")}</TableCell>
                        <TableCell className="font-mono text-xs">{r.number}</TableCell>
                        <TableCell>{r.party}</TableCell>
                        <TableCell className="text-right">{r.qty}</TableCell>
                        <TableCell className="text-right">{fmtINR(r.price)}</TableCell>
                      </TableRow>
                    ))}
                    {!productHistory.purchaseRows.length && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">No purchase records.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold mb-2">Sales ({productHistory.saleRows.length})</div>
              <div className="border rounded overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Bill #</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productHistory.saleRows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{new Date(r.date).toLocaleDateString("en-IN")}</TableCell>
                        <TableCell className="font-mono text-xs">{r.number}</TableCell>
                        <TableCell>{r.party}</TableCell>
                        <TableCell>{r.phone || "—"}</TableCell>
                        <TableCell className="text-right">{r.qty}</TableCell>
                        <TableCell className="text-right">{fmtINR(r.price)}</TableCell>
                      </TableRow>
                    ))}
                    {!productHistory.saleRows.length && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">No sale records.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </Card>

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
        <div>
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} disabled={mode !== "custom"} />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} disabled={mode !== "custom"} />
        </div>
        <div className="md:col-span-2">
          <Label>Search</Label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Bill #, buyer name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Bills</div><div className="text-lg font-semibold">{filtered.length}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Without GST</div><div className="text-lg font-semibold">{fmtINR(totals.sub)}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">CGST</div><div className="text-lg font-semibold">{fmtINR(totals.cgst)}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">SGST</div><div className="text-lg font-semibold">{fmtINR(totals.sgst)}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Grand Total</div><div className="text-lg font-semibold">{fmtINR(totals.total)}</div></Card>
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Bill #</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Without GST</TableHead>
              <TableHead className="text-right">GST</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((b) => (
              <TableRow key={b.id}>
                <TableCell>{new Date(b.date).toLocaleDateString("en-IN")}</TableCell>
                <TableCell className="font-mono text-xs">{b.billNumber}</TableCell>
                <TableCell>{b.customerName ?? "—"}</TableCell>
                <TableCell>{b.customerPhone ?? "—"}</TableCell>
                <TableCell className="text-right">{b.items.length}</TableCell>
                <TableCell className="text-right">{fmtINR(Number(b.taxable))}</TableCell>
                <TableCell className="text-right">{fmtINR(Number(b.gstAmount))}</TableCell>
                <TableCell className="text-right font-semibold">{fmtINR(Number(b.total))}</TableCell>
              </TableRow>
            ))}
            {!filtered.length && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No bills match the current filter.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
