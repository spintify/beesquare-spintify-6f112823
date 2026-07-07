
-- Lock down counter tables: only SECURITY DEFINER functions may mutate them.
DROP POLICY IF EXISTS audit_counters_auth_all ON public.audit_counters;
DROP POLICY IF EXISTS bill_counters_auth ON public.bill_counters;

REVOKE ALL ON public.audit_counters FROM anon, authenticated;
REVOKE ALL ON public.bill_counters FROM anon, authenticated;
GRANT ALL ON public.audit_counters TO service_role;
GRANT ALL ON public.bill_counters TO service_role;

-- RLS remains enabled with no policies -> denies all direct client access.
-- SECURITY DEFINER RPCs (next_bill_number_for, next_audit_id) continue to work.

-- Restrict EXECUTE on SECURITY DEFINER functions: no anon, only authenticated.
REVOKE ALL ON FUNCTION public.adjust_stock(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.next_bill_number() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.next_bill_number_for(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.next_audit_id() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.adjust_stock(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_bill_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_bill_number_for(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_audit_id() TO authenticated;
