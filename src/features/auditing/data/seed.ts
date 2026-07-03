import type {
  Audit,
  AuditItem,
  AuditStatus,
  Auditor,
  Dealer,
  OemRecord,
  Part,
  Priority,
  Role,
  VarianceStatus,
  Warehouse,
  ActivityEvent,
} from "./types";

// Deterministic PRNG so the seed is stable across renders/reloads.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(42);
const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;

export const WAREHOUSES: Warehouse[] = [
  { id: "wh-1", name: "Chennai Central", code: "CHN-1", city: "Chennai" },
  { id: "wh-2", name: "Bengaluru Hub", code: "BLR-1", city: "Bengaluru" },
  { id: "wh-3", name: "Mumbai West", code: "MUM-1", city: "Mumbai" },
  { id: "wh-4", name: "Delhi North", code: "DEL-1", city: "Delhi" },
];

export const DEALERS: Dealer[] = [
  { id: "d-1", name: "Sundaram Motors", code: "SM-01", city: "Chennai", gstin: "33AABCS0001Z1" },
  { id: "d-2", name: "Sky Auto Parts", code: "SA-02", city: "Bengaluru", gstin: "29AAACS9002Z2" },
  { id: "d-3", name: "Arya Automobiles", code: "AA-03", city: "Mumbai", gstin: "27AAECA0003Z3" },
  { id: "d-4", name: "Northern Spares", code: "NS-04", city: "Delhi", gstin: "07AABCN0004Z4" },
  { id: "d-5", name: "Coastal OEM", code: "CO-05", city: "Kochi", gstin: "32AAJCC0005Z5" },
  { id: "d-6", name: "Metro Parts Co", code: "MP-06", city: "Hyderabad", gstin: "36AAECM0006Z6" },
];

const ROLES: Role[] = ["Administrator", "Audit Manager", "Senior Auditor", "Auditor", "Warehouse Manager", "Viewer"];
export const AUDITORS: Auditor[] = [
  { id: "u-1", name: "Priya Raman", email: "priya@spintify.io", role: "Administrator", active: true },
  { id: "u-2", name: "Arjun Menon", email: "arjun@spintify.io", role: "Audit Manager", active: true },
  { id: "u-3", name: "Kavya Iyer", email: "kavya@spintify.io", role: "Senior Auditor", active: true },
  { id: "u-4", name: "Rahul Nair", email: "rahul@spintify.io", role: "Auditor", active: true },
  { id: "u-5", name: "Deepa Shah", email: "deepa@spintify.io", role: "Auditor", active: true },
  { id: "u-6", name: "Vikram Rao", email: "vikram@spintify.io", role: "Warehouse Manager", active: true },
  { id: "u-7", name: "Sneha Patel", email: "sneha@spintify.io", role: "Auditor", active: false },
  { id: "u-8", name: "Anish Kumar", email: "anish@spintify.io", role: "Viewer", active: true },
];

const BRANDS = ["Bosch", "Denso", "NGK", "Valeo", "Delphi", "MAHLE", "TVS", "Lucas"];
const SUPPLIERS = ["Rane Group", "Sundram Fasteners", "Motherson", "Bharat Forge", "Amara Raja"];
const CATEGORIES = ["Filters", "Brakes", "Engine", "Electrical", "Suspension", "Transmission", "Body", "Cooling"];

function makeParts(n: number): Part[] {
  const parts: Part[] = [];
  for (let i = 0; i < n; i++) {
    const wh = pick(WAREHOUSES);
    parts.push({
      id: `p-${i + 1}`,
      partNumber: `PN-${(1000 + i).toString().padStart(5, "0")}`,
      oemCode: `OEM-${pick(BRANDS).slice(0, 3).toUpperCase()}-${int(100, 999)}`,
      name: `${pick(CATEGORIES)} ${pick(["Kit", "Assy", "Module", "Sensor", "Pump", "Valve"])} ${int(100, 900)}`,
      brand: pick(BRANDS),
      supplier: pick(SUPPLIERS),
      category: pick(CATEGORIES),
      barcode: `8901${int(100000, 999999)}${int(0, 9)}`,
      price: int(120, 18500),
      systemQty: int(0, 240),
      warehouseId: wh.id,
      location: `${pick(["A", "B", "C", "D"])}-${int(1, 20)}`,
      bin: `${pick(["L", "M", "H"])}-${int(1, 40)}`,
    });
  }
  return parts;
}
export const PARTS: Part[] = makeParts(180);

