import { Bill, BillItem, COMPANY, fmtINR } from "@/lib/storage";
import { QRCodeSVG } from "qrcode.react";
import stampAsset from "@/assets/stamp.png.asset.json";

const ROWS_PER_PAGE = 8;

const PERMANENT_PAYMENT = {
  accountHolder: "BEE SQUARE ENTERPRISES",
  bankName: "UCO BANK",
  accountNumber: "20100210003497",
  ifsc: "UCBA0002010",
  upiId: "beesquareenterprises@uco",
};


export function Invoice({ bill }: { bill: Bill }) {
  const d = new Date(bill.date);
  const halfRate = +(bill.gstRate / 2).toFixed(2);
  const cgst = +(bill.gstAmount / 2).toFixed(2);
  const sgst = +(bill.gstAmount - cgst).toFixed(2);

  const bankAccountHolder = bill.bankAccountHolder || PERMANENT_PAYMENT.accountHolder;
  const bankName = bill.bankName || PERMANENT_PAYMENT.bankName;
  const bankAccountNumber = bill.bankAccountNumber || PERMANENT_PAYMENT.accountNumber;
  const bankIfsc = bill.bankIfsc || PERMANENT_PAYMENT.ifsc;
  const upiId = bill.upiId || PERMANENT_PAYMENT.upiId;

  const pages: BillItem[][] = [];
  for (let i = 0; i < bill.items.length; i += ROWS_PER_PAGE) {
    pages.push(bill.items.slice(i, i + ROWS_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);
  const totalPages = pages.length;

  return (
    <div id="invoice-print" className="space-y-6">
      {pages.map((pageItems, pIdx) => {
        const isLast = pIdx === totalPages - 1;
        return (
          <div
            key={pIdx}
            className="invoice-page bg-[var(--invoice-bg)] text-[oklch(0.18_0.03_255)] rounded-xl shadow-sm border border-border overflow-hidden"
          >
            {/* Header */}
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
                    Tax Invoice
                  </div>
                  <p className="text-xs opacity-80 mt-2">Original for buyer</p>
                  <p className="text-xs opacity-80 mt-1">Page {pIdx + 1} of {totalPages}</p>
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="px-8 py-5 grid grid-cols-2 gap-6 border-b border-border bg-muted/30">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Bill To</p>
                <p className="font-semibold">{bill.customerName || "Walk-in Customer"}</p>
                {bill.customerAddress && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{bill.customerAddress}</p>
                )}
                {bill.customerGstin && (
                  <p className="text-sm text-muted-foreground">GSTIN: {bill.customerGstin}</p>
                )}
                {bill.customerPhone && (
                  <p className="text-sm text-muted-foreground">Ph: {bill.customerPhone}</p>
                )}
              </div>
              <div className="text-right space-y-1">
                <div className="flex justify-end gap-3">
                  <span className="text-muted-foreground text-sm">Invoice #</span>
                  <span className="font-semibold">{bill.billNumber}</span>
                </div>
                <div className="flex justify-end gap-3">
                  <span className="text-muted-foreground text-sm">Date</span>
                  <span>{d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="px-8 py-5">
              <table className="w-full text-sm border-collapse [&_th]:border [&_td]:border [&_th]:border-foreground/80 [&_td]:border-foreground/80">
                <thead>
                  <tr className="bg-muted/60 text-left">
                    <th className="px-2 py-2 w-8 text-center">#</th>
                    <th className="px-2 py-2">Product</th>
                    <th className="px-2 py-2">Product ID</th>
                    <th className="px-2 py-2">HSN</th>
                    <th className="px-2 py-2 text-right">MRP</th>
                    <th className="px-2 py-2 text-right">Price</th>
                    <th className="px-2 py-2 text-right">Disc%</th>
                    <th className="px-2 py-2 text-right">Qty</th>
                    <th className="px-2 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((it, i) => {
                    const idx = pIdx * ROWS_PER_PAGE + i;
                    const mrp = +(it.price * (1 + bill.gstRate / 100)).toFixed(2);
                    return (
                      <tr key={idx}>
                        <td className="px-2 py-2 text-center text-muted-foreground">{idx + 1}</td>
                        <td className="px-2 py-2 font-medium">{it.name}</td>
                        <td className="px-2 py-2 text-xs">{it.productId}</td>
                        <td className="px-2 py-2 text-xs">{it.hsn || "—"}</td>
                        <td className="px-2 py-2 text-right">{fmtINR(mrp)}</td>
                        <td className="px-2 py-2 text-right">{fmtINR(it.price)}</td>

                        <td className="px-2 py-2 text-right">{it.discount.toFixed(1)}%</td>
                        <td className="px-2 py-2 text-right">{it.quantity}</td>
                        <td className="px-2 py-2 text-right font-semibold">{fmtINR(it.lineTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {isLast ? (
              <>
                {/* Totals */}
                {(() => {
                  const rounded = Math.round(bill.total);
                  const roundOff = +(rounded - bill.total).toFixed(2);
                  return (
                    <div className="px-8 pb-6 grid grid-cols-2 gap-6">
                      <div className="self-start space-y-3">
                        <div className="text-xs text-muted-foreground">
                          Total Items / Qty: {bill.items.length} /{" "}
                          {bill.items.reduce((s, i) => s + i.quantity, 0)}
                        </div>
                        <table className="w-full text-sm">
                          <tbody>
                            <tr>
                              <td className="text-muted-foreground py-0.5 pr-2">Account Holder</td>
                              <td className="font-medium text-right py-0.5">{bankAccountHolder}</td>
                            </tr>
                            <tr>
                              <td className="text-muted-foreground py-0.5 pr-2">Bank Name</td>
                              <td className="font-medium text-right py-0.5">{bankName}</td>
                            </tr>
                            <tr>
                              <td className="text-muted-foreground py-0.5 pr-2">Account No.</td>
                              <td className="font-medium text-right py-0.5 tracking-wide">{bankAccountNumber}</td>
                            </tr>
                            <tr>
                              <td className="text-muted-foreground py-0.5 pr-2">IFSC Code</td>
                              <td className="font-medium text-right py-0.5">{bankIfsc}</td>
                            </tr>
                            <tr>
                              <td className="text-muted-foreground py-0.5 pr-2">UPI ID</td>
                              <td className="font-medium text-right py-0.5">{upiId}</td>
                            </tr>
                          </tbody>
                        </table>
                        <div className="pt-1">
                          <div className="text-center inline-block">
                            <div className="bg-white p-2 rounded border border-border">
                              <QRCodeSVG
                                value={`upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(bankAccountHolder)}&am=${bill.total}&cu=INR&tn=${encodeURIComponent("Invoice " + bill.billNumber)}`}
                                size={90}
                                level="M"
                              />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">Scan to pay via UPI</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <Row label="Subtotal" value={fmtINR(bill.subtotal)} />
                        <Row label="Total Discount" value={`− ${fmtINR(bill.totalDiscount)}`} muted />
                        <Row label="Taxable Value" value={fmtINR(bill.taxable)} />
                        <Row label={`CGST @ ${halfRate}%`} value={fmtINR(cgst)} />
                        <Row label={`SGST @ ${halfRate}%`} value={fmtINR(sgst)} />
                        <Row label="Round Off" value={`${roundOff >= 0 ? "+" : "−"} ${fmtINR(Math.abs(roundOff))}`} muted />
                        <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-foreground/10">
                          <span className="font-semibold text-base">Amount Payable</span>
                          <span className="font-bold text-lg" style={{ color: "#2a179e" }}>
                            {fmtINR(rounded)}
                          </span>
                        </div>
                        <div
                          className="rounded-md border-2 p-3 mt-3"
                          style={{ borderColor: "#2a179e", background: "rgba(42,23,158,0.06)" }}
                        >
                          <div className="uppercase tracking-wider text-[11px] font-semibold mb-1" style={{ color: "#2a179e" }}>
                            Amount in Words
                          </div>
                          <div className="text-sm font-bold leading-snug" style={{ color: "#2a179e" }}>
                            {amountInWords(rounded)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="px-8 pt-6 pb-4 flex justify-end">
                  <div className="text-center">
                    <p className="text-sm font-semibold uppercase tracking-wide">For {COMPANY.name}</p>
                    <div className="mt-2 mx-auto w-36 h-36 rounded flex items-center justify-center overflow-hidden">
                      <img src={stampAsset.url} alt="Company Stamp" className="w-full h-full object-contain p-1" />
                    </div>
                    <p className="mt-2 text-sm">Authorised Signatory</p>
                  </div>
                </div>

                <div className="px-8 py-4 border-t border-border text-center text-xs text-muted-foreground">
                  Thank you for your business!
                </div>
              </>
            ) : (
              <div className="px-8 py-4 border-t border-border text-center text-xs text-muted-foreground">
                Continued on next page…
              </div>
            )}
          </div>
        );
      })}
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

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10), o = n % 10;
  return TENS[t] + (o ? " " + ONES[o] : "");
}
function threeDigits(n: number): string {
  const h = Math.floor(n / 100), r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(ONES[h] + " Hundred");
  if (r) parts.push(twoDigits(r));
  return parts.join(" ");
}
function numToWordsIndian(num: number): string {
  if (num === 0) return "Zero";
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;
  const rest = num;
  const parts: string[] = [];
  if (crore) parts.push(twoDigits(crore) + " Crore");
  if (lakh) parts.push(twoDigits(lakh) + " Lakh");
  if (thousand) parts.push(twoDigits(thousand) + " Thousand");
  if (rest) parts.push(threeDigits(rest));
  return parts.join(" ");
}
export function amountInWords(amount: number): string {
  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);
  let words = "Rupees " + numToWordsIndian(rupees);
  if (paise) words += " and " + numToWordsIndian(paise) + " Paise";
  return words + " Only";
}
