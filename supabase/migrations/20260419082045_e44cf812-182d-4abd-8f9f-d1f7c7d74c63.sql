
-- Drop test table from prior attempt
DROP TABLE IF EXISTS public.handbooks_test1 CASCADE;

-- Enums
DO $$ BEGIN
  CREATE TYPE public.org_handbook_status AS ENUM ('draft', 'reviewed', 'approved', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.org_handbook_version_status AS ENUM ('draft', 'reviewed', 'approved', 'published');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.org_handbook_section_status AS ENUM ('not_started', 'configuring', 'drafting', 'drafted', 'reviewed', 'approved');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.org_handbook_review_severity AS ENUM ('info', 'warning', 'blocker');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- org_handbooks
CREATE TABLE IF NOT EXISTS public.org_handbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status public.org_handbook_status NOT NULL DEFAULT 'draft',
  location_scope TEXT NOT NULL DEFAULT 'shared',
  current_version_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.org_handbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_handbooks_select" ON public.org_handbooks FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_handbooks_insert" ON public.org_handbooks FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "org_handbooks_update" ON public.org_handbooks FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "org_handbooks_delete" ON public.org_handbooks FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));
CREATE INDEX IF NOT EXISTS idx_org_handbooks_org ON public.org_handbooks(organization_id);
CREATE TRIGGER update_org_handbooks_updated_at
  BEFORE UPDATE ON public.org_handbooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- org_handbook_versions
CREATE TABLE IF NOT EXISTS public.org_handbook_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handbook_id UUID NOT NULL REFERENCES public.org_handbooks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  status public.org_handbook_version_status NOT NULL DEFAULT 'draft',
  current_step TEXT NOT NULL DEFAULT 'org_setup',
  completeness_pct INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.org_handbook_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_handbook_versions_select" ON public.org_handbook_versions FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_handbook_versions_insert" ON public.org_handbook_versions FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "org_handbook_versions_update" ON public.org_handbook_versions FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "org_handbook_versions_delete" ON public.org_handbook_versions FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));
CREATE INDEX IF NOT EXISTS idx_org_handbook_versions_handbook ON public.org_handbook_versions(handbook_id);
CREATE INDEX IF NOT EXISTS idx_org_handbook_versions_org ON public.org_handbook_versions(organization_id);
CREATE TRIGGER update_org_handbook_versions_updated_at
  BEFORE UPDATE ON public.org_handbook_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- org_handbook_org_setup
CREATE TABLE IF NOT EXISTS public.org_handbook_org_setup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handbook_version_id UUID NOT NULL UNIQUE REFERENCES public.org_handbook_versions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_tone TEXT NOT NULL DEFAULT 'professional',
  classifications JSONB NOT NULL DEFAULT '{"w2_full_time": true, "w2_part_time": true, "contractor_1099": false}'::jsonb,
  roles_enabled JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  states_operated JSONB NOT NULL DEFAULT '[]'::jsonb,
  location_strategy TEXT NOT NULL DEFAULT 'shared',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.org_handbook_org_setup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_handbook_org_setup_select" ON public.org_handbook_org_setup FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_handbook_org_setup_insert" ON public.org_handbook_org_setup FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "org_handbook_org_setup_update" ON public.org_handbook_org_setup FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "org_handbook_org_setup_delete" ON public.org_handbook_org_setup FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));
CREATE TRIGGER update_org_handbook_org_setup_updated_at
  BEFORE UPDATE ON public.org_handbook_org_setup
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- org_handbook_section_library (platform catalog)
CREATE TABLE IF NOT EXISTS public.org_handbook_section_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  what_it_covers TEXT NOT NULL,
  why_it_matters TEXT NOT NULL,
  who_applies TEXT NOT NULL,
  category TEXT NOT NULL,
  recommendation TEXT NOT NULL DEFAULT 'recommended',
  default_employment_types JSONB NOT NULL DEFAULT '["w2_full_time","w2_part_time","contractor_1099"]'::jsonb,
  default_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  policy_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.org_handbook_section_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_handbook_section_library_select" ON public.org_handbook_section_library FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "org_handbook_section_library_platform_all" ON public.org_handbook_section_library FOR ALL
  USING (public.is_platform_user(auth.uid()))
  WITH CHECK (public.is_platform_user(auth.uid()));
CREATE TRIGGER update_org_handbook_section_library_updated_at
  BEFORE UPDATE ON public.org_handbook_section_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- org_handbook_sections
