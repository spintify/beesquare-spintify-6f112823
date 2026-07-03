
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  address text,
  gstin text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY suppliers_all ON public.suppliers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.purchases ADD CONSTRAINT purchases_purchase_number_key UNIQUE (purchase_number);
