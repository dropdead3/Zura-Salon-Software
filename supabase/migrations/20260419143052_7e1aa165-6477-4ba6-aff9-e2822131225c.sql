-- ============================================================
-- Wave 28.1 — Policy Operating System foundation
-- ============================================================

-- ---------- ENUMS ----------
DO $$ BEGIN
  CREATE TYPE public.policy_category AS ENUM (
    'team', 'client', 'extensions', 'financial', 'facility', 'management'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.policy_audience AS ENUM ('internal', 'external', 'both');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.policy_status AS ENUM (
    'not_started', 'drafting', 'configured', 'needs_review',
    'approved_internal', 'published_external', 'wired', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.policy_recommendation AS ENUM ('required', 'recommended', 'optional');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.policy_variant_type AS ENUM (
    'internal', 'client', 'disclosure', 'manager_note'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.policy_surface AS ENUM (
    'handbook', 'client_page', 'booking', 'checkout', 'intake', 'manager', 'sop'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.policy_scope_type AS ENUM (
    'role', 'employment_type', 'service_category', 'location', 'audience'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- POLICY LIBRARY (platform-wide catalog) ----------
CREATE TABLE IF NOT EXISTS public.policy_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  category policy_category NOT NULL,
  audience policy_audience NOT NULL,
  recommendation policy_recommendation NOT NULL DEFAULT 'recommended',
  title TEXT NOT NULL,
  short_description TEXT NOT NULL,
  why_it_matters TEXT,
  candidate_surfaces policy_surface[] NOT NULL DEFAULT '{}',
  default_owner_role TEXT,
  requires_extensions BOOLEAN NOT NULL DEFAULT false,
  requires_retail BOOLEAN NOT NULL DEFAULT false,
  requires_packages BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.policy_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read policy library"
  ON public.policy_library FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Platform users can manage policy library"
  ON public.policy_library FOR ALL
  TO authenticated
  USING (public.is_platform_user(auth.uid()))
  WITH CHECK (public.is_platform_user(auth.uid()));

-- ---------- POLICIES (per-org instances) ----------
CREATE TABLE IF NOT EXISTS public.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  library_key TEXT NOT NULL REFERENCES public.policy_library(key),
  category policy_category NOT NULL,
  audience policy_audience NOT NULL,
  internal_title TEXT NOT NULL,
  external_title TEXT,
  intent TEXT,
  status policy_status NOT NULL DEFAULT 'not_started',
  primary_owner_role TEXT,
  current_version_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, library_key)
);

ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view policies"
  ON public.policies FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can create policies"
  ON public.policies FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update policies"
  ON public.policies FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete policies"
  ON public.policies FOR DELETE
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_policies_org ON public.policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_policies_org_status ON public.policies(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_policies_org_category ON public.policies(organization_id, category);

-- ---------- POLICY VERSIONS ----------
CREATE TABLE IF NOT EXISTS public.policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  changelog_summary TEXT,
  is_published_external BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (policy_id, version_number)
);

ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view policy versions"
  ON public.policy_versions FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage policy versions"
  ON public.policy_versions FOR ALL
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_policy_versions_policy ON public.policy_versions(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_versions_org ON public.policy_versions(organization_id);

-- Now that policy_versions exists, add the FK from policies.current_version_id
ALTER TABLE public.policies
  ADD CONSTRAINT policies_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES public.policy_versions(id) ON DELETE SET NULL;

-- ---------- POLICY RULE BLOCKS ----------
CREATE TABLE IF NOT EXISTS public.policy_rule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.policy_versions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  block_key TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  required BOOLEAN NOT NULL DEFAULT false,
  ordering INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (version_id, block_key)
);

ALTER TABLE public.policy_rule_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view policy rule blocks"
  ON public.policy_rule_blocks FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage policy rule blocks"
  ON public.policy_rule_blocks FOR ALL
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_policy_rule_blocks_version ON public.policy_rule_blocks(version_id);

-- ---------- POLICY APPLICABILITY ----------
CREATE TABLE IF NOT EXISTS public.policy_applicability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.policy_versions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scope_type policy_scope_type NOT NULL,
  scope_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (version_id, scope_type, scope_value)
);

ALTER TABLE public.policy_applicability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view policy applicability"
  ON public.policy_applicability FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage policy applicability"
  ON public.policy_applicability FOR ALL
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_policy_applicability_version ON public.policy_applicability(version_id);

-- ---------- POLICY VARIANTS (4 renderings) ----------
CREATE TABLE IF NOT EXISTS public.policy_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.policy_versions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  variant_type policy_variant_type NOT NULL,
  body_md TEXT,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  ai_model TEXT,
  last_drafted_at TIMESTAMPTZ,
  approved BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (version_id, variant_type)
);

ALTER TABLE public.policy_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view policy variants"
  ON public.policy_variants FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage policy variants"
  ON public.policy_variants FOR ALL
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_policy_variants_version ON public.policy_variants(version_id);

-- ---------- POLICY SURFACE MAPPINGS ----------
CREATE TABLE IF NOT EXISTS public.policy_surface_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.policy_versions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  surface policy_surface NOT NULL,
  variant_type policy_variant_type NOT NULL,
  surface_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (version_id, surface)
);

