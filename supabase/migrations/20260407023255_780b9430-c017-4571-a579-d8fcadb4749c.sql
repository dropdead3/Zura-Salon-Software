-- employee_profiles: used by useOrganizationUsers, useOrganizationStats
CREATE INDEX IF NOT EXISTS idx_employee_profiles_org_active 
  ON employee_profiles(organization_id, is_active);

-- locations: used by useOnboardingOrganizations, useOrganizationStats
CREATE INDEX IF NOT EXISTS idx_locations_org_active 
  ON locations(organization_id, is_active);

-- organizations: used by platform admin queries
CREATE INDEX IF NOT EXISTS idx_organizations_status 
  ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_onboarding_stage 
  ON organizations(onboarding_stage);

-- salon_inquiries: used by useLeadInbox
CREATE INDEX IF NOT EXISTS idx_salon_inquiries_status_created 
  ON salon_inquiries(status, created_at DESC);

-- user_mentions: used by useMentions, useUnreadMentionCount
CREATE INDEX IF NOT EXISTS idx_user_mentions_user_read 
  ON user_mentions(user_id, read_at);

-- organization_health_scores: used by useOrganizationHealthScores
CREATE INDEX IF NOT EXISTS idx_health_scores_org_date 
  ON organization_health_scores(organization_id, score_date DESC);

-- import_jobs: used by useOrganizationStats, useSystemHealth
CREATE INDEX IF NOT EXISTS idx_import_jobs_status 
  ON import_jobs(status);

-- edge_function_logs: used by useSystemHealth
CREATE INDEX IF NOT EXISTS idx_edge_function_logs_status_started 
  ON edge_function_logs(status, started_at DESC);

-- user_roles: used by useOrganizationUsers
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
  ON user_roles(user_id);