function daysAgo(d: number) {
  const t = new Date();
  t.setDate(t.getDate() - d);
  return t.toISOString();
}

const AUDIT_STATUSES: AuditStatus[] = ["Draft", "In Progress", "Submitted", "Approved", "Rejected", "Completed"];
const PRIORITIES: Priority[] = ["Low", "Medium", "High", "Critical"];
const VARIANCE: VarianceStatus[] = ["Verified", "Verified", "Verified", "Missing", "Extra Stock", "Damaged", "Mismatch"];

function makeItems(): AuditItem[] {
  const n = int(6, 18);
  const items: AuditItem[] = [];
  const used = new Set<string>();
  for (let i = 0; i < n; i++) {
    let part = pick(PARTS);
    while (used.has(part.id)) part = pick(PARTS);
    used.add(part.id);
    const status = pick(VARIANCE);
    const drift =
      status === "Verified" ? 0 : status === "Missing" ? -int(1, 8) : status === "Extra Stock" ? int(1, 6) : int(-4, 4);
    items.push({
      partId: part.id,
      systemQty: part.systemQty,
      physicalQty: Math.max(0, part.systemQty + drift),
      status,
      remarks: status === "Damaged" ? "Water damage on carton" : undefined,
    });
  }
  return items;
}

export const AUDITS: Audit[] = Array.from({ length: 42 }).map((_, i) => {
  const created = daysAgo(int(0, 300));
  const status = pick(AUDIT_STATUSES);
  return {
    id: `a-${i + 1}`,
    auditNumber: `AUD-${new Date(created).getFullYear().toString().slice(2)}${(new Date(created).getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${(i + 1).toString().padStart(4, "0")}`,
    name: `${pick(CATEGORIES)} Audit — ${pick(WAREHOUSES).name}`,
    status,
    priority: pick(PRIORITIES),
    warehouseId: pick(WAREHOUSES).id,
    dealerId: pick(DEALERS).id,
    category: pick(CATEGORIES),
    assigneeId: pick(AUDITORS).id,
    dueDate: daysAgo(int(-30, 30)),
    createdAt: created,
    completedAt: status === "Completed" || status === "Approved" ? daysAgo(int(0, 90)) : undefined,
    notes: rnd() > 0.6 ? "Quarterly variance review, focus on high-value SKUs." : undefined,
    items: makeItems(),
  };
});

export const ACTIVITY: ActivityEvent[] = Array.from({ length: 18 }).map((_, i) => {
  const kinds: ActivityEvent["kind"][] = ["assigned", "completed", "mismatch", "approval", "report", "diff"];
  const kind = kinds[i % kinds.length];
  const messages: Record<ActivityEvent["kind"], string> = {
    assigned: `${pick(AUDITORS).name} was assigned to ${pick(AUDITS).auditNumber}`,
    completed: `${pick(AUDITS).auditNumber} was marked completed`,
    mismatch: `Mismatch flagged on part ${pick(PARTS).partNumber}`,
    approval: `${pick(AUDITS).auditNumber} awaits approval`,
    report: `Variance report generated for ${pick(WAREHOUSES).name}`,
    diff: `Stock difference of ${int(2, 20)} units recorded`,
  };
  return {
    id: `ev-${i + 1}`,
    when: daysAgo(int(0, 20)),
    actor: pick(AUDITORS).name,
    message: messages[kind],
    kind,
  };
});

