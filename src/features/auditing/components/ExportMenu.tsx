import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { toast } from "sonner";

export function ExportMenu({ rows, filename }: { rows: Record<string, unknown>[]; filename: string }) {
  function toCSV() {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  }
  function download(name: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-1.5 h-4 w-4" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            download(`${filename}.csv`, toCSV(), "text/csv");
            toast.success("CSV exported");
          }}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            download(`${filename}.xls`, toCSV(), "application/vnd.ms-excel");
            toast.success("Excel exported");
          }}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            window.print();
          }}
        >
          <Printer className="mr-2 h-4 w-4" /> Print
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            window.print();
            toast.info("Use system dialog to save as PDF");
          }}
        >
          <FileText className="mr-2 h-4 w-4" /> PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
