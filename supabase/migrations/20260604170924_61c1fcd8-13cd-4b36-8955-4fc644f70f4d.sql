INSERT INTO public.bill_counters (key, value)
VALUES (
  (CASE WHEN EXTRACT(MONTH FROM now()) >= 4
    THEN lpad((EXTRACT(YEAR FROM now())::int % 100)::text, 2, '0') || '-' || lpad(((EXTRACT(YEAR FROM now())::int + 1) % 100)::text, 2, '0')
    ELSE lpad(((EXTRACT(YEAR FROM now())::int - 1) % 100)::text, 2, '0') || '-' || lpad((EXTRACT(YEAR FROM now())::int % 100)::text, 2, '0')
  END),
  15
)
ON CONFLICT (key) DO UPDATE SET value = 15;