CREATE TABLE IF NOT EXISTS public.org_handbook_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handbook_version_id UUID NOT NULL REFERENCES public.org_handbook_versions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  library_section_key TEXT,
  title TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  status public.org_handbook_section_status NOT NULL DEFAULT 'not_started',
  applies_to JSONB NOT NULL DEFAULT '{"employment_types":[],"roles":[],"locations":[]}'::jsonb,
  policy_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  draft_content TEXT,
  ai_draft_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.org_handbook_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_handbook_sections_select" ON public.org_handbook_sections FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_handbook_sections_insert" ON public.org_handbook_sections FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "org_handbook_sections_update" ON public.org_handbook_sections FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "org_handbook_sections_delete" ON public.org_handbook_sections FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));
CREATE INDEX IF NOT EXISTS idx_org_handbook_sections_version ON public.org_handbook_sections(handbook_version_id);
CREATE INDEX IF NOT EXISTS idx_org_handbook_sections_org ON public.org_handbook_sections(organization_id);
CREATE TRIGGER update_org_handbook_sections_updated_at
  BEFORE UPDATE ON public.org_handbook_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- org_handbook_role_overlays
CREATE TABLE IF NOT EXISTS public.org_handbook_role_overlays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.org_handbook_sections(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role_key TEXT NOT NULL,
  override_content TEXT,
  override_policy_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(section_id, role_key)
);
ALTER TABLE public.org_handbook_role_overlays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_handbook_role_overlays_select" ON public.org_handbook_role_overlays FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_handbook_role_overlays_insert" ON public.org_handbook_role_overlays FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "org_handbook_role_overlays_update" ON public.org_handbook_role_overlays FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "org_handbook_role_overlays_delete" ON public.org_handbook_role_overlays FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));
CREATE TRIGGER update_org_handbook_role_overlays_updated_at
  BEFORE UPDATE ON public.org_handbook_role_overlays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- org_handbook_review_issues
CREATE TABLE IF NOT EXISTS public.org_handbook_review_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handbook_version_id UUID NOT NULL REFERENCES public.org_handbook_versions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.org_handbook_sections(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL,
  severity public.org_handbook_review_severity NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.org_handbook_review_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_handbook_review_issues_select" ON public.org_handbook_review_issues FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_handbook_review_issues_insert" ON public.org_handbook_review_issues FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "org_handbook_review_issues_update" ON public.org_handbook_review_issues FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "org_handbook_review_issues_delete" ON public.org_handbook_review_issues FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));
CREATE INDEX IF NOT EXISTS idx_org_handbook_review_issues_version ON public.org_handbook_review_issues(handbook_version_id);
CREATE TRIGGER update_org_handbook_review_issues_updated_at
  BEFORE UPDATE ON public.org_handbook_review_issues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed 20 standard handbook sections
