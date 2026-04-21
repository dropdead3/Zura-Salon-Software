-- Wave 13A.B3 — convert org_setup_drafts.current_step from text to integer
-- so the resume-from-last-step logic works (was always false because typeof "3" === "string").
ALTER TABLE public.org_setup_drafts
  ALTER COLUMN current_step TYPE integer
  USING NULLIF(current_step, '')::integer;