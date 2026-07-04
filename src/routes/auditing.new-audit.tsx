import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { FileSpreadsheet, Upload, X, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({ editId: z.string().uuid().optional() });

export const Route = createFileRoute("/auditing/new-audit")({
  validateSearch: (s) => searchSchema.parse(s),
  component: NewAuditPage,
});

const schema = z.object({
  firm_name: z.string().trim().min(1, "Firm Name is required").max(200),
  owner_name: z.string().trim().min(1, "Owner Name is required").max(200),
  gst_number: z.string().trim().min(1, "GST Number is required").max(20),
  pan_number: z.string().trim().max(20).optional().or(z.literal("")),
  mobile_number: z.string().trim().min(7, "Mobile Number is required").max(20),
  alternate_mobile: z.string().trim().max(20).optional().or(z.literal("")),
  contact_person: z.string().trim().max(200).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").max(200).optional().or(z.literal("")),
  state: z.string().trim().min(1, "State is required").max(100),
  branch_name: z.string().trim().max(200).optional().or(z.literal("")),
  address_line1: z.string().trim().max(300).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  pincode: z.string().trim().min(4, "Pincode is required").max(10),
  remarks: z.string().trim().max(500).optional().or(z.literal("")),
});

type FormState = z.infer<typeof schema>;

const ACCEPTED = [".xlsx", ".xls", ".csv"];

function NewAuditPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({
    firm_name: "",
    owner_name: "",
    gst_number: "",
    pan_number: "",
    mobile_number: "",
    alternate_mobile: "",
    contact_person: "",
    email: "",
    state: "",
    branch_name: "",
    address_line1: "",
    city: "",
    pincode: "",
    remarks: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [file, setFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [parsedRows, setParsedRows] = useState<Record<string, unknown>[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const setField = (k: keyof FormState, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const handleFile = useCallback(async (f: File) => {
    const ext = "." + (f.name.split(".").pop() || "").toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      toast.error("Unsupported file type. Please upload .xlsx, .xls, or .csv");
      return;
    }
    setFile(f);
    setUploadPct(0);
    setParsedRows(null);

    // simulate progress while reading
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 90));
    };
    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        setParsedRows(rows);
        setUploadPct(100);
        toast.success(`Parsed ${rows.length} rows from ${f.name}`);
      } catch {
        toast.error("Failed to read file. Please check the format.");
        setFile(null);
        setUploadPct(0);
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
      setFile(null);
    };
    reader.readAsArrayBuffer(f);
  }, []);

  const removeFile = () => {
    setFile(null);
    setUploadPct(0);
    setParsedRows(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onSubmit = async () => {
    const result = schema.safeParse(form);
    if (!result.success) {
      const errs: Partial<Record<keyof FormState, string>> = {};
      for (const issue of result.error.issues) {
        const k = issue.path[0] as keyof FormState;
        if (!errs[k]) errs[k] = issue.message;
      }
      setErrors(errs);
      toast.error("Please fix the highlighted fields");
      return;
    }
    if (!file || !parsedRows) {
      toast.error("Please upload an inventory file (.xlsx or .csv)");
      return;
    }

    setSubmitting(true);
    try {
      const { data: auditIdData, error: idErr } = await supabase.rpc("next_audit_id");
      if (idErr) throw idErr;
      const auditId = auditIdData as string;

      const { data: userData } = await supabase.auth.getUser();

      const { data: inserted, error: insErr } = await supabase
        .from("audits")
        .insert({
          audit_id: auditId,
          firm_name: form.firm_name,
          owner_name: form.owner_name,
          gst_number: form.gst_number,
          pan_number: form.pan_number || null,
          mobile_number: form.mobile_number,
          alternate_mobile: form.alternate_mobile || null,
          contact_person: form.contact_person || null,
          email: form.email || null,
          state: form.state,
          branch_name: form.branch_name || null,
          address_line1: form.address_line1 || null,
          city: form.city || null,
          pincode: form.pincode,
          remarks: form.remarks || null,
          file_name: file.name,
          file_size: file.size,
          item_count: parsedRows.length,
          status: "draft",
          created_by: userData.user?.id ?? null,
        })
        .select("id, audit_id")
        .single();
      if (insErr) throw insErr;

      // Batch insert items
      const batchSize = 500;
      for (let i = 0; i < parsedRows.length; i += batchSize) {
        const chunk = parsedRows.slice(i, i + batchSize).map((row, idx) => ({
          audit_id: inserted.id,
          row_index: i + idx,
          data: row as unknown as Record<string, string | number | boolean | null>,
        }));
        const { error: itemErr } = await supabase.from("audit_items").insert(chunk);
        if (itemErr) throw itemErr;
      }

      toast.success(`Audit ${inserted.audit_id} created`);
      navigate({ to: "/audit/verification", search: { id: inserted.id } });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to save audit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050b1e] text-white">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.35),_transparent_60%),radial-gradient(ellipse_at_bottom,_rgba(14,165,233,0.25),_transparent_55%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,197,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(148,197,255,0.4) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Blueprint icons */}
      <BlueprintDecor />

      <div className="relative mx-auto max-w-6xl px-6 py-6 animate-fade-in">
        {/* Header */}
        <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-tight">Start New Audit</h1>
            <p className="text-[11px] tracking-widest text-sky-200/60">BEE SQUARE ENTERPRISES</p>
          </div>
          <nav className="flex items-center gap-6 text-sm text-sky-100/80">
            <Link to="/modules" className="hover:text-white transition-colors">Home</Link>
            <Link to="/audit" className="hover:text-white transition-colors">Auditing Dashboard</Link>
            <a href="#contact" className="hover:text-white transition-colors">Contact Us</a>
          </nav>
        </header>

        {/* Title */}
        <section className="text-center pt-10 pb-6">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">New Audit Information</h2>
          <p className="mt-3 text-sky-100/70 text-sm md:text-base">
            Enter the required firm and audit details before beginning the inventory audit.
          </p>
        </section>

        {/* Wizard container */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 md:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
          {/* Section 1 */}
          <h3 className="mt-8 text-lg font-semibold">Section 1 &mdash; Firm Information</h3>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Firm Name" required value={form.firm_name} onChange={(v) => setField("firm_name", v)} error={errors.firm_name} />
            <Input label="Owner Name" required value={form.owner_name} onChange={(v) => setField("owner_name", v)} error={errors.owner_name} />
            <Input label="GST Number" required value={form.gst_number} onChange={(v) => setField("gst_number", v)} error={errors.gst_number} />
            <Input label="PAN Number" value={form.pan_number ?? ""} onChange={(v) => setField("pan_number", v)} error={errors.pan_number} />
            <Input label="Mobile Number" required value={form.mobile_number} onChange={(v) => setField("mobile_number", v)} error={errors.mobile_number} />
            <Input label="Alternate Mobile Number" value={form.alternate_mobile ?? ""} onChange={(v) => setField("alternate_mobile", v)} error={errors.alternate_mobile} />
            <Input label="Contact Person" value={form.contact_person ?? ""} onChange={(v) => setField("contact_person", v)} error={errors.contact_person} />
            <Input label="Email Address" type="email" value={form.email ?? ""} onChange={(v) => setField("email", v)} error={errors.email} />
            <Input label="State" required value={form.state} onChange={(v) => setField("state", v)} error={errors.state} />
            <Input label="Branch Name" value={form.branch_name ?? ""} onChange={(v) => setField("branch_name", v)} error={errors.branch_name} />
            <Input label="Address Line 1" value={form.address_line1 ?? ""} onChange={(v) => setField("address_line1", v)} error={errors.address_line1} />
            <Input label="City" value={form.city ?? ""} onChange={(v) => setField("city", v)} error={errors.city} />
            <Input label="Pincode" required value={form.pincode} onChange={(v) => setField("pincode", v)} error={errors.pincode} />
            <Input label="Remarks" value={form.remarks ?? ""} onChange={(v) => setField("remarks", v)} error={errors.remarks} />
          </div>

          {/* Section 2 */}
          <h3 className="mt-10 text-lg font-semibold">Section 2 &mdash; Add Inventory for Audit</h3>
          <p className="mt-1 text-sm text-sky-100/60">Provide your inventory data in Excel form to proceed with the audit.</p>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className={`mt-4 rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
              dragOver ? "border-sky-300 bg-sky-400/10" : "border-white/15 bg-white/[0.03]"
            }`}
          >
            {!file ? (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-400/30 bg-sky-500/10 text-sky-300">
                  <FileSpreadsheet className="h-8 w-8" />
                </div>
                <p className="mt-4 text-lg font-semibold">File Upload</p>
                <p className="text-sky-100/70 text-sm">Upload Excel Inventory File (.xlsx or .csv)</p>
                <p className="mt-2 text-xs text-sky-100/50">Drag &amp; drop here, or</p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/10 px-5 py-2 text-sm font-medium text-white hover:bg-sky-500/20 hover:shadow-[0_0_20px_rgba(56,189,248,0.35)] transition-all"
                >
                  <Upload className="h-4 w-4" /> Browse File
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </>
            ) : (
              <div className="mx-auto max-w-xl text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/10 text-sky-300">
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="text-xs text-sky-100/60">
                      {(file.size / 1024).toFixed(1)} KB
                      {parsedRows && ` • ${parsedRows.length} rows`}
                    </p>
                  </div>
                  {uploadPct === 100 ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  ) : null}
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-sky-100/60 hover:text-white transition-colors"
                    aria-label="Remove file"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all"
                    style={{ width: `${uploadPct}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-sky-100/60">{uploadPct}%</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col-reverse sm:flex-row items-center justify-center gap-3">
            <Link
              to="/audit"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-all"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full border border-sky-400/50 bg-gradient-to-b from-sky-500/40 to-blue-600/40 px-7 py-2.5 text-sm font-semibold text-white transition-all hover:from-sky-400/60 hover:to-blue-500/60 hover:shadow-[0_0_28px_rgba(56,189,248,0.6)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Process Data and Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function Input({
  label,
  required,
  value,
  onChange,
  error,
  type = "text",
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-sky-100/80">
        {label}
        {required && <span className="text-sky-300"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-sky-100/30 outline-none transition-all focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(56,189,248,0.2)] ${
          error ? "border-red-400/60" : "border-white/10 focus:border-sky-400/60"
        }`}
      />
      {error && <span className="mt-1 block text-[11px] text-red-300">{error}</span>}
    </label>
  );
}

function BlueprintDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.09]">
      <svg className="absolute -left-10 top-24 h-72 w-72 text-sky-300" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.6">
        <circle cx="50" cy="50" r="20" />
        <circle cx="50" cy="50" r="30" />
        <circle cx="50" cy="50" r="10" />
        {[...Array(12)].map((_, i) => (
          <line key={i} x1="50" y1="50" x2={50 + 30 * Math.cos((i * Math.PI) / 6)} y2={50 + 30 * Math.sin((i * Math.PI) / 6)} />
        ))}
      </svg>
      <svg className="absolute -right-8 top-40 h-80 w-80 text-sky-300" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.6">
        <rect x="15" y="35" width="70" height="30" rx="3" />
        <rect x="25" y="25" width="15" height="10" />
        <circle cx="30" cy="70" r="6" />
        <circle cx="70" cy="70" r="6" />
        <line x1="15" y1="50" x2="85" y2="50" />
      </svg>
      <svg className="absolute bottom-10 left-1/3 h-56 w-56 text-sky-300" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.6">
        <path d="M10 60 L30 60 L35 45 L65 45 L70 60 L90 60 L90 75 L10 75 Z" />
        <circle cx="30" cy="75" r="5" />
        <circle cx="70" cy="75" r="5" />
      </svg>
    </div>
  );
}
