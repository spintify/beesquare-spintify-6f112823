import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SectionCard } from "@/features/auditing/components/SectionCard";
import { DataTable, type Column } from "@/features/auditing/components/DataTable";
import { ExportMenu } from "@/features/auditing/components/ExportMenu";
import { Button } from "@/components/ui/button";
import { DEALERS, OEM_RECORDS, partById } from "@/features/auditing/data/seed";
import type { OemRecord } from "@/features/auditing/data/types";
import { toast } from "sonner";
import { GitCompareArrows } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/auditing/oem")({
  head: () => ({ meta: [{ title: "OEM Verification — Spintify Auditing" }] }),
  component: OemPage,
});

function OemPage() {
  const [dealer, setDealer] = useState<string>(DEALERS[0].id);

  const rows = OEM_RECORDS;
  const cols: Column<OemRecord>[] = [
    { key: "pn", header: "Part", cell: (r) => <span className="font-mono text-xs">{partById(r.partId)?.partNumber}</span> },
    { key: "name", header: "Name", cell: (r) => partById(r.partId)?.name },
    {
      key: "price",
      header: "Price (D / O / S)",
      cell: (r) => {
        const diff = r.dealer.price !== r.oem.price;
        return (
          <span className={`tabular-nums text-xs ${diff ? "font-semibold text-rose-600" : ""}`}>
            ₹{r.dealer.price} / ₹{r.oem.price} / ₹{r.system.price}
          </span>
        );
      },
    },
    {
      key: "stock",
      header: "Stock (D / O / S)",
      cell: (r) => {
        const diff = r.dealer.stock !== r.oem.stock;
        return (
          <span className={`tabular-nums text-xs ${diff ? "font-semibold text-amber-600" : ""}`}>
            {r.dealer.stock} / {r.oem.stock} / {r.system.stock}
          </span>
        );
      },
    },
    { key: "inv", header: "Invoice / OEM", cell: (r) => <span className="font-mono text-[11px]">{r.dealer.invoiceNo} · {r.oem.invoiceNo}</span> },
    {
      key: "gst",
      header: "GST",
      cell: (r) => (
        <span className={`text-xs ${r.dealer.gst !== r.oem.gst ? "font-semibold text-rose-600" : ""}`}>
          {r.dealer.gst}% / {r.oem.gst}%
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-950">OEM Verification</h1>
          <p className="text-sm text-muted-foreground">Cross-reference dealer, OEM and system records to detect discrepancies.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dealer} onValueChange={setDealer}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>{DEALERS.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" onClick={() => toast.success("Reconciliation report generated")}>
            <GitCompareArrows className="mr-1.5 h-4 w-4" /> Generate report
          </Button>
          <ExportMenu
            filename="oem-verification"
            rows={rows.map((r) => ({
              part: partById(r.partId)?.partNumber,
              dealerPrice: r.dealer.price,
              oemPrice: r.oem.price,
              systemPrice: r.system.price,
              dealerStock: r.dealer.stock,
              oemStock: r.oem.stock,
              systemStock: r.system.stock,
            }))}
          />
        </div>
      </div>

      <SectionCard title={`Comparison — ${DEALERS.find((d) => d.id === dealer)?.name}`}>
        <DataTable
          rows={rows}
          columns={cols}
          rowKey={(r) => r.partId}
          pageSize={10}
          highlightRow={(r) => r.dealer.price !== r.oem.price || r.dealer.stock !== r.oem.stock}
        />
      </SectionCard>
    </div>
  );
}
