-- Seed all 16 task templates
INSERT INTO public.seo_task_templates (template_key, label, description_template, task_type, trigger_domain, trigger_conditions, assignment_rules, due_date_rules, completion_criteria, recurrence_rules, dependency_rules, suppression_rules, escalation_rules, expected_impact_category, is_active)
VALUES
  ('review_request', 'Review Request', 'Request a review from a recent {{service}} client at {{location}}.', 'review', 'review', '{}', '{}', '{"default_due_days": 2}', '{"system_verifiable": true, "proof_requirements": []}', '{"cooldown_days": 7}', '{}', '{}', '{"threshold_days": 3}', 'review_velocity', true),
  ('review_response', 'Review Response', 'Respond to a {{rating}}-star review from {{clientName}} at {{location}}.', 'review', 'review', '{}', '{}', '{"default_due_days": 1}', '{"system_verifiable": true, "proof_requirements": []}', '{"cooldown_days": 0}', '{}', '{}', '{"threshold_days": 2}', 'review_velocity', true),
  ('photo_upload', 'Photo Upload', 'Upload {{count}} tagged photos for {{service}} at {{location}}.', 'content', 'content', '{}', '{}', '{"default_due_days": 7}', '{"system_verifiable": true, "proof_requirements": []}', '{"cooldown_days": 30}', '{}', '{}', '{"threshold_days": 5}', 'content_freshness', true),
  ('gbp_post', 'GBP Post', 'Publish a Google Business Profile post for {{location}}.', 'local_presence', 'local_presence', '{}', '{}', '{"default_due_days": 3}', '{"system_verifiable": true, "proof_requirements": []}', '{"cooldown_days": 7}', '{}', '{}', '{"threshold_days": 4}', 'local_presence', true),
  ('service_page_update', 'Service Page Update', 'Update the {{service}} page at {{location}} to improve SEO signals.', 'page', 'page', '{}', '{}', '{"default_due_days": 7}', '{"system_verifiable": true, "proof_requirements": []}', '{"cooldown_days": 30}', '{}', '{}', '{"threshold_days": 5}', 'page_health', true),
  ('page_completion', 'Page Completion', 'Complete the {{pageName}} page with all required sections.', 'page', 'page', '{}', '{}', '{"default_due_days": 14}', '{"system_verifiable": true, "proof_requirements": []}', '{"cooldown_days": 60}', '{}', '{}', '{"threshold_days": 7}', 'page_health', true),
  ('metadata_fix', 'Metadata Fix', 'Fix {{field}} on {{pageName}} page.', 'page', 'page', '{}', '{}', '{"default_due_days": 5}', '{"system_verifiable": true, "proof_requirements": []}', '{"cooldown_days": 30}', '{}', '{}', '{"threshold_days": 3}', 'page_health', true),
  ('internal_linking', 'Internal Linking', 'Add internal links to {{pageName}} connecting to related service pages.', 'page', 'page', '{}', '{}', '{"default_due_days": 7}', '{"system_verifiable": true, "proof_requirements": []}', '{"cooldown_days": 60}', '{}', '{}', '{"threshold_days": 5}', 'page_health', true),
  ('before_after_publish', 'Before/After Publish', 'Publish a before/after transformation for {{service}} at {{location}}.', 'content', 'content', '{}', '{}', '{"default_due_days": 14}', '{"system_verifiable": true, "proof_requirements": []}', '{"cooldown_days": 30}', '{}', '{}', '{"threshold_days": 7}', 'content_freshness', true),
  ('stylist_spotlight_publish', 'Stylist Spotlight Publish', 'Publish or update the spotlight page for {{stylistName}}.', 'content', 'content', '{}', '{}', '{"default_due_days": 14}', '{"system_verifiable": true, "proof_requirements": []}', '{"cooldown_days": 90}', '{}', '{}', '{"threshold_days": 7}', 'content_freshness', true),
  ('faq_expansion', 'FAQ Expansion', 'Add FAQ entries to {{pageName}} for common {{service}} questions.', 'content', 'content', '{}', '{}', '{"default_due_days": 10}', '{"system_verifiable": true, "proof_requirements": []}', '{"cooldown_days": 60}', '{}', '{}', '{"threshold_days": 5}', 'content_freshness', true),
  ('competitor_gap_response', 'Competitor Gap Response', 'Address competitive gap: {{gapDescription}} at {{location}}.', 'strategy', 'competitive_gap', '{}', '{}', '{"default_due_days": 14}', '{"system_verifiable": false, "proof_requirements": ["action_summary", "manager_approval"]}', '{"cooldown_days": 30}', '{}', '{}', '{"threshold_days": 7}', 'competitive_position', true),
  ('booking_cta_optimization', 'Booking CTA Optimization', 'Improve booking CTA on {{pageName}} to increase conversion.', 'conversion', 'conversion', '{}', '{}', '{"default_due_days": 7}', '{"system_verifiable": true, "proof_requirements": []}', '{"cooldown_days": 30}', '{}', '{}', '{"threshold_days": 5}', 'booking_conversion', true),
  ('content_refresh', 'Content Refresh', 'Refresh content on {{pageName}} to improve relevance and freshness.', 'content', 'content', '{}', '{}', '{"default_due_days": 14}', '{"system_verifiable": false, "proof_requirements": ["content_diff", "manager_approval"]}', '{"cooldown_days": 60}', '{}', '{}', '{"threshold_days": 7}', 'content_freshness', true),
  ('local_landing_page_creation', 'Local Landing Page Creation', 'Create a local landing page for {{service}} in {{location}}.', 'page', 'page', '{}', '{}', '{"default_due_days": 21}', '{"system_verifiable": true, "proof_requirements": []}', '{"cooldown_days": 90}', '{}', '{}', '{"threshold_days": 10}', 'page_health', true),
  ('service_description_rewrite', 'Service Description Rewrite', 'Rewrite the description for {{service}} at {{location}} to meet word count and keyword targets.', 'content', 'content', '{}', '{}', '{"default_due_days": 10}', '{"system_verifiable": true, "proof_requirements": []}', '{"cooldown_days": 60}', '{}', '{}', '{"threshold_days": 5}', 'content_freshness', true)
ON CONFLICT (template_key) DO NOTHING;

-- Score retention cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_seo_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete health scores older than 90 days, keeping at least 10 most recent per object per domain
  DELETE FROM public.seo_health_scores
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY seo_object_id, domain
        ORDER BY scored_at DESC
      ) AS rn
      FROM public.seo_health_scores
    ) ranked
    WHERE rn > 10
    AND id IN (
      SELECT id FROM public.seo_health_scores WHERE scored_at < now() - interval '90 days'
    )
  );

  -- Delete opportunity/risk scores older than 90 days, keeping at least 10 most recent per object per domain
  DELETE FROM public.seo_opportunity_risk_scores
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY seo_object_id, domain
        ORDER BY scored_at DESC
      ) AS rn
      FROM public.seo_opportunity_risk_scores
    ) ranked
    WHERE rn > 10
    AND id IN (
      SELECT id FROM public.seo_opportunity_risk_scores WHERE scored_at < now() - interval '90 days'
    )
  );
END;
$$;