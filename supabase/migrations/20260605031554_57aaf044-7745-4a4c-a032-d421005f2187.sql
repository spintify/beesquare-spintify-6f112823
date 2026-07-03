
-- Lock all tables to authenticated users only
DROP POLICY IF EXISTS bills_all ON public.bills;
DROP POLICY IF EXISTS buyers_all ON public.buyers;
DROP POLICY IF EXISTS products_all ON public.products;
DROP POLICY IF EXISTS purchases_all ON public.purchases;
DROP POLICY IF EXISTS suppliers_all ON public.suppliers;
DROP POLICY IF EXISTS bill_counters_all ON public.bill_counters;

CREATE POLICY bills_auth ON public.bills FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY buyers_auth ON public.buyers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY products_auth ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY purchases_auth ON public.purchases FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY suppliers_auth ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY bill_counters_auth ON public.bill_counters FOR ALL TO authenticated USING (true) WITH CHECK (true);

REVOKE ALL ON public.bills FROM anon;
REVOKE ALL ON public.buyers FROM anon;
REVOKE ALL ON public.products FROM anon;
REVOKE ALL ON public.purchases FROM anon;
REVOKE ALL ON public.suppliers FROM anon;
REVOKE ALL ON public.bill_counters FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bill_counters TO authenticated;

-- Revoke execute on SECURITY DEFINER functions from anon
REVOKE EXECUTE ON FUNCTION public.next_bill_number() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.next_bill_number_for(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.adjust_stock(text, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.next_bill_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_bill_number_for(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_stock(text, integer) TO authenticated;
