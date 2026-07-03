CREATE OR REPLACE FUNCTION public.next_bill_number_for(_fy text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  n integer;
begin
  insert into public.bill_counters (key, value)
    values (_fy, 1)
    on conflict (key) do update set value = public.bill_counters.value + 1
    returning value into n;
  return n;
end;
$function$;

-- Ensure the key has a unique/PK constraint for ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.bill_counters'::regclass
      AND contype IN ('p','u')
  ) THEN
    ALTER TABLE public.bill_counters ADD PRIMARY KEY (key);
  END IF;
END$$;