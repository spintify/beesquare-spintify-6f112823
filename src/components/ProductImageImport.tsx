import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ImagePlus, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { extractProductsFromImage } from "@/lib/product-extract.functions";
import { upsertProductByProductId } from "@/lib/storage";

type Row = { name: string; productId: string; hsn: string; mrp: string; quantity: string };

const GST_RATE = 18;

export function ProductImageImport({ onImported }: { onImported: () => void | Promise<void> }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const extract = useServerFn(extractProductsFromImage);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image too large. Please use an image under 8MB.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(new Error("Could not read the image"));
      fr.readAsDataURL(file);
    });

    setPreview(dataUrl);
    setRows([]);
    setOpen(true);
    setBusy(true);
    try {
      const res = await extract({ data: { imageDataUrl: dataUrl } });
      if (!res.products.length) {
        toast.error("No products detected in this image.");
      }
      setRows(
        res.products.map((p) => ({
          name: p.name,
          productId: p.productId,
          hsn: p.hsn ?? "",
          mrp: String(p.mrp || ""),
          quantity: String(p.quantity ?? 0),
        }))
      );
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || "Failed to extract products");
    } finally {
      setBusy(false);
    }
  }

  function update(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function save() {
    const valid = rows.filter((r) => r.name.trim() && r.productId.trim() && parseFloat(r.mrp) >= 0 && r.mrp !== "");
    if (!valid.length) {
      toast.error("Nothing to add — each row needs a name, ID and price.");
      return;
    }
    setSaving(true);
    let ok = 0;
    for (const r of valid) {
      try {
        const mrp = parseFloat(r.mrp);
        await upsertProductByProductId({
          name: r.name.trim(),
          productId: r.productId.trim(),
          hsn: r.hsn.trim() || undefined,
          price: +(mrp / (1 + GST_RATE / 100)).toFixed(2),
          discount: 0,
          quantityToAdd: Math.max(0, Math.floor(parseFloat(r.quantity || "0") || 0)),
        });
        ok++;
      } catch (err) {
        console.error(err);
      }
    }
    setSaving(false);
    await onImported();
    setOpen(false);
    setRows([]);
    setPreview(null);
    if (ok) toast.success(`Added / updated ${ok} product${ok > 1 ? "s" : ""}`);
    if (ok < valid.length) toast.error(`${valid.length - ok} row(s) failed to save`);
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />
      <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
        <ImagePlus className="h-4 w-4" /> Scan Image
      </Button>

      <Dialog open={open} onOpenChange={(o) => !busy && !saving && setOpen(o)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Products from image
            </DialogTitle>
            <DialogDescription>
              Review and edit the extracted rows, then add them to your inventory. Prices are treated as MRP (incl. {GST_RATE}% GST).
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <img src={preview} alt="Uploaded product list preview" className="max-h-32 w-auto rounded-md border object-contain" />
          )}

          {busy ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Reading the image…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No rows detected. Try a clearer photo.</div>
          ) : (
            <div className="max-h-[45vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-32">Product ID</TableHead>
                    <TableHead className="w-24">HSN</TableHead>
                    <TableHead className="w-28">MRP</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Input value={r.name} onChange={(e) => update(i, { name: e.target.value })} />
                      </TableCell>
                      <TableCell>
                        <Input value={r.productId} onChange={(e) => update(i, { productId: e.target.value })} />
                      </TableCell>
                      <TableCell>
                        <Input value={r.hsn} onChange={(e) => update(i, { hsn: e.target.value })} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" step="0.01" value={r.mrp} onChange={(e) => update(i, { mrp: e.target.value })} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min={0} step="1" value={r.quantity} onChange={(e) => update(i, { quantity: e.target.value })} />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                          aria-label="Remove row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy || saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy || saving || rows.length === 0}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Add {rows.length ? `${rows.length} ` : ""}product{rows.length === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
