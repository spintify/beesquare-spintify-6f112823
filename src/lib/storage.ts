import { supabase } from "@/integrations/supabase/client";

export type Product = {
  id: string;
  name: string;
  productId: string;
  hsn?: string;
  price: number;
  discount: number; // percentage
  quantity: number; // stock on hand
};

export type BillItem = {
  productId: string;
  name: string;
  hsn?: string;
  price: number;
  discount: number;
  quantity: number;
  finalPrice: number; // per unit after discount
  lineTotal: number;
};

export type Bill = {
  id: string;
  billNumber: string;
  date: string; // ISO
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGstin?: string;
  items: BillItem[];
  subtotal: number;
  totalDiscount: number;
  taxable: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  bankAccountHolder?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  upiId?: string;
};

export type Buyer = {
  id: string;
  name: string;
  address?: string;
  gstin?: string;
  phone?: string;
};

export const COMPANY = {
  name: "BEE SQUARE ENTERPRISES",
  gst: "09BQAPS4156G1Z0",
  phone: "8960659576",
  address: "Plot No. 284, Pandit Khera, Lucknow",
};

export const LOW_STOCK_THRESHOLD = 10;

export function calcFinalPrice(price: number, discount: number) {
  return +(price - (price * discount) / 100).toFixed(2);
}

export function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(n);
}

// --- Products ---
type ProductRow = {
  id: string;
  name: string;
  product_id: string;
  hsn?: string | null;
  price: number;
  discount: number;
  quantity: number;
};

function rowToProduct(r: ProductRow): Product {
  return {
    id: r.id,
    name: r.name,
    productId: r.product_id,
    hsn: r.hsn ?? undefined,
    price: Number(r.price),
    discount: Number(r.discount),
    quantity: Number(r.quantity),
  };
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ProductRow[]).map(rowToProduct);
}

export async function upsertProductByProductId(input: {
  name: string;
  productId: string;
  hsn?: string;
  price: number;
  discount: number;
  quantityToAdd?: number; // defaults to 0 (form add); pass 1+ for stock additions
}): Promise<Product> {
  const { name, productId, hsn, price, discount, quantityToAdd = 0 } = input;
  // Try to find existing
  const { data: existing, error: selErr } = await supabase
    .from("products")
    .select("*")
    .ilike("product_id", productId)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing) {
    // Increase quantity only; keep existing name/price/discount unchanged
    const newQty = Number(existing.quantity) + quantityToAdd;
    const patch: { quantity: number; updated_at: string; hsn?: string | null } = {
      quantity: newQty,
      updated_at: new Date().toISOString(),
    };
    if (hsn !== undefined && !existing.hsn) patch.hsn = hsn || null;
    const { data, error } = await supabase
      .from("products")
      .update(patch)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return rowToProduct(data as ProductRow);
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      name,
      product_id: productId,
      hsn: hsn || null,
      price,
      discount,
      quantity: Math.max(0, quantityToAdd),
    })
    .select()
    .single();
  if (error) throw error;
  return rowToProduct(data as ProductRow);
}

export async function updateProduct(
  id: string,
  patch: { name: string; productId: string; hsn?: string; price: number; discount: number; quantity?: number }
): Promise<Product> {
  const update = {
    name: patch.name,
    product_id: patch.productId,
    hsn: patch.hsn || null,
    price: patch.price,
    discount: patch.discount,
    updated_at: new Date().toISOString(),
    ...(patch.quantity !== undefined ? { quantity: patch.quantity } : {}),
  };
  const { data, error } = await supabase
    .from("products")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToProduct(data as ProductRow);
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

// --- Buyers ---
type BuyerRow = {
  id: string;
  name: string;
  address: string | null;
  gstin: string | null;
  phone: string | null;
};

function rowToBuyer(r: BuyerRow): Buyer {
  return {
    id: r.id,
    name: r.name,
    address: r.address ?? undefined,
    gstin: r.gstin ?? undefined,
    phone: r.phone ?? undefined,
  };
}

export async function fetchBuyers(): Promise<Buyer[]> {
  const { data, error } = await supabase
    .from("buyers")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as BuyerRow[]).map(rowToBuyer);
}

