import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Download, FileSpreadsheet, Pencil, Plus, ScanLine, Search, Trash2, Upload } from "lucide-react";
import {
  CatalogPart,
  LOW_STOCK_THRESHOLD,
  Product,
  calcFinalPrice,
  deleteProduct,
  fetchProducts,
  findCatalogPart,
  fmtINR,
  loadCatalog,
  saveCatalog,
  updateProduct,
  upsertProductByProductId,
} from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Library } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { ProductImageImport } from "@/components/ProductImageImport";


export const Route = createFileRoute("/products")({
  component: ProductsPage,
  head: () => ({ meta: [{ title: "Products — Bee Square Enterprises" }] }),
});

const empty = { name: "", productId: "", hsn: "", price: "", discount: "", quantity: "1" };
const GST_RATE = 18;

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ ...empty });
  
  const [editId, setEditId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const catalogFileRef = useRef<HTMLInputElement>(null);
  const [catalog, setCatalog] = useState<CatalogPart[]>([]);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    setCatalog(loadCatalog());
  }, []);

  function autofillFromCatalog(query: string) {
    if (editId) return;
    const part = findCatalogPart(query);
    if (!part) return;
    setForm((f) => ({
      ...f,
      name: part.name,
      productId: part.productId,
      hsn: part.hsn || f.hsn,
      price: String(part.price),
      discount: f.discount || String(part.discount ?? 0),
    }));
    
    toast.success(`Loaded "${part.name}" from catalog`);
  }

  async function handleCatalogFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const norm = (k: string) => k.toString().trim().toLowerCase().replace(/[\s_-]/g, "");
      const pick = (row: Record<string, unknown>, keys: string[]) => {
        for (const k of Object.keys(row)) if (keys.includes(norm(k))) return row[k];
        return undefined;
      };
      const parts: CatalogPart[] = [];
      for (const row of rows) {
        const name = String(pick(row, ["name", "productname"]) ?? "").trim();
        const productId = String(pick(row, ["productid", "sku", "id"]) ?? "").trim();
        const hsn = String(pick(row, ["hsn", "hsncode", "hsnsac"]) ?? "").trim();
        const price = parseFloat(String(pick(row, ["price", "mrp", "rate"]) ?? ""));
        const discount = parseFloat(String(pick(row, ["discount", "disc"]) ?? "0"));
        if (!name || !productId || isNaN(price)) continue;
        parts.push({ name, productId, hsn: hsn || undefined, price, discount: isNaN(discount) ? 0 : discount });
      }
      saveCatalog(parts);
      setCatalog(parts);
      toast.success(`Catalog loaded: ${parts.length} parts. Type a name or ID to autofill.`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to read catalog file");
    } finally {
      if (catalogFileRef.current) catalogFileRef.current.value = "";
    }
  }

  async function refresh() {
    try {
      setProducts(await fetchProducts());
    } catch (e) {
      console.error(e);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["name", "productId", "hsn", "mrp"],
      ["Type-C Cable", "SKU-001", "8544", 235],
      ["USB Charger", "SKU-002", "8504", 589],
    ]);
    ws["!cols"] = [{ wch: 28 }, { wch: 14 }, { wch: 10 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "products_template.xlsx");
  }

  function exportInventory(source: "all" | "filtered") {
    const sourceProducts = source === "filtered" ? filtered : products;
    if (!sourceProducts.length) {
      toast.error(source === "filtered" ? "No filtered products to export" : "No products to export");
      return;
    }
    const rows = sourceProducts.map((p) => ({
      Name: p.name,
      "Product ID": p.productId,
      HSN: p.hsn || "",
      "Base Price (excl. GST)": p.price,
      "MRP (incl. GST)": +(p.price * (1 + GST_RATE / 100)).toFixed(2),
      "Discount %": p.discount,
      "Final Price / unit": calcFinalPrice(p.price, p.discount),
      "Stock Qty": p.quantity,
      "Stock Value (MRP)": +(p.price * p.quantity).toFixed(2),
      "Stock Value (incl. GST)": +((p.price * (1 + GST_RATE / 100)) * p.quantity).toFixed(2),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 30 }, { wch: 16 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 18 }, { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `Inventory_Export_${source}_${Date.now()}.xlsx`);
    toast.success(`Exported ${rows.length} ${source === "filtered" ? "filtered" : ""} products`.trim());
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (!rows.length) {
        toast.error("Sheet is empty");
        return;
      }

      const norm = (k: string) => k.toString().trim().toLowerCase().replace(/[\s_-]/g, "");
      const pick = (row: Record<string, unknown>, keys: string[]) => {
        for (const k of Object.keys(row)) if (keys.includes(norm(k))) return row[k];
        return undefined;
      };

      // Parse all rows. MRP is GST-inclusive → divide by (1+GST) to store the base price.
      type NewRow = { name: string; product_id: string; hsn: string | null; price: number; discount: number; quantity: number };
      const parsed: NewRow[] = [];
      const seenInFile = new Set<string>();
      let skippedInvalid = 0;
      const issues: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = String(pick(row, ["name", "productname"]) ?? "").trim();
        const productId = String(pick(row, ["productid", "sku", "id"]) ?? "").trim();
        const hsn = String(pick(row, ["hsn", "hsncode", "hsnsac"]) ?? "").trim();
        const mrp = parseFloat(String(pick(row, ["mrp", "price", "rate"]) ?? ""));
        const discount = parseFloat(String(pick(row, ["discount", "discountpercentage", "disc"]) ?? "0"));

        if (!name || !productId) {
          skippedInvalid++;
          if (issues.length < 20) issues.push(`Row ${i + 2}: missing name/ID`);
          continue;
        }
        if (isNaN(mrp) || mrp < 0) {
          skippedInvalid++;
          if (issues.length < 20) issues.push(`Row ${i + 2}: invalid MRP`);
          continue;
        }
        const key = productId.toLowerCase();
        if (seenInFile.has(key)) {
          skippedInvalid++;
          continue;
        }
        seenInFile.add(key);

        const price = +(mrp / (1 + GST_RATE / 100)).toFixed(2);
        const disc = isNaN(discount) ? 0 : Math.max(0, Math.min(100, discount));
        parsed.push({
          name,
          product_id: productId,
          hsn: hsn || null,
          price,
          discount: disc,
          quantity: 0, // bulk import: always stock 0
        });
      }

      if (!parsed.length) {
        toast.error("No valid rows found");
        return;
      }

      toast.info(`Preparing ${parsed.length.toLocaleString()} products…`);

      // Fetch existing product_ids (paged) so we can skip duplicates safely
      const existing = new Set<string>();
      const pageSize = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("products")
          .select("product_id")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        for (const r of data) existing.add(String(r.product_id).toLowerCase());
        if (data.length < pageSize) break;
        from += pageSize;
      }

      const toInsert = parsed.filter((p) => !existing.has(p.product_id.toLowerCase()));
      const duplicateInDb = parsed.length - toInsert.length;

      // Batch insert
      const batchSize = 500;
      let inserted = 0;
      setImportProgress({ done: 0, total: toInsert.length });
      for (let i = 0; i < toInsert.length; i += batchSize) {
        const chunk = toInsert.slice(i, i + batchSize);
        const { error } = await supabase.from("products").insert(chunk);
        if (error) {
          console.error("Batch insert error", error);
          issues.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
          // fallback: insert one-by-one so a single bad row doesn't kill the batch
          for (const single of chunk) {
            const { error: e2 } = await supabase.from("products").insert(single);
            if (!e2) inserted++;
          }
        } else {
          inserted += chunk.length;
        }
        setImportProgress({ done: Math.min(i + batchSize, toInsert.length), total: toInsert.length });
        await new Promise((r) => setTimeout(r, 0));
      }

      setImportProgress(null);
      await refresh();
      toast.success(
        `Imported ${inserted.toLocaleString()} products` +
          (duplicateInDb ? `, ${duplicateInDb.toLocaleString()} already existed` : "") +
          (skippedInvalid ? `, ${skippedInvalid.toLocaleString()} invalid skipped` : "")
      );
      if (issues.length) console.warn("Import issues:", issues);
    } catch (err) {
      console.error(err);
      toast.error("Failed to import file. Use .xlsx, .xls or .csv");
      setImportProgress(null);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function reset() {
    setForm({ ...empty });
    setEditId(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const rawPrice = parseFloat(form.price);
    const discount = parseFloat(form.discount || "0");
    const quantity = Math.max(0, Math.floor(parseFloat(form.quantity || "0") || 0));
    if (!form.name.trim() || !form.productId.trim()) {
      toast.error("Name & Product ID required");
      return;
    }
    if (isNaN(rawPrice) || rawPrice < 0) {
      toast.error("Enter a valid price");
      return;
    }
    if (isNaN(discount) || discount < 0 || discount > 100) {
      toast.error("Discount 0–100%");
      return;
    }
    // MRP entered is GST-inclusive; store base price (GST will be added in the bill)
    const price = +(rawPrice / (1 + GST_RATE / 100)).toFixed(2);

    try {
      if (editId) {
        await updateProduct(editId, {
          name: form.name.trim(),
          productId: form.productId.trim(),
          hsn: form.hsn.trim() || undefined,
          price,
          discount,
          quantity,
        });
        toast.success("Product updated");
      } else {
        const existing = products.find(
          (p) => p.productId.toLowerCase() === form.productId.trim().toLowerCase()
        );
        await upsertProductByProductId({
          name: form.name.trim(),
          productId: form.productId.trim(),
          hsn: form.hsn.trim() || undefined,
          price,
          discount,
          quantityToAdd: quantity,
        });
        toast.success(
          existing
            ? `Stock increased by ${quantity}. Total now ${existing.quantity + quantity}.`
            : "Product added"
        );
      }
      await refresh();
      reset();
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || "Failed to save");
    }
  }

  function edit(p: Product) {
    setEditId(p.id);
    setForm({
      name: p.name,
      productId: p.productId,
      hsn: p.hsn || "",
      price: String(+(p.price * (1 + GST_RATE / 100)).toFixed(2)),
      discount: String(p.discount),
      quantity: String(p.quantity),
    });
  }

  async function del(id: string) {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteProduct(id);
      if (editId === id) reset();
      await refresh();
      toast.success("Deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete");
    }
  }

  // Realtime stock updates
  useEffect(() => {
    const channel = supabase
      .channel("products-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.productId.toLowerCase().includes(q.toLowerCase())
  );

  const lowStock = products.filter((p) => p.quantity < LOW_STOCK_THRESHOLD);

  const [topSearch, setTopSearch] = useState("");
  const topMatches = topSearch.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(topSearch.toLowerCase()) ||
          p.productId.toLowerCase().includes(topSearch.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-6">
      <Card className="shadow-[var(--shadow-card)]">
        <CardContent className="pt-6">
          <Label htmlFor="top-search" className="mb-2 block text-sm font-medium">
            Search your product
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="top-search"
              value={topSearch}
              onChange={(e) => setTopSearch(e.target.value)}
              placeholder="Type product name or ID to check availability..."
              className="pl-9"
            />
          </div>
          {topSearch.trim() && (
            <div className="mt-3">
              {topMatches.length === 0 ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Product not found</AlertTitle>
                  <AlertDescription>
                    No product matches "{topSearch}" in your inventory.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    {topMatches.length} match{topMatches.length > 1 ? "es" : ""} found:
                  </p>
                  {topMatches.slice(0, 5).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-medium">
                        {p.name}{" "}
                        <span className="text-muted-foreground text-xs">
                          ({p.productId})
                        </span>
                      </span>
                      <span
                        className={
                          p.quantity < LOW_STOCK_THRESHOLD
                            ? "text-destructive font-semibold"
                            : "font-semibold"
                        }
                      >
                        Stock: {p.quantity}
                      </span>
                    </div>
                  ))}
                  {topMatches.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      …and {topMatches.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && lowStock.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Low stock alert</AlertTitle>
          <AlertDescription>
            {lowStock.length} product{lowStock.length > 1 ? "s have" : " has"} less than {LOW_STOCK_THRESHOLD} units in stock:{" "}
            {lowStock
              .slice(0, 5)
              .map((p) => `${p.name} (${p.quantity})`)
              .join(", ")}
            {lowStock.length > 5 && ` and ${lowStock.length - 5} more`}.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-[400px_1fr] gap-6">
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <CardTitle className="text-lg">{editId ? "Edit Product" : "Add Product"}</CardTitle>
            <div className="flex flex-col items-end gap-1">
              <input
                ref={catalogFileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleCatalogFile}
              />
              <Button size="sm" variant="outline" type="button" onClick={() => catalogFileRef.current?.click()}>
                <Library className="h-4 w-4" /> {catalog.length ? `Catalog (${catalog.length})` : "Upload Catalog"}
              </Button>
              {catalog.length > 0 && (
                <span className="text-[10px] text-muted-foreground">Type name/ID to autofill</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  onBlur={(e) => autofillFromCatalog(e.target.value)}
                  list="catalog-names"
                  placeholder="e.g. Type-C Cable"
                />
                <datalist id="catalog-names">
                  {catalog.map((c) => (
                    <option key={c.productId} value={c.name}>{c.productId}</option>
                  ))}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="pid">Product ID</Label>
                  <Input
                    id="pid"
                    value={form.productId}
                    onChange={(e) => setForm({ ...form, productId: e.target.value })}
                    onBlur={(e) => autofillFromCatalog(e.target.value)}
                    list="catalog-ids"
                    placeholder="e.g. SKU-001"
                  />
                  <datalist id="catalog-ids">
                    {catalog.map((c) => (
                      <option key={c.productId} value={c.productId}>{c.name}</option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label htmlFor="hsn">HSN Code</Label>
                  <Input id="hsn" value={form.hsn} onChange={(e) => setForm({ ...form, hsn: e.target.value })} placeholder="e.g. 8544" />
                </div>
              </div>
              {!editId && form.productId && products.some((p) => p.productId.toLowerCase() === form.productId.trim().toLowerCase()) && (
                <p className="text-xs text-muted-foreground -mt-2">
                  Exists — quantity will be added to current stock.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="price">MRP / unit (₹, incl. {GST_RATE}% GST)</Label>
                  <Input id="price" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                  {form.price && !isNaN(parseFloat(form.price)) && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Base (excl. GST): {fmtINR(parseFloat(form.price) / (1 + GST_RATE / 100))}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="qty">{editId ? "Stock Quantity" : "Quantity to Add"}</Label>
                  <Input id="qty" type="number" min={0} step="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground -mt-2">Discounts (if any) can be applied per item while creating a bill.</p>
              {form.price && (() => {
                const basePrice = parseFloat(form.price) || 0;
                const qty = Math.max(0, Math.floor(parseFloat(form.quantity || "0") || 0));
                const net = +(basePrice * qty).toFixed(2);
                const grossWithGst = +(net * (1 + GST_RATE / 100)).toFixed(2);
                return (
                  <div className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">MRP / unit</span>
                      <span className="font-semibold">{fmtINR(basePrice)}</span>
                    </div>
                    {qty > 0 && (
                      <>
                        <div className="flex justify-between border-t border-border pt-1 mt-1">
                          <span className="text-muted-foreground">Subtotal for {qty}</span>
                          <span className="font-semibold text-foreground">{fmtINR(net)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>+ {GST_RATE}% GST → bill total</span>
                          <span>{fmtINR(grossWithGst)}</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  <Plus className="h-4 w-4" /> {editId ? "Update" : "Add Product"}
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
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Inventory ({products.length})</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFile}
              />
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={!!importProgress}>
                <Upload className="h-4 w-4" />
                {importProgress
                  ? `Importing ${importProgress.done.toLocaleString()}/${importProgress.total.toLocaleString()}`
                  : "Import"}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <FileSpreadsheet className="h-4 w-4" /> Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportInventory("all")}>
                    Export all inventory
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportInventory("filtered")}>
                    Export filtered results
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" variant="ghost" onClick={downloadTemplate}>
                <Download className="h-4 w-4" /> Template
              </Button>
              <ProductImageImport onImported={refresh} />
              <Button size="sm" variant="outline" onClick={() => setScanOpen(true)}>
                <ScanLine className="h-4 w-4" /> Scan
              </Button>

              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!loading && products.length > 0 && (() => {
              const inStock = products.filter((p) => p.quantity >= 1);
              const totalMRP = inStock.reduce((sum, p) => sum + p.price * p.quantity, 0);
              const totalWithGst = +(totalMRP * (1 + GST_RATE / 100)).toFixed(2);
              return (
                <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Inventory Value (incl. {GST_RATE}% GST)</p>
                    <p className="text-2xl font-bold text-primary">{fmtINR(totalWithGst)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total MRP Value</p>
                    <p className="text-sm font-semibold">{fmtINR(totalMRP)}</p>
                  </div>
                </div>
              );
            })()}
            {loading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                {products.length === 0 ? "No products yet. Add your first product →" : "No matches."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>HSN</TableHead>
                    <TableHead className="text-right">Price/unit</TableHead>
                    <TableHead className="text-right">Disc%</TableHead>
                    <TableHead className="text-right">Final/unit</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const low = p.quantity < LOW_STOCK_THRESHOLD;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{p.productId}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{p.hsn || "—"}</TableCell>
                        <TableCell className="text-right">{fmtINR(p.price)}</TableCell>
                        <TableCell className="text-right">{p.discount}%</TableCell>
                        <TableCell className="text-right font-semibold">{fmtINR(calcFinalPrice(p.price, p.discount))}</TableCell>
                        <TableCell className={`text-right font-semibold ${low ? "text-destructive" : ""}`}>
                          {p.quantity}
                          {low && <AlertTriangle className="inline h-3.5 w-3.5 ml-1 -mt-0.5" />}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => edit(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => del(p.id)}>
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
      </div>
      <BarcodeScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDetected={(code) => {
          setQ(code);
          setScanOpen(false);
          toast.success(`Scanned: ${code}`);
        }}
      />
    </div>
  );
}
