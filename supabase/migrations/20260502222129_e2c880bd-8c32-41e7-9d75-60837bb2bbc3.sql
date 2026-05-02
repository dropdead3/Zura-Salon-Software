-- Reputation Engine P0: enforce review_compliance_log append-only at the DB layer.
-- Doctrine: review_compliance_log is the audit trail for the reputation engine.
-- Any mutation (UPDATE/DELETE) silently breaks the due-diligence guarantee.
-- RLS already omits UPDATE/DELETE policies, but a trigger makes the contract
-- explicit and survives any future policy change (incl. service-role writes).

CREATE OR REPLACE FUNCTION public.prevent_review_compliance_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'review_compliance_log is append-only (operation: %)', TG_OP
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS review_compliance_log_no_update ON public.review_compliance_log;
DROP TRIGGER IF EXISTS review_compliance_log_no_delete ON public.review_compliance_log;

CREATE TRIGGER review_compliance_log_no_update
  BEFORE UPDATE ON public.review_compliance_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_review_compliance_log_mutation();

CREATE TRIGGER review_compliance_log_no_delete
  BEFORE DELETE ON public.review_compliance_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_review_compliance_log_mutation();