ALTER TABLE public.policy_surface_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view policy surface mappings"
  ON public.policy_surface_mappings FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage policy surface mappings"
  ON public.policy_surface_mappings FOR ALL
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_policy_surface_mappings_version ON public.policy_surface_mappings(version_id);
CREATE INDEX IF NOT EXISTS idx_policy_surface_mappings_org_surface ON public.policy_surface_mappings(organization_id, surface);

-- ---------- POLICY EXCEPTIONS ----------
CREATE TABLE IF NOT EXISTS public.policy_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  authority_role TEXT NOT NULL,
  scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  documentation_required JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.policy_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view policy exceptions"
  ON public.policy_exceptions FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage policy exceptions"
  ON public.policy_exceptions FOR ALL
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_policy_exceptions_policy ON public.policy_exceptions(policy_id);

-- ---------- POLICY ACKNOWLEDGMENTS (placeholder for Wave 32 unified ledger) ----------
CREATE TABLE IF NOT EXISTS public.policy_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  policy_version_id UUID NOT NULL REFERENCES public.policy_versions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id UUID,
  surface policy_surface NOT NULL,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.policy_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org leadership can view acknowledgments"
  ON public.policy_acknowledgments FOR SELECT
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Users can view their own acknowledgments"
  ON public.policy_acknowledgments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own acknowledgments in their org"
  ON public.policy_acknowledgments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_org_member(auth.uid(), organization_id)
  );

CREATE INDEX IF NOT EXISTS idx_policy_acks_org ON public.policy_acknowledgments(organization_id);
CREATE INDEX IF NOT EXISTS idx_policy_acks_version ON public.policy_acknowledgments(policy_version_id);
CREATE INDEX IF NOT EXISTS idx_policy_acks_user ON public.policy_acknowledgments(user_id);

-- ---------- updated_at triggers ----------
CREATE TRIGGER update_policy_library_updated_at
  BEFORE UPDATE ON public.policy_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_policies_updated_at
  BEFORE UPDATE ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_policy_versions_updated_at
  BEFORE UPDATE ON public.policy_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_policy_rule_blocks_updated_at
  BEFORE UPDATE ON public.policy_rule_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_policy_variants_updated_at
  BEFORE UPDATE ON public.policy_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_policy_surface_mappings_updated_at
  BEFORE UPDATE ON public.policy_surface_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_policy_exceptions_updated_at
  BEFORE UPDATE ON public.policy_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- SEED: 47 Policy Library entries
-- ============================================================
INSERT INTO public.policy_library
  (key, category, audience, recommendation, title, short_description, why_it_matters, candidate_surfaces, default_owner_role, requires_extensions, requires_retail, requires_packages, display_order)