INSERT INTO public.org_handbook_section_library (key, title, description, what_it_covers, why_it_matters, who_applies, category, recommendation, default_roles, display_order)
VALUES
  ('welcome', 'Welcome & Culture', 'Sets the tone for your handbook and introduces your mission and values.', 'Your salon mission, vision, history, and the culture you are building.', 'Frames every policy that follows. Owners who skip this miss the chance to anchor expectations in identity, not rules.', 'All employees', 'foundation', 'recommended', '[]'::jsonb, 10),
  ('equal_opportunity', 'Equal Opportunity & Anti-Harassment', 'Your commitment to a workplace free from discrimination and harassment.', 'Anti-discrimination policy, harassment definitions, reporting procedures, retaliation protection.', 'Federally and state-required for most employers. Protects the organization and signals professional standards.', 'All employees', 'foundation', 'required', '[]'::jsonb, 20),
  ('classifications', 'Employment Classifications', 'How the organization classifies employees and what each classification means.', 'Definitions of full-time, part-time, W2 vs 1099, exempt vs non-exempt, probationary status.', 'Classification disputes are one of the most common compliance issues. Clarity here prevents wage claims.', 'All employees', 'foundation', 'required', '[]'::jsonb, 30),
  ('attendance', 'Scheduling & Attendance', 'Punctuality, call-outs, no-shows, and shift expectations.', 'Punctuality standards, call-out procedures, no-show consequences, shift swap rules, grace periods.', 'Attendance drift is a common cause of margin loss. Clear policy means enforceable standards.', 'All employees', 'operations', 'required', '[]'::jsonb, 40),
  ('timekeeping', 'Timekeeping & Breaks', 'How time is tracked and when breaks are taken.', 'Clock-in and clock-out procedures, meal and rest breaks, overtime authorization, time-off requests.', 'State-specific break laws are commonly violated in salons. Documenting policy reduces liability.', 'W2 employees', 'operations', 'required', '[]'::jsonb, 50),
  ('compensation', 'Compensation Overview', 'How pay is structured and when it is delivered.', 'Pay frequency, commission structure overview, tip handling, retail commission, deductions.', 'Stylists need to understand exactly how they earn. Transparency here is recruiting and retention currency.', 'All paid employees', 'operations', 'required', '[]'::jsonb, 60),
  ('benefits', 'Benefits, PTO & Sick Leave', 'What benefits the organization offers and who qualifies.', 'PTO accrual, sick leave, holiday pay, health benefits, eligibility waiting periods.', 'Benefits eligibility is heavily regulated by state. Misalignment creates wage and hour exposure.', 'Eligible employees', 'benefits', 'recommended', '["stylist","manager","director","front_desk"]'::jsonb, 70),
  ('performance', 'Performance Expectations', 'What success looks like in each role.', 'Service quality standards, retail expectations, rebooking rates, client communication, education requirements.', 'Performance becomes coachable only when it is defined in writing.', 'All employees', 'operations', 'recommended', '[]'::jsonb, 80),
  ('dress_code', 'Dress Code & Appearance', 'Professional appearance and salon image standards.', 'Clothing standards, grooming, tattoo and piercing policy, hair expression, brand alignment, safety footwear.', 'Salons are visual businesses. Image policy without legal pitfalls requires careful framing.', 'All employees', 'conduct', 'recommended', '[]'::jsonb, 90),
  ('client_experience', 'Client Experience Standards', 'How every client should be treated, every visit.', 'Greeting standards, consultation expectations, service recovery, client complaints, rebooking conversation.', 'Client experience consistency is the difference between a salon and a brand.', 'Client-facing roles', 'operations', 'recommended', '["stylist","stylist_assistant","front_desk","manager"]'::jsonb, 100),
  ('retail', 'Retail Expectations', 'Retail recommendation standards and product knowledge.', 'Minimum retail recommendations per ticket, product education requirements, retail commission, returns.', 'Retail is the highest-margin revenue per minute. Expectation-setting is non-optional.', 'Stylists and assistants', 'operations', 'recommended', '["stylist","stylist_assistant"]'::jsonb, 110),
  ('cleanliness', 'Cleanliness & Sanitation', 'Salon cleanliness and state board sanitation requirements.', 'Station cleanliness, tool sanitation, color bar protocols, end-of-day responsibilities, state board compliance.', 'State board violations close salons. This section is operational armor.', 'Service providers', 'safety', 'required', '["stylist","stylist_assistant","apprentice"]'::jsonb, 120),
  ('social_media', 'Social Media & Branding', 'How team members represent the brand online.', 'Personal accounts vs salon brand, client photo rights, social media disputes, posting schedule expectations.', 'Social media is the modern recruiting battleground and the modern lawsuit vector.', 'All employees', 'conduct', 'recommended', '[]'::jsonb, 130),
  ('confidentiality', 'Confidentiality & Client Data', 'Protecting client and business information.', 'Client list confidentiality, formula privacy, business financials, post-employment obligations.', 'Stylist departures often trigger client list disputes. Written policy is the foundation of enforceability.', 'All employees', 'conduct', 'required', '[]'::jsonb, 140),
  ('technology', 'Technology & Systems Usage', 'Use of POS, scheduling, and salon technology.', 'POS access, password policy, personal device usage, scheduling system rules, color bar systems.', 'Technology misuse is increasingly the source of audit findings.', 'All employees', 'operations', 'recommended', '[]'::jsonb, 150),
  ('safety', 'Safety, Injury & Incident Reporting', 'Workplace safety and what to do when something goes wrong.', 'Workplace injuries, chemical exposure, slip and fall procedures, OSHA reporting, client incidents.', 'Workers compensation eligibility hinges on documented reporting protocols.', 'All employees', 'safety', 'required', '[]'::jsonb, 160),
  ('progressive_discipline', 'Progressive Discipline', 'How performance and conduct issues are addressed.', 'Verbal warnings, written warnings, performance improvement plans, suspension, termination.', 'Defensible terminations require documented escalation. This protects the organization.', 'All employees', 'conduct', 'required', '[]'::jsonb, 170),
  ('complaints', 'Complaint Resolution', 'How employees raise concerns and how the organization responds.', 'Open-door policy, formal complaint procedure, investigation process, anti-retaliation.', 'Required by harassment law in most states. Also reduces escalation to outside agencies.', 'All employees', 'conduct', 'required', '[]'::jsonb, 180),
  ('separation', 'Separation, Resignation & Termination', 'What happens when employment ends.', 'Resignation notice, final pay, return of property, non-compete and non-solicit notes, exit interviews.', 'Final-pay timing is state-regulated. Mishandling is a frequent legal trigger.', 'All employees', 'separation', 'required', '[]'::jsonb, 190),
  ('acknowledgment', 'Acknowledgment Form', 'Employee signature confirming they received and read the handbook.', 'Signature block, acknowledgment of at-will employment, agreement to follow policies, handbook revision rights.', 'Without a signed acknowledgment, the handbook is functionally unenforceable.', 'All employees', 'separation', 'required', '[]'::jsonb, 200)
ON CONFLICT (key) DO NOTHING;
