import { useParams, Outlet, Navigate } from 'react-router-dom';
import { useOrganizationBySlug } from '@/hooks/useOrganizations';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { PLATFORM_NAME } from '@/lib/brand';
import NotFound from '@/pages/NotFound';
import { OrgAccessDenied } from '@/components/auth/OrgAccessDenied';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Route wrapper for /org/:orgSlug/dashboard/*.
 * Resolves the organization from the URL slug and syncs it into OrganizationContext.
 * Verifies the authenticated user is a member before rendering <Outlet />.
 */
export function OrgDashboardRoute() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { data: organization, isLoading, error } = useOrganizationBySlug(orgSlug);
  const { setSelectedOrganization, effectiveOrganization } = useOrganizationContext();
  const { user, isPlatformUser } = useAuth();

  // Sync the URL-resolved org into context so all downstream hooks work
  useEffect(() => {
    if (organization && organization.id !== effectiveOrganization?.id) {
      setSelectedOrganization(organization);
    }
  }, [organization, effectiveOrganization?.id, setSelectedOrganization]);

  // Check membership: user must have a row in employee_profiles or organization_admins
  const orgId = organization?.id;
  const userId = user?.id;
  const { data: isMember, isLoading: isMembershipLoading } = useQuery({
    queryKey: ['org-membership', orgId, userId],
    queryFn: async () => {
      const [profileRes, adminRes] = await Promise.all([
        supabase.from('employee_profiles').select('id').eq('organization_id', orgId!).eq('user_id', userId!).maybeSingle(),
        supabase.from('organization_admins').select('id').eq('organization_id', orgId!).eq('user_id', userId!).maybeSingle(),
      ]);
      return !!(profileRes.data || adminRes.data);
    },
    enabled: !!orgId && !!userId && !isPlatformUser,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <DashboardLoader fullPage />;
  }

  if (error || !organization || !orgSlug) {
    return <NotFound />;
  }

  // Platform users bypass membership check
  if (!isPlatformUser) {
    if (isMembershipLoading) {
      return <DashboardLoader fullPage />;
    }

    if (!isMember) {
      return <OrgAccessDenied organizationName={organization.name} myDashboardPath="/dashboard" />;
    }
  }

  return <Outlet />;
}

/**
 * Legacy redirect component.
 * Catches /dashboard/* and redirects to /org/:slug/dashboard/*.
 * Catches /dashboard/platform/* and redirects to /platform/*.
 */
export function LegacyDashboardRedirect() {
  const { '*': splat } = useParams();
  const { effectiveOrganization, isLoading: isOrgLoading } = useOrganizationContext();
  const { user, loading } = useAuth();
  const path = splat || '';

  // /dashboard/platform/* → /platform/*
  if (path.startsWith('platform')) {
    const rest = path.replace(/^platform\/?/, '');
    return <Navigate to={`/platform/${rest}`} replace />;
  }

  // Auth still resolving — show spinner
  if (loading) {
    return <DashboardLoader fullPage />;
  }

  // Not authenticated — redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: { pathname: `/dashboard/${path}` }, message: 'Please sign in to access your dashboard.' }} replace />;
  }

  // /dashboard/* → /org/:slug/dashboard/*
  if (effectiveOrganization?.slug) {
    return <Navigate to={`/org/${effectiveOrganization.slug}/dashboard/${path}`} replace />;
  }

  // Org context still loading — show spinner
  if (isOrgLoading) {
    return <DashboardLoader fullPage />;
  }

  // Authenticated but no organization found — redirect to login with message
  return <Navigate to="/login" state={{ from: { pathname: `/dashboard/${path}` }, message: 'No organization found for your account. Please contact your administrator.' }} replace />;
}
