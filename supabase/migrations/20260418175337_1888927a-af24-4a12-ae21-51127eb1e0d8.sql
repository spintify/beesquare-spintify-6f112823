create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  product_id text not null unique,
  price numeric(12,2) not null default 0,
  discount numeric(5,2) not null default 0,
  quantity integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.buyers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  gstin text,
  phone text,
  created_at timestamptz not null default now()
);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  bill_number text not null unique,
  date timestamptz not null default now(),
  customer_name text,
  customer_phone text,
  customer_address text,
  customer_gstin text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  total_discount numeric(12,2) not null default 0,
  taxable numeric(12,2) not null default 0,
  gst_rate numeric(5,2) not null default 18,
  gst_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.bill_counters (
  key text primary key,
  value integer not null default 0
);
insert into public.bill_counters (key, value) values ('global', 0);

create or replace function public.next_bill_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  mon text;
  yy text;
begin
  update public.bill_counters set value = value + 1 where key = 'global' returning value into n;
  if n is null then
    insert into public.bill_counters (key, value) values ('global', 1) returning value into n;
  end if;
  mon := upper(to_char(now(), 'Mon'));
  yy := to_char(now(), 'YY');
  return mon || yy || lpad(n::text, 4, '0');
end;
$$;

create or replace function public.adjust_stock(_product_id text, _delta integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
    set quantity = greatest(0, quantity + _delta), updated_at = now()
    where product_id = _product_id;
end;
$$;

alter table public.products enable row level security;
alter table public.buyers enable row level security;
alter table public.bills enable row level security;
alter table public.bill_counters enable row level security;

create policy "products_all" on public.products for all using (true) with check (true);
create policy "buyers_all" on public.buyers for all using (true) with check (true);
create policy "bills_all" on public.bills for all using (true) with check (true);
create policy "bill_counters_all" on public.bill_counters for all using (true) with check (true);