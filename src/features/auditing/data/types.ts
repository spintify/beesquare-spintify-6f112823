export type AuditStatus = "Draft" | "In Progress" | "Submitted" | "Approved" | "Rejected" | "Completed";
export type Priority = "Low" | "Medium" | "High" | "Critical";
export type VarianceStatus = "Verified" | "Missing" | "Extra Stock" | "Damaged" | "Mismatch";
export type Role = "Administrator" | "Audit Manager" | "Senior Auditor" | "Auditor" | "Warehouse Manager" | "Viewer";

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  city: string;
}
export interface Dealer {
  id: string;
  name: string;
  code: string;
  city: string;
  gstin: string;
}
export interface Auditor {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}
export interface Part {
  id: string;
  partNumber: string;
  oemCode: string;
  name: string;
  brand: string;
  supplier: string;
  category: string;
  barcode: string;
  price: number;
  systemQty: number;
  warehouseId: string;
  location: string;
  bin: string;
}
export interface AuditItem {
  partId: string;
  systemQty: number;
  physicalQty: number | null;
  status: VarianceStatus;
  remarks?: string;
}
export interface Audit {
  id: string;
  name: string;
  auditNumber: string;
  status: AuditStatus;
  priority: Priority;
  warehouseId: string;
  dealerId: string;
  category: string;
  assigneeId: string;
  dueDate: string;
  createdAt: string;
  completedAt?: string;
  notes?: string;
  items: AuditItem[];
}
export interface ActivityEvent {
  id: string;
  when: string;
  actor: string;
  message: string;
  kind: "assigned" | "completed" | "mismatch" | "approval" | "report" | "diff";
}
export interface OemRecord {
  partId: string;
  dealer: { price: number; stock: number; invoiceNo: string; gst: number };
  oem: { price: number; stock: number; invoiceNo: string; gst: number };
  system: { price: number; stock: number; invoiceNo: string; gst: number };
}
