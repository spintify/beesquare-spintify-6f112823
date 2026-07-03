import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { COMPANY, fmtINR } from "./storage";

export type DateFilter = "all" | "daily" | "monthly" | "custom";

export function filterByDate<T extends { date: string }>(
  rows: T[],
  mode: DateFilter,
  from?: string,
  to?: string
): T[] {
  if (mode === "all") return rows;
  const now = new Date();
  let start: Date, end: Date;
  if (mode === "daily") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(start); end.setDate(end.getDate() + 1);
  } else if (mode === "monthly") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else {
    if (!from || !to) return rows;
    start = new Date(from);
    end = new Date(to); end.setDate(end.getDate() + 1);
  }
  return rows.filter((r) => {
    const d = new Date(r.date);
    return d >= start && d < end;
  });
}

export function exportExcel(filename: string, sheetName: string, rows: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

export type PdfReportLine = {
  date: string;
  number: string;
  party: string;
  phone: string;
  gstin?: string;
  items: Array<{
    name: string;
    partNo: string;
    qty: number;
    price: number;
    gstPct: number;
    gstAmt: number;
    total: number;
  }>;
  subtotal: number;
  gst: number;
  total: number;
};

// Plain rupee formatter for PDF — avoids the ₹ glyph which jsPDF's built-in
// helvetica font cannot render (shows as a black box). Uses "Rs." prefix.
function rs(n: number) {
  const v = Number(n) || 0;
  return "Rs. " + v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function generateReportPDF(opts: {
  title: string;
  partyLabel: string;
  range: string;
  lines: PdfReportLine[];
  gstBreakup?: { cgst: number; sgst: number; igst: number };
}) {
  // Landscape A4 — gives enough room for 7 columns + party header rows.
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 28;

  const drawHeader = () => {
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text(COMPANY.name, pageW / 2, 30, { align: "center" });
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(
      `${COMPANY.address}  |  GSTIN: ${COMPANY.gst}  |  Ph: ${COMPANY.phone}`,
      pageW / 2, 44, { align: "center" }
    );
    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text(opts.title, pageW / 2, 62, { align: "center" });
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(opts.range, pageW / 2, 76, { align: "center" });
    doc.setDrawColor(180);
    doc.line(margin, 84, pageW - margin, 84);
  };

  let totalSub = 0, totalGst = 0, totalAll = 0;
  const body: (string | number | { content: string; colSpan?: number; styles?: Record<string, unknown> })[][] = [];

  opts.lines.forEach((ln, i) => {
    totalSub += ln.subtotal; totalGst += ln.gst; totalAll += ln.total;
    body.push([
      {
        content: `#${i + 1}   ${new Date(ln.date).toLocaleDateString("en-IN")}   Bill: ${ln.number}   ${opts.partyLabel}: ${ln.party}${ln.phone ? "  (" + ln.phone + ")" : ""}${ln.gstin ? "   GSTIN: " + ln.gstin : ""}`,
        colSpan: 7,
        styles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: "bold", fontSize: 9, halign: "left" },
      },
    ]);
    ln.items.forEach((it) => {
      body.push([
        it.name,
        it.partNo || "-",
        it.qty,
        rs(it.price),
        `${it.gstPct}%`,
        rs(it.gstAmt),
        rs(it.total),
      ]);
    });
    body.push([
      {
        content: `Subtotal: ${rs(ln.subtotal)}     GST: ${rs(ln.gst)}     Total: ${rs(ln.total)}`,
        colSpan: 7,
        styles: { halign: "right", fontStyle: "bold", fontSize: 9, fillColor: [248, 248, 248] },
      },
    ]);
  });

  autoTable(doc, {
    startY: 92,
    margin: { top: 92, right: margin, bottom: 50, left: margin },
    head: [["Product", "Part No", "Qty", "Price (excl.)", "GST %", "GST Amt", "Total"]],
    body,
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak", valign: "middle" },
    headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: "bold", fontSize: 9, halign: "center" },
    columnStyles: {
      0: { cellWidth: 220 },
      1: { cellWidth: 90 },
      2: { cellWidth: 40, halign: "right" },
      3: { cellWidth: 90, halign: "right" },
      4: { cellWidth: 50, halign: "right" },
      5: { cellWidth: 90, halign: "right" },
      6: { cellWidth: 100, halign: "right" },
    },
    didDrawPage: () => {
      drawHeader();
      const pageCount = doc.getNumberOfPages();
      const current = (doc as unknown as { internal: { getCurrentPageInfo: () => { pageNumber: number } } })
        .internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.text(`Page ${current} of ${pageCount}`, pageW - margin, pageH - 20, { align: "right" });
      doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, margin, pageH - 20);
    },
  });

  // Summary block — always start on a fresh page if not enough room.
  const lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const summaryHeight = 140;
  let y = lastY + 24;
  if (y + summaryHeight > pageH - 50) {
    doc.addPage();
    drawHeader();
    y = 110;
  }

  const sx = margin;
  const sw = 320;
  doc.setDrawColor(40); doc.setLineWidth(0.6);
  doc.rect(sx, y, sw, summaryHeight);
  doc.setFillColor(40, 40, 40);
  doc.rect(sx, y, sw, 22, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("Summary", sx + 10, y + 15);
  doc.setTextColor(0); doc.setFont("helvetica", "normal"); doc.setFontSize(10);

  const rows: [string, string][] = [
    ["Total (Without GST):", rs(totalSub)],
  ];
  if (opts.gstBreakup) {
    rows.push(["CGST:", rs(opts.gstBreakup.cgst)]);
    rows.push(["SGST:", rs(opts.gstBreakup.sgst)]);
    rows.push(["IGST:", rs(opts.gstBreakup.igst)]);
  }
  rows.push(["Total GST:", rs(totalGst)]);

  let ry = y + 40;
  rows.forEach(([k, v]) => {
    doc.text(k, sx + 10, ry);
    doc.text(v, sx + sw - 10, ry, { align: "right" });
    ry += 16;
  });
  doc.setDrawColor(40); doc.line(sx + 6, ry - 10, sx + sw - 6, ry - 10);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("Grand Total:", sx + 10, ry + 6);
  doc.text(rs(totalAll), sx + sw - 10, ry + 6, { align: "right" });

  doc.save(`${opts.title.replace(/\s+/g, "_")}_${Date.now()}.pdf`);
}