VALUES
  -- TEAM (Group A) — 18
  ('culture_values', 'team', 'internal', 'recommended', 'Culture & Values', 'Mission, values, professionalism standards, anti-gossip and respect baseline.', 'Defines the cultural floor. Without it, accountability conversations have no anchor.', ARRAY['handbook','sop']::policy_surface[], 'admin', false, false, false, 100),
  ('employment_classifications', 'team', 'internal', 'required', 'Employment Classifications', 'W2 full-time, part-time, probationary periods, benefit eligibility thresholds.', 'Determines benefits eligibility, scheduling priority, and legal compliance.', ARRAY['handbook','sop']::policy_surface[], 'admin', false, false, false, 110),
  ('attendance_punctuality', 'team', 'internal', 'required', 'Attendance & Punctuality', 'Tardy thresholds, grace periods, call-out windows, no-show definition, escalation.', 'Prevents drift in operational reliability and gives managers a clear escalation path.', ARRAY['handbook','manager','sop']::policy_surface[], 'manager', false, false, false, 120),
  ('scheduling_availability', 'team', 'internal', 'recommended', 'Scheduling & Availability', 'Who sets schedules, required windows, weekend expectations, swap rules.', 'Eliminates ambiguity around shift ownership and weekend coverage.', ARRAY['handbook','manager']::policy_surface[], 'manager', false, false, false, 130),
  ('timekeeping_breaks', 'team', 'internal', 'required', 'Timekeeping & Breaks', 'Time clock rules, missed punch handling, meal breaks, paid/unpaid break treatment.', 'Wage and hour compliance — the single highest-risk team policy.', ARRAY['handbook','sop']::policy_surface[], 'manager', false, false, false, 140),
  ('compensation_overview', 'team', 'internal', 'required', 'Compensation Overview', 'Hourly/salary/commission structure, pay timing, deduction disclaimers.', 'Sets expectations and prevents pay disputes.', ARRAY['handbook']::policy_surface[], 'admin', false, false, false, 150),
  ('benefits_pto_sick', 'team', 'internal', 'recommended', 'Benefits, PTO & Sick Leave', 'Eligibility, waiting periods, blackout windows, accrual vs lump sum, carryover.', 'Drives retention and removes ambiguity around time-off requests.', ARRAY['handbook']::policy_surface[], 'admin', false, false, false, 160),
  ('performance_expectations', 'team', 'internal', 'recommended', 'Performance Expectations', 'Client experience standards, rebooking, retail, education, role-specific KPIs.', 'Converts vague "do good work" into measurable behaviors.', ARRAY['handbook','manager']::policy_surface[], 'manager', false, false, false, 170),
  ('promotions_advancement', 'team', 'internal', 'optional', 'Promotions & Advancement', 'Level system, review cadence, advancement criteria, approval path.', 'Required if you operate a stylist leveling system.', ARRAY['handbook']::policy_surface[], 'admin', false, false, false, 180),
  ('dress_code_appearance', 'team', 'internal', 'recommended', 'Dress Code & Appearance', 'Presentation standard, prohibited attire, grooming, branding expectations.', 'Brand consistency on the floor.', ARRAY['handbook']::policy_surface[], 'manager', false, false, false, 190),
  ('social_media_branding', 'team', 'internal', 'recommended', 'Social Media & Branding', 'Posting rules, brand tagging, content ownership, conflict of interest.', 'Protects brand and prevents content disputes after departure.', ARRAY['handbook','sop']::policy_surface[], 'admin', false, false, false, 200),
  ('cleanliness_sanitation', 'team', 'internal', 'required', 'Cleanliness & Sanitation', 'Station reset, backbar, laundry, tool sanitation, opening/closing standards.', 'Health code compliance and client experience floor.', ARRAY['handbook','sop']::policy_surface[], 'manager', false, false, false, 210),
  ('technology_device_usage', 'team', 'internal', 'recommended', 'Technology & Device Usage', 'POS usage, login sharing, personal phones, client data privacy, on-premises camera rules.', 'Prevents data leaks and personal-device distractions.', ARRAY['handbook','sop']::policy_surface[], 'admin', false, false, false, 220),
  ('professional_conduct', 'team', 'internal', 'recommended', 'Professional Conduct & Communication', 'Gossip, professionalism, chain of command, in-person and digital conduct.', 'The day-to-day enforcement layer beneath culture.', ARRAY['handbook','manager']::policy_surface[], 'manager', false, false, false, 230),
  ('complaint_resolution', 'team', 'internal', 'recommended', 'Complaint Resolution & Reporting', 'Internal issue reporting, escalation paths, retaliation protection.', 'Legal protection and culture safety net.', ARRAY['handbook','sop']::policy_surface[], 'admin', false, false, false, 240),
  ('progressive_discipline', 'team', 'internal', 'required', 'Progressive Discipline', 'Verbal, written, final warning, termination, documentation expectations.', 'Without this, every termination is a legal risk.', ARRAY['handbook','manager','sop']::policy_surface[], 'admin', false, false, false, 250),
  ('confidentiality_trade', 'team', 'internal', 'recommended', 'Confidentiality & Trade Information', 'Client data, pricing, business operations, internal strategy protection.', 'IP and competitive protection.', ARRAY['handbook']::policy_surface[], 'admin', false, false, false, 260),
  ('separation_offboarding', 'team', 'internal', 'recommended', 'Separation & Offboarding', 'Notice expectations, final paycheck timing, property return, client record rules.', 'Prevents messy departures and client poaching disputes.', ARRAY['handbook','sop']::policy_surface[], 'admin', false, false, false, 270),

  -- CLIENT (Group B) — 15
  ('booking_policy', 'client', 'external', 'required', 'Booking Policy', 'Reservation rules, payment-on-file requirements, online booking restrictions, minors.', 'Sets the contract for every appointment.', ARRAY['client_page','booking','sop']::policy_surface[], 'manager', false, false, false, 300),
  ('deposit_policy', 'client', 'external', 'required', 'Deposit Policy', 'Required vs optional, by service, fixed vs %, forfeiture triggers, exception authority.', 'Direct revenue protection — the highest-leverage client policy.', ARRAY['client_page','booking','checkout','manager']::policy_surface[], 'manager', false, false, false, 310),
  ('cancellation_policy', 'client', 'external', 'required', 'Cancellation Policy', 'Notice window, same-day treatment, deposit handling, illness exceptions, fees by service.', 'Protects against last-minute revenue loss.', ARRAY['client_page','booking','checkout','manager','sop']::policy_surface[], 'manager', false, false, false, 320),
  ('no_show_policy', 'client', 'external', 'required', 'No-Show Policy', 'No-show definition, fees, rebooking restrictions, repeated-incident escalation.', 'Pairs with deposits and cancellation as the revenue protection trio.', ARRAY['client_page','booking','checkout','manager']::policy_surface[], 'manager', false, false, false, 330),
  ('late_arrival_policy', 'client', 'external', 'recommended', 'Late Arrival Policy', 'Grace period, shortened service rules, reschedule threshold, fee treatment.', 'Prevents schedule cascade from late arrivals.', ARRAY['client_page','booking','sop']::policy_surface[], 'manager', false, false, false, 340),
  ('consultation_policy', 'client', 'external', 'recommended', 'Consultation Policy', 'Required services, paid vs free, fee credit, expiration, strand test, virtual rules.', 'Required for color and extension service quality control.', ARRAY['client_page','booking','intake']::policy_surface[], 'manager', false, false, false, 350),
  ('redo_policy', 'client', 'external', 'required', 'Service Satisfaction & Redo Policy', 'Eligibility window, qualifications, exclusions, documentation, approver, escalation.', 'Defines what is goodwill vs covered work — eliminates manager improvisation.', ARRAY['client_page','manager','sop']::policy_surface[], 'manager', false, false, false, 360),
  ('refund_service_policy', 'client', 'external', 'required', 'Service Refund Policy', 'Default no-refund or limited refund, circumstances, approval thresholds, documentation.', 'Stops dissatisfied clients from setting policy by negotiation.', ARRAY['client_page','manager','sop']::policy_surface[], 'admin', false, false, false, 370),
  ('retail_return_policy', 'client', 'external', 'recommended', 'Retail Return & Exchange Policy', 'Eligible products, unopened-only, return window, damaged item handling, final sale categories.', 'Required if you sell retail.', ARRAY['client_page','checkout','sop']::policy_surface[], 'manager', false, true, false, 380),
  ('package_membership_policy', 'client', 'external', 'recommended', 'Package & Membership Policy', 'Expiration, transferability, refundability, missed appointment impact, pause rules.', 'Required if you sell packages or memberships.', ARRAY['client_page','checkout','sop']::policy_surface[], 'admin', false, false, true, 390),
  ('gift_card_policy', 'client', 'external', 'optional', 'Gift Card Policy', 'Expiration (state-law aware), promotional limitations, lost card replacement, refundability.', 'Required if you sell gift cards.', ARRAY['client_page','checkout']::policy_surface[], 'admin', false, true, false, 400),
  ('child_guest_policy', 'client', 'external', 'recommended', 'Child & Guest Policy', 'Children allowed, extra guests, service area access, liability framing.', 'Prevents floor disruption and liability ambiguity.', ARRAY['client_page','booking']::policy_surface[], 'manager', false, false, false, 410),
  ('pet_policy', 'client', 'external', 'optional', 'Pet Policy', 'Service animals only, staff pets, owner discretion.', 'Required for ADA compliance clarity.', ARRAY['client_page']::policy_surface[], 'manager', false, false, false, 420),
  ('photo_consent_policy', 'client', 'external', 'recommended', 'Photo & Social Media Client Consent', 'Before/after capture, opt-in/out, content use, consent flow, revocation.', 'Required for content marketing programs.', ARRAY['client_page','intake','sop']::policy_surface[], 'manager', false, false, false, 430),
  ('health_safety_policy', 'client', 'external', 'recommended', 'Health, Safety & Contraindication', 'Illness rescheduling, lice/skin conditions, allergy alerts, patch test, liability acknowledgment.', 'Protects clients and staff from contagious or contraindicated services.', ARRAY['client_page','intake','sop']::policy_surface[], 'manager', false, false, false, 440),

  -- EXTENSIONS (Group C) — 10 (gated by requires_extensions)
  ('extension_consultation', 'extensions', 'external', 'required', 'Extension Consultation Policy', 'Mandatory consultation, color matching, strand test, install prerequisites, quote validity.', 'Sets quality and expectation floor before custom hair is ordered.', ARRAY['client_page','booking','intake']::policy_surface[], 'manager', true, false, false, 500),
  ('extension_deposit', 'extensions', 'external', 'required', 'Extension Deposit & Prepayment', 'Hair order deposit, service deposit, payment timing, special order treatment, cancellation after order.', 'Custom hair orders are the highest-cost commitment in the salon.', ARRAY['client_page','booking','checkout','manager']::policy_surface[], 'manager', true, false, false, 510),
  ('hair_order_special_order', 'extensions', 'external', 'required', 'Hair Order & Special Order Policy', 'Custom orders final sale, lead times, color match limits, returnability, rush handling.', 'Required to protect against custom-order disputes.', ARRAY['client_page','intake','manager']::policy_surface[], 'manager', true, false, false, 520),
  ('extension_install', 'extensions', 'external', 'recommended', 'Extension Installation Policy', 'Clean hair requirement, arrival prep, product restrictions, lateness impact.', 'Prevents install delays and quality issues.', ARRAY['client_page','intake']::policy_surface[], 'manager', true, false, false, 530),
  ('extension_maintenance', 'extensions', 'external', 'required', 'Maintenance & Move-Up Policy', 'Required frequency, overdue consequences, removed liability, timing expectations.', 'Defines when warranty coverage ends.', ARRAY['client_page','intake','manager','sop']::policy_surface[], 'manager', true, false, false, 540),
  ('extension_aftercare', 'extensions', 'external', 'required', 'Extension Care Policy', 'Washing, heat, products, swimming, sleeping, brushing — care compliance language.', 'Pairs with warranty exclusions to define client responsibility.', ARRAY['client_page','intake','sop']::policy_surface[], 'manager', true, false, false, 550),
  ('extension_redo_adjustment', 'extensions', 'external', 'required', 'Extension Redo & Adjustment', 'Adjustment qualifications (slipping, weft movement), time window, voids, neglect treatment.', 'Defines covered vs goodwill adjustments.', ARRAY['client_page','manager','sop']::policy_surface[], 'manager', true, false, false, 560),
  ('extension_warranty', 'extensions', 'external', 'required', 'Extension Warranty & Defect', 'Workmanship vs manufacturer defect, documentation, time window, batch tracking, exclusions.', 'The single most disputed extension policy — must be configured precisely.', ARRAY['client_page','manager','sop']::policy_surface[], 'admin', true, false, false, 570),
  ('extension_return_refund', 'extensions', 'external', 'required', 'Extension Return & Refund', 'Installed hair final sale, unopened returnability, custom order exclusions, bundled package logic.', 'Aligns refund policy with custom-order economics.', ARRAY['client_page','checkout','manager']::policy_surface[], 'admin', true, false, false, 580),
  ('extension_removal', 'extensions', 'external', 'recommended', 'Extension Removal Policy', 'Salon-only removal recommendation, outside-removal liability, fee structure, condition expectations.', 'Protects natural hair and warranty integrity.', ARRAY['client_page','sop']::policy_surface[], 'manager', true, false, false, 590),

  -- FINANCIAL (Group D) — 4
  ('pricing_transparency', 'financial', 'external', 'recommended', 'Pricing Transparency Policy', 'Quote finality, variable pricing disclosures, change order communication, long/thick hair adjustments.', 'Prevents checkout disputes from "I thought it was X" conversations.', ARRAY['client_page','booking','checkout','sop']::policy_surface[], 'manager', false, false, false, 600),
  ('payment_policy', 'financial', 'external', 'required', 'Payment Policy', 'Accepted methods, split payments, financing/BNPL, payment timing, declined card handling.', 'Defines the financial contract.', ARRAY['client_page','checkout']::policy_surface[], 'admin', false, false, false, 610),
  ('chargeback_dispute', 'financial', 'both', 'required', 'Chargeback & Payment Dispute Policy', 'Documentation retained, ack capture, card-on-file consent, internal manager workflow.', 'Required to win chargeback disputes — without ack records you lose by default.', ARRAY['client_page','manager','sop']::policy_surface[], 'admin', false, false, false, 620),
  ('promotional_discount', 'financial', 'both', 'optional', 'Promotional & Discount Policy', 'Eligibility, stacking, expiration, stylist comp, friends and family, model rules.', 'Required if you run promotions or comp services.', ARRAY['client_page','manager','sop']::policy_surface[], 'admin', false, false, false, 630),

  -- FACILITY (Group E) — 3
  ('safety_emergency', 'facility', 'internal', 'recommended', 'Safety & Emergency Policy', 'Incident handling, evacuation, injury reporting, on-site accident documentation.', 'OSHA compliance and liability documentation.', ARRAY['handbook','sop']::policy_surface[], 'manager', false, false, false, 700),
  ('property_damage_lost', 'facility', 'both', 'recommended', 'Property Damage & Lost Item Policy', 'Salon liability limits, coat/purse/electronics disclaimers, client-caused damage.', 'Prevents disputes over lost or damaged personal items.', ARRAY['client_page','handbook','sop']::policy_surface[], 'manager', false, false, false, 710),
  ('accessibility_accommodation', 'facility', 'external', 'recommended', 'Accessibility & Accommodation Policy', 'Accommodation request process, communication support, service limitation framing.', 'ADA compliance and client experience signal.', ARRAY['client_page','sop']::policy_surface[], 'admin', false, false, false, 720),

  -- MANAGEMENT (Group F) — 4 (the missing layer most salons skip)
  ('exception_authority', 'management', 'internal', 'required', 'Exception Authority Policy', 'Who can override deposits, cancellation fees, no-shows, refunds, returns, redos, extensions, packages.', 'Without this, every policy becomes negotiable. The single highest-leverage management policy.', ARRAY['manager','sop']::policy_surface[], 'admin', false, false, false, 800),
  ('goodwill_resolution', 'management', 'internal', 'required', 'Goodwill Resolution Policy', 'When goodwill is permitted (redo, partial comp, store credit, retail gift, waived fee), documentation, thresholds.', 'Converts ad-hoc client recovery into consistent operating practice.', ARRAY['manager','sop']::policy_surface[], 'admin', false, false, false, 810),
  ('escalation_path', 'management', 'internal', 'required', 'Escalation Path Policy', 'Who handles what (stylist → front desk → manager → director → owner), by issue type.', 'Eliminates "where does this go?" friction in the moment.', ARRAY['manager','sop']::policy_surface[], 'admin', false, false, false, 820),
  ('documentation_standards', 'management', 'internal', 'required', 'Documentation Standards Policy', 'For disputes, redos, extension claims, refunds, incidents — photos, notes, signed acks, timestamps.', 'Enables future support, dispute, and audit capabilities.', ARRAY['manager','sop']::policy_surface[], 'admin', false, false, false, 830)
ON CONFLICT (key) DO NOTHING;