export async function createBuyer(b: Omit<Buyer, "id">): Promise<Buyer> {
  const { data, error } = await supabase
    .from("buyers")
    .insert({
      name: b.name,
      address: b.address || null,
      gstin: b.gstin || null,
      phone: b.phone || null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToBuyer(data as BuyerRow);
}

export async function updateBuyer(id: string, b: Omit<Buyer, "id">): Promise<Buyer> {
  const { data, error } = await supabase
    .from("buyers")
    .update({
      name: b.name,
      address: b.address || null,
      gstin: b.gstin || null,
      phone: b.phone || null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToBuyer(data as BuyerRow);
}

export async function deleteBuyer(id: string): Promise<void> {
  const { error } = await supabase.from("buyers").delete().eq("id", id);
  if (error) throw error;
}

// --- Bills ---
type BillRow = {
  id: string;
  bill_number: string;
  date: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  customer_gstin: string | null;
  items: unknown;
  subtotal: number;
  total_discount: number;
  taxable: number;
  gst_rate: number;
  gst_amount: number;
  total: number;
  bank_account_holder?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bank_name?: string | null;
  upi_id?: string | null;
};

function rowToBill(r: BillRow): Bill {
  return {
    id: r.id,
    billNumber: r.bill_number,
    date: r.date,
    customerName: r.customer_name ?? undefined,
    customerPhone: r.customer_phone ?? undefined,
    customerAddress: r.customer_address ?? undefined,
    customerGstin: r.customer_gstin ?? undefined,
    items: (r.items as BillItem[]) ?? [],
    subtotal: Number(r.subtotal),
    totalDiscount: Number(r.total_discount),
    taxable: Number(r.taxable),
    gstRate: Number(r.gst_rate),
    gstAmount: Number(r.gst_amount),
    total: Number(r.total),
    bankAccountHolder: r.bank_account_holder ?? undefined,
    bankAccountNumber: r.bank_account_number ?? undefined,
    bankIfsc: r.bank_ifsc ?? undefined,
    bankName: r.bank_name ?? undefined,
    upiId: r.upi_id ?? undefined,
  };
}

export async function fetchBills(): Promise<Bill[]> {
  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  return (data as BillRow[]).map(rowToBill);
}

export function currentFinancialYear(d = new Date()): string {
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-indexed; April = 3
  const startYear = m >= 3 ? y : y - 1;
  const startYY = String(startYear % 100).padStart(2, "0");
  const endYY = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYY}-${endYY}`;
}

export async function nextBillNumber(): Promise<string> {
  const fy = currentFinancialYear();
  const { data, error } = await supabase.rpc("next_bill_number_for", { _fy: fy });
  if (error) throw error;
  const seq = String(Number(data) || 1).padStart(4, "0");
  return `BSE/${fy}/${seq}`;
}

export function currentFullFinancialYear(d = new Date()): string {
  const y = d.getFullYear();
  const m = d.getMonth();
  const startYear = m >= 3 ? y : y - 1;
  const endYY = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endYY}`;
}

export async function nextEstimateNumber(): Promise<string> {
  const fy = currentFullFinancialYear();
  const key = `EST-${fy}`;
  const { data, error } = await supabase.rpc("next_bill_number_for", { _fy: key });
  if (error) throw error;
  const seq = String(Number(data) || 1).padStart(3, "0");
  return `EST/${fy}/${seq}`;
}

export async function updateBill(id: string, b: Partial<Omit<Bill, "id">>): Promise<Bill> {
  const patch: Record<string, unknown> = {};
  if (b.billNumber !== undefined) patch.bill_number = b.billNumber;
  if (b.date !== undefined) patch.date = b.date;
  if (b.customerName !== undefined) patch.customer_name = b.customerName || null;
  if (b.customerPhone !== undefined) patch.customer_phone = b.customerPhone || null;
  if (b.customerAddress !== undefined) patch.customer_address = b.customerAddress || null;
  if (b.customerGstin !== undefined) patch.customer_gstin = b.customerGstin || null;
  if (b.items !== undefined) patch.items = b.items as unknown as never;
  if (b.subtotal !== undefined) patch.subtotal = b.subtotal;
  if (b.totalDiscount !== undefined) patch.total_discount = b.totalDiscount;
  if (b.taxable !== undefined) patch.taxable = b.taxable;
  if (b.gstRate !== undefined) patch.gst_rate = b.gstRate;
  if (b.gstAmount !== undefined) patch.gst_amount = b.gstAmount;
  if (b.total !== undefined) patch.total = b.total;
  if (b.bankAccountHolder !== undefined) patch.bank_account_holder = b.bankAccountHolder || null;
  if (b.bankAccountNumber !== undefined) patch.bank_account_number = b.bankAccountNumber || null;
  if (b.bankIfsc !== undefined) patch.bank_ifsc = b.bankIfsc || null;
  if (b.bankName !== undefined) patch.bank_name = b.bankName || null;
  if (b.upiId !== undefined) patch.upi_id = b.upiId || null;
  const { data, error } = await supabase.from("bills").update(patch as never).eq("id", id).select().single();
  if (error) throw error;
  return rowToBill(data as BillRow);
}

// --- Parts catalog (master list, stored locally; uploaded once via Excel) ---
export type CatalogPart = {
  name: string;
  productId: string;
  hsn?: string;
  price: number;
  discount?: number;
};
const CATALOG_KEY = "bsq.catalog";
export function loadCatalog(): CatalogPart[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CATALOG_KEY);
    return raw ? (JSON.parse(raw) as CatalogPart[]) : [];
  } catch {
    return [];
  }
}
export function saveCatalog(parts: CatalogPart[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CATALOG_KEY, JSON.stringify(parts));
}
export function findCatalogPart(query: string): CatalogPart | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  const all = loadCatalog();
  return (
    all.find((p) => p.productId.toLowerCase() === q) ||
    all.find((p) => p.name.toLowerCase() === q) ||
    all.find((p) => p.productId.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
  );
}

export async function createBill(b: Omit<Bill, "id">): Promise<Bill> {
  const { data, error } = await supabase
    .from("bills")
    .insert({
      bill_number: b.billNumber,
      date: b.date,
      customer_name: b.customerName || null,
      customer_phone: b.customerPhone || null,
      customer_address: b.customerAddress || null,
      customer_gstin: b.customerGstin || null,
      items: b.items as unknown as never,
      subtotal: b.subtotal,
      total_discount: b.totalDiscount,
      taxable: b.taxable,
      gst_rate: b.gstRate,
      gst_amount: b.gstAmount,
      total: b.total,
      bank_account_holder: b.bankAccountHolder || null,
      bank_account_number: b.bankAccountNumber || null,
      bank_ifsc: b.bankIfsc || null,
      bank_name: b.bankName || null,
      upi_id: b.upiId || null,
    })
    .select()
    .single();
  if (error) throw error;

  // Deduct stock for each item
  await Promise.all(
    b.items.map((it) =>
      supabase.rpc("adjust_stock", { _product_id: it.productId, _delta: -it.quantity })
    )
  );

  return rowToBill(data as BillRow);
}

export async function saveBillNoStock(b: Omit<Bill, "id">): Promise<Bill> {
  const { data, error } = await supabase
    .from("bills")
    .insert({
      bill_number: b.billNumber,
      date: b.date,
      customer_name: b.customerName || null,
      customer_phone: b.customerPhone || null,
      customer_address: b.customerAddress || null,
      customer_gstin: b.customerGstin || null,
      items: b.items as unknown as never,
      subtotal: b.subtotal,
      total_discount: b.totalDiscount,
      taxable: b.taxable,
      gst_rate: b.gstRate,
      gst_amount: b.gstAmount,
      total: b.total,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToBill(data as BillRow);
}

export async function deleteBill(id: string): Promise<void> {
  const { error } = await supabase.from("bills").delete().eq("id", id);
  if (error) throw error;
}

// --- Purchases ---
export type PurchaseItem = {
  productId: string;
  name: string;
  hsn?: string;
  quantity: number;
  price: number; // per unit without GST
  gstRate: number; // percentage
  gstAmount: number; // total for line
  lineTotal: number; // qty*price + gst
};

export type Purchase = {
  id: string;
  purchaseNumber: string;
  date: string;
  supplierName?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  supplierGstin?: string;
  items: PurchaseItem[];
  subtotal: number; // without GST
  gstAmount: number;
  total: number;
  notes?: string;
};

type PurchaseRow = {
  id: string;
  purchase_number: string;
  date: string;
  supplier_name: string | null;
  supplier_phone: string | null;
  supplier_address: string | null;
  supplier_gstin: string | null;
  items: unknown;
  subtotal: number;
  gst_amount: number;
  total: number;
  notes: string | null;
};

function rowToPurchase(r: PurchaseRow): Purchase {
  return {
    id: r.id,
    purchaseNumber: r.purchase_number,
    date: r.date,
    supplierName: r.supplier_name ?? undefined,
    supplierPhone: r.supplier_phone ?? undefined,
    supplierAddress: r.supplier_address ?? undefined,
    supplierGstin: r.supplier_gstin ?? undefined,
    items: (r.items as PurchaseItem[]) ?? [],
    subtotal: Number(r.subtotal),
    gstAmount: Number(r.gst_amount),
    total: Number(r.total),
    notes: r.notes ?? undefined,
  };
}

export async function fetchPurchases(): Promise<Purchase[]> {
  const { data, error } = await supabase
    .from("purchases" as never)
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  return (data as PurchaseRow[]).map(rowToPurchase);
}

export async function createPurchase(p: Omit<Purchase, "id">): Promise<Purchase> {
  const { data, error } = await supabase
    .from("purchases" as never)
    .insert({
      purchase_number: p.purchaseNumber,
      date: p.date,
      supplier_name: p.supplierName || null,
      supplier_phone: p.supplierPhone || null,
      supplier_address: p.supplierAddress || null,
      supplier_gstin: p.supplierGstin || null,
      items: p.items as unknown as never,
      subtotal: p.subtotal,
      gst_amount: p.gstAmount,
      total: p.total,
      notes: p.notes || null,
    } as never)
    .select()
    .single();
  if (error) throw error;
  return rowToPurchase(data as PurchaseRow);
}

export async function updatePurchase(id: string, p: Omit<Purchase, "id">): Promise<Purchase> {
  const { data, error } = await supabase
    .from("purchases" as never)
    .update({
      purchase_number: p.purchaseNumber,
      date: p.date,
      supplier_name: p.supplierName || null,
      supplier_phone: p.supplierPhone || null,
      supplier_address: p.supplierAddress || null,
      supplier_gstin: p.supplierGstin || null,
      items: p.items as unknown as never,
      subtotal: p.subtotal,
      gst_amount: p.gstAmount,
      total: p.total,
      notes: p.notes || null,
    } as never)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToPurchase(data as PurchaseRow);
}

export async function deletePurchase(id: string): Promise<void> {
  const { error } = await supabase.from("purchases" as never).delete().eq("id", id);
  if (error) throw error;
}

// --- Suppliers ---
export type Supplier = {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  gstin?: string;
};

type SupplierRow = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  gstin: string | null;
};

function rowToSupplier(r: SupplierRow): Supplier {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone ?? undefined,
    address: r.address ?? undefined,
    gstin: r.gstin ?? undefined,
  };
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from("suppliers" as never)
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as SupplierRow[]).map(rowToSupplier);
}

export async function createSupplier(s: Omit<Supplier, "id">): Promise<Supplier> {
  const { data, error } = await supabase
    .from("suppliers" as never)
    .insert({
      name: s.name,
      phone: s.phone || null,
      address: s.address || null,
      gstin: s.gstin || null,
    } as never)
    .select()
    .single();
  if (error) throw error;
  return rowToSupplier(data as SupplierRow);
}

export async function updateSupplier(id: string, s: Omit<Supplier, "id">): Promise<Supplier> {
  const { data, error } = await supabase
    .from("suppliers" as never)
    .update({
      name: s.name,
      phone: s.phone || null,
      address: s.address || null,
      gstin: s.gstin || null,
    } as never)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToSupplier(data as SupplierRow);
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from("suppliers" as never).delete().eq("id", id);
  if (error) throw error;
}
