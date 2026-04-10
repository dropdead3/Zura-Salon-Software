-- Drop old policies
DROP POLICY IF EXISTS "Org members can view voided transactions" ON public.voided_transactions;
DROP POLICY IF EXISTS "Org admins can void transactions" ON public.voided_transactions;

-- Align SELECT with phorest_transaction_items leadership policy
CREATE POLICY "Leadership can view voided transactions"
  ON public.voided_transactions FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR EXISTS (
      SELECT 1 FROM employee_profiles
      WHERE employee_profiles.user_id = auth.uid()
        AND employee_profiles.is_super_admin = true
    )
  );

-- Align INSERT with leadership only
CREATE POLICY "Leadership can void transactions"
  ON public.voided_transactions FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR EXISTS (
      SELECT 1 FROM employee_profiles
      WHERE employee_profiles.user_id = auth.uid()
        AND employee_profiles.is_super_admin = true
    )
  );