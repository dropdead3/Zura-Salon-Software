-- ============================================================
-- Wave S8a (final v2): Pre-supply customer_number to bypass trigger
-- Wave S8d: Disconnect-readiness gate
-- ============================================================

INSERT INTO public.clients (
  phorest_client_id, organization_id, location_id,
  first_name, last_name, email, email_normalized, phone, phone_normalized, landline,
  birthday, gender, client_since, first_visit, last_visit_date,
  visit_count, total_spend, is_vip, is_banned, ban_reason, banned_at, banned_by,
  is_archived, archived_at, archived_by, notes, medical_alerts,
  preferred_stylist_id, preferred_services, customer_number, referred_by, client_category,
  prompt_client_notes, prompt_appointment_notes, reminder_email_opt_in, reminder_sms_opt_in,
  branch_name, address_line1, address_line2, city, state, zip, country,
  lead_source, external_id, import_source, imported_at, status, is_placeholder, is_active
)
SELECT
  pc.phorest_client_id,
  l.organization_id,
  l.id,
  COALESCE(NULLIF(pc.first_name, ''), split_part(pc.name, ' ', 1), 'Unknown'),
  COALESCE(NULLIF(pc.last_name, ''), NULLIF(substring(pc.name FROM position(' ' IN pc.name) + 1), ''), ''),
  pc.email, pc.email_normalized, pc.phone, pc.phone_normalized, pc.landline,
  pc.birthday, pc.gender, pc.client_since, pc.first_visit, pc.last_visit::date,
  COALESCE(pc.visit_count, 0), COALESCE(pc.total_spend, 0),
  COALESCE(pc.is_vip, false), COALESCE(pc.is_banned, false), pc.ban_reason, pc.banned_at, pc.banned_by,
  COALESCE(pc.is_archived, false), pc.archived_at, pc.archived_by, pc.notes, pc.medical_alerts,
  pc.preferred_stylist_id, pc.preferred_services,
  -- Deterministic, unique customer_number derived from phorest_client_id.
  -- Bypasses the auto-generate trigger (which only fires when NULL).
  -- 'PHO-' prefix avoids collision with native 'ZU-' sequence.
  'PHO-' || substring(pc.phorest_client_id FROM 1 FOR 16),
  pc.referred_by, pc.client_category,
  pc.prompt_client_notes, pc.prompt_appointment_notes, pc.reminder_email_opt_in, pc.reminder_sms_opt_in,
  pc.branch_name, pc.address_line1, pc.address_line2, pc.city, pc.state, pc.zip, pc.country,
  pc.lead_source, pc.external_client_id,
  'phorest_sync_s8_backfill', now(), 'active', false, true
FROM public.phorest_clients pc
LEFT JOIN public.locations l ON l.id = pc.location_id
WHERE pc.phorest_client_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.phorest_client_id = pc.phorest_client_id
  );

-- Unique partial index on phorest_client_id (accelerates dual-write upserts)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_phorest_client_id
  ON public.clients(phorest_client_id)
  WHERE phorest_client_id IS NOT NULL;

-- S8d: Register disconnect-readiness gate (default OFF for all orgs)
INSERT INTO public.organization_features (organization_id, feature_key, is_enabled, created_at, updated_at)
SELECT
  o.id,
  'gate_phorest_disconnect_ready',
  false,
  now(),
  now()
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_features f
  WHERE f.organization_id = o.id
    AND f.feature_key = 'gate_phorest_disconnect_ready'
);
