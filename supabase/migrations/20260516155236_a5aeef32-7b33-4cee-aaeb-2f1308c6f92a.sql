create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_number text not null,
  date timestamptz not null default now(),
  supplier_name text,
  supplier_phone text,
  supplier_address text,
  supplier_gstin text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0,
  gst_amount numeric not null default 0,
  total numeric not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.purchases enable row level security;
create policy "purchases_all" on public.purchases for all using (true) with check (true);
create index if not exists purchases_date_idx on public.purchases(date desc);