export const OEM_RECORDS: OemRecord[] = PARTS.slice(0, 40).map((p) => {
  const priceDrift = rnd() > 0.5 ? int(-80, 120) : 0;
  const stockDrift = rnd() > 0.5 ? int(-8, 8) : 0;
  return {
    partId: p.id,
    dealer: { price: p.price + priceDrift, stock: p.systemQty + stockDrift, invoiceNo: `INV-${int(1000, 9999)}`, gst: 18 },
    oem: { price: p.price, stock: p.systemQty, invoiceNo: `OEM-${int(1000, 9999)}`, gst: 18 },
    system: { price: p.price, stock: p.systemQty + int(-2, 2), invoiceNo: `SYS-${int(1000, 9999)}`, gst: 18 },
  };
});

// Precomputed KPIs / chart series ---------------------------------------------
export function kpis() {
  const totalParts = PARTS.length;
  const inventoryValue = PARTS.reduce((s, p) => s + p.price * p.systemQty, 0);
  const completed = AUDITS.filter((a) => a.status === "Completed" || a.status === "Approved").length;
  const pending = AUDITS.filter((a) => a.status !== "Completed" && a.status !== "Approved" && a.status !== "Rejected").length;
  const activeAuditors = AUDITORS.filter((a) => a.active).length;
  const warehouses = WAREHOUSES.length;
  const variance = AUDITS.flatMap((a) => a.items).filter((i) => i.status !== "Verified").length;
  const totalChecked = AUDITS.flatMap((a) => a.items).length || 1;
  const accuracy = (100 * (totalChecked - variance)) / totalChecked;
  const last = AUDITS.filter((a) => a.completedAt).sort((a, b) => (a.completedAt! > b.completedAt! ? -1 : 1))[0];
  const next = AUDITS.filter((a) => a.status === "Draft" || a.status === "In Progress").sort((a, b) =>
    a.dueDate > b.dueDate ? 1 : -1,
  )[0];
  return {
    totalParts,
    inventoryValue,
    completed,
    pending,
    activeAuditors,
    warehouses,
    variance,
    accuracy,
    lastAuditDate: last?.completedAt ?? null,
    nextAuditDate: next?.dueDate ?? null,
  };
}

export function monthlyAuditTrend() {
  const map = new Map<string, { month: string; audits: number; variance: number }>();
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString("en", { month: "short" });
    map.set(`${d.getFullYear()}-${d.getMonth()}`, { month: key, audits: 0, variance: 0 });
  }
  for (const a of AUDITS) {
    const d = new Date(a.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const row = map.get(key);
    if (!row) continue;
    row.audits += 1;
    row.variance += a.items.filter((i) => i.status !== "Verified").length;
  }
  return Array.from(map.values());
}

export function accuracySeries() {
  return monthlyAuditTrend().map((r) => ({
    month: r.month,
    accuracy: Math.max(80, 100 - r.variance * 0.6 - (rnd() * 3 - 1.5)),
  }));
}

export function categoryVariance() {
  return CATEGORIES.map((c) => ({
    category: c,
    variance: AUDITS.flatMap((a) => a.items)
      .filter((i) => PARTS.find((p) => p.id === i.partId)?.category === c && i.status !== "Verified")
      .length,
  }));
}

export function warehouseComparison() {
  return WAREHOUSES.map((w) => {
    const items = AUDITS.filter((a) => a.warehouseId === w.id).flatMap((a) => a.items);
    const verified = items.filter((i) => i.status === "Verified").length;
    const issues = items.length - verified;
    return { warehouse: w.name.split(" ")[0], verified, issues };
  });
}

export function topMismatched() {
  const counts = new Map<string, number>();
  for (const a of AUDITS) for (const i of a.items) if (i.status !== "Verified") counts.set(i.partId, (counts.get(i.partId) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([id, count]) => ({ part: PARTS.find((p) => p.id === id)?.partNumber ?? id, count }));
}

export function warehouseName(id: string) {
  return WAREHOUSES.find((w) => w.id === id)?.name ?? "—";
}
export function dealerName(id: string) {
  return DEALERS.find((d) => d.id === id)?.name ?? "—";
}
export function auditorName(id: string) {
  return AUDITORS.find((a) => a.id === id)?.name ?? "—";
}
export function partById(id: string) {
  return PARTS.find((p) => p.id === id);
}

export { CATEGORIES, BRANDS, SUPPLIERS, ROLES };
