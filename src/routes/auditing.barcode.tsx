import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SectionCard } from "@/features/auditing/components/SectionCard";
import { VarianceBadge } from "@/features/auditing/components/Badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PARTS, warehouseName } from "@/features/auditing/data/seed";
import { ScanLine, QrCode, KeyboardMusic } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auditing/barcode")({
  head: () => ({ meta: [{ title: "Barcode Scanner — Spintify Auditing" }] }),
  component: BarcodePage,
});

function BarcodePage() {
  const [mode, setMode] = useState<"barcode" | "qr" | "manual">("barcode");
  const [input, setInput] = useState("");
  const [physical, setPhysical] = useState<number>(0);
  const [history, setHistory] = useState<string[]>([]);

  const part = useMemo(() => {
    const s = input.trim();
    if (!s) return null;
    return PARTS.find((p) => p.barcode === s || p.partNumber.toLowerCase() === s.toLowerCase() || p.oemCode.toLowerCase() === s.toLowerCase()) ?? null;
  }, [input]);

  function scanSim() {
    const p = PARTS[Math.floor(Math.random() * PARTS.length)];
    setInput(p.barcode);
    setHistory((h) => [p.barcode, ...h].slice(0, 6));
    toast.success(`Scanned ${p.partNumber}`);
  }

  const diff = part ? physical - part.systemQty : 0;
  const status = !part
    ? null
    : physical === part.systemQty
      ? "Verified"
      : physical === 0
        ? "Missing"
        : physical > part.systemQty
          ? "Extra Stock"
          : "Mismatch";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-blue-950">Barcode Scanner</h1>
        <p className="text-sm text-muted-foreground">Scan or key-in a barcode / part / OEM code to compare against stock.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Scan input">
          <div className="mb-3 flex gap-2">
            <Button variant={mode === "barcode" ? "default" : "outline"} size="sm" onClick={() => setMode("barcode")}><ScanLine className="mr-1.5 h-4 w-4" /> Barcode</Button>
            <Button variant={mode === "qr" ? "default" : "outline"} size="sm" onClick={() => setMode("qr")}><QrCode className="mr-1.5 h-4 w-4" /> QR</Button>
            <Button variant={mode === "manual" ? "default" : "outline"} size="sm" onClick={() => setMode("manual")}><KeyboardMusic className="mr-1.5 h-4 w-4" /> Manual</Button>
          </div>
          <div className="rounded-xl border border-dashed border-blue-200 bg-gradient-to-br from-sky-50/50 to-blue-50/40 p-6 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white shadow-sm">
              {mode === "qr" ? <QrCode className="h-8 w-8 text-blue-700" /> : mode === "manual" ? <KeyboardMusic className="h-8 w-8 text-blue-700" /> : <ScanLine className="h-8 w-8 text-blue-700" />}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {mode === "manual" ? "Type barcode / part number / OEM below" : "Point the scanner or press Simulate."}
            </p>
            <div className="mt-4 flex gap-2">
              <Input autoFocus value={input} onChange={(e) => setInput(e.target.value)} placeholder="Barcode / Part / OEM" className="text-center font-mono" />
              <Button onClick={scanSim} variant="outline">Simulate</Button>
            </div>
            {history.length > 0 && (
              <div className="mt-3 text-left text-xs text-muted-foreground">
                Recent:
                {history.map((h) => (
                  <button key={h} onClick={() => setInput(h)} className="ml-2 rounded bg-white px-1.5 py-0.5 font-mono ring-1 ring-blue-100 hover:bg-blue-50">
                    {h}
                  </button>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Match preview">
          {!part ? (
            <div className="grid h-48 place-items-center text-sm text-muted-foreground">Awaiting scan…</div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="text-lg font-semibold text-blue-950">{part.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{part.partNumber} · OEM {part.oemCode}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Warehouse" value={warehouseName(part.warehouseId)} />
                <Field label="Location" value={`${part.location} / ${part.bin}`} />
                <Field label="Brand" value={part.brand} />
                <Field label="Category" value={part.category} />
                <Field label="System stock" value={<span className="tabular-nums">{part.systemQty}</span>} />
                <Field label="Barcode" value={<span className="font-mono">{part.barcode}</span>} />
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-blue-900">Enter physical count</span>
                  {status && <VarianceBadge status={status} />}
                </div>
                <div className="flex items-center gap-3">
                  <Input type="number" className="w-32 text-right tabular-nums" value={physical} onChange={(e) => setPhysical(Number(e.target.value) || 0)} />
                  <div className={`text-sm font-semibold tabular-nums ${diff === 0 ? "text-emerald-600" : diff > 0 ? "text-amber-600" : "text-rose-600"}`}>
                    Δ {diff > 0 ? `+${diff}` : diff}
                  </div>
                  <Button size="sm" onClick={() => toast.success("Count recorded")}>Record</Button>
                </div>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white/70 px-3 py-2 ring-1 ring-blue-100">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm text-blue-950">{value}</div>
    </div>
  );
}
