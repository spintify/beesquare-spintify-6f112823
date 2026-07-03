
CREATE TABLE public.audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id TEXT NOT NULL UNIQUE,
  firm_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  gst_number TEXT NOT NULL,
  pan_number TEXT,
  mobile_number TEXT NOT NULL,
  alternate_mobile TEXT,
  contact_person TEXT,
  email TEXT,
  state TEXT NOT NULL,
  branch_name TEXT,
  address_line1 TEXT,
  city TEXT,
  pincode TEXT NOT NULL,
  remarks TEXT,
  file_name TEXT,
  file_size BIGINT,
  item_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audits TO authenticated;
GRANT ALL ON public.audits TO service_role;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audits_auth_all" ON public.audits FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.audit_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_items_audit_id_idx ON public.audit_items(audit_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_items TO authenticated;
GRANT ALL ON public.audit_items TO service_role;
ALTER TABLE public.audit_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_items_auth_all" ON public.audit_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.audit_counters (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_counters TO authenticated;
GRANT ALL ON public.audit_counters TO service_role;
ALTER TABLE public.audit_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_counters_auth_all" ON public.audit_counters FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.next_audit_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d TEXT;
  n INTEGER;
BEGIN
  d := to_char(now(), 'YYYYMMDD');
  INSERT INTO public.audit_counters (key, value)
    VALUES (d, 1)
    ON CONFLICT (key) DO UPDATE SET value = public.audit_counters.value + 1
    RETURNING value INTO n;
  RETURN 'AUD-' || d || '-' || lpad(n::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER audits_set_updated_at BEFORE UPDATE ON public.audits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
