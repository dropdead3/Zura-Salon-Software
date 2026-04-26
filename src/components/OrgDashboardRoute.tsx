import { useParams, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useOrganizationBySlug } from '@/hooks/useOrganizations';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { BootLuxeLoader } from '@/components/ui/BootLuxeLoader';
import NotFound from '@/pages/NotFound';
import { OrgAccessDenied } from '@/components/auth/OrgAccessDenied';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Route wrapper for /org/:orgSlug/dashboard/*.
 * Resolves the organization from the URL slug and syncs it into OrganizationContext.
 * Verifies the authenticated user is a member before rendering <Outlet />.
 *
 * Refresh-safety doctrine:
 *   - Never render OrgAccessDenied on a transient null. Wait for authReady
 *     AND a real, resolved (orgId, userId) pair before evaluating membership.
 *   - Treat unresolved membership as "still loading", not "denied".
 */
export function OrgDashboardRoute() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const location = useLocation();
  const { data: organization, isLoading, error } = useOrganizationBySlug(orgSlug);
  const { setSelectedOrganization, effectiveOrganization } = useOrganizationContext();
  const { user, authReady, isPlatformUser } = useAuth();

  // Sync the URL-resolved org into context so all downstream hooks work
  useEffect(() => {
    if (organization && organization.id !== effectiveOrganization?.id) {
      setSelectedOrganization(organization);
    }
  }, [organization, effectiveOrganization?.id, setSelectedOrganization]);

  // Check membership: user must have a row in employee_profiles or organization_admins
  const orgId = organization?.id;
  const userId = user?.id;
  const membershipReady = !!orgId && !!userId;
  const { data: isMember, isLoading: isMembershipLoading, isFetched: isMembershipFetched } = useQuery({
    queryKey: ['org-membership', orgId, userId],
    queryFn: async () => {
      const [profileRes, adminRes] = await Promise.all([
        supabase.from('employee_profiles').select('id').eq('organization_id', orgId!).eq('user_id', userId!).maybeSingle(),
        supabase.from('organization_admins').select('id').eq('organization_id', orgId!).eq('user_id', userId!).maybeSingle(),
      ]);
      return !!(profileRes.data || adminRes.data);
    },
    enabled: membershipReady && !isPlatformUser,
    staleTime: 5 * 60 * 1000,
  });

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('[OrgDashboardRoute] decision', {
      pathname: location.pathname,
      authReady,
      hasUser: !!user,
      isLoading,
      orgSlug,
      hasOrg: !!organization,
      isPlatformUser,
      membershipReady,
      isMembershipLoading,
      isMembershipFetched,
      isMember,
    });
  }

  // 1) Wait for first session resolution before any redirect decision.
  if (!authReady) {
    return <BootLuxeLoader fullScreen />;
  }

  // 2) No user → bounce to /login, preserving the intended URL.
  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location, message: 'Please sign in to access your dashboard.' }}
        replace
      />
    );
  }

  // 3) Org slug still resolving.
  if (isLoading) {
    return <DashboardLoader fullPage />;
  }

  // 4) Slug genuinely doesn't resolve to an org.
  if (error || !organization || !orgSlug) {
    return <NotFound />;
  }

  // 5) Platform users bypass membership entirely.
  if (isPlatformUser) {
    return <Outlet />;
  }

  // 6) Membership query not yet resolvable (orgId / userId still pairing) OR
  //    in flight OR not yet fetched once. Treat as loading, NEVER as denied.
  if (!membershipReady || isMembershipLoading || !isMembershipFetched) {
    return <DashboardLoader fullPage />;
  }

  // 7) Only now — with a real resolved pair and a completed query — can we deny.
  // DOCTRINE: Dashboard routes must NEVER redirect to '/'. Only /login,
  // /no-organization, OrgAccessDenied, or NotFound are valid exits.
  if (!isMember) {
    return <OrgAccessDenied organizationName={organization.name} myDashboardPath="/dashboard" />;
  }

  return <Outlet />;
}

/**
 * Legacy redirect component.
 * Catches /dashboard/* and redirects to /org/:slug/dashboard/*.
 * Catches /dashboard/platform/* and redirects to /platform/*.
 *
 * Refresh-safety doctrine:
 *   - Never decide on a transient null. Wait until the org-list query is
 *     actually resolved before choosing between dashboard and /no-organization.
 */
export function LegacyDashboardRedirect() {
  const { '*': splat } = useParams();
  const { effectiveOrganization, isLoading: isOrgLoading } = useOrganizationContext();
  const { user, authReady } = useAuth();
  const path = splat || '';

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('[LegacyDashboardRedirect] decision', {
      path,
      authReady,
      hasUser: !!user,
      isOrgLoading,
      hasEffectiveOrg: !!effectiveOrganization,
      slug: effectiveOrganization?.slug ?? null,
    });
  }

  // /dashboard/platform/* → /platform/*
  if (path.startsWith('platform')) {
    const rest = path.replace(/^platform\/?/, '');
    return <Navigate to={`/platform/${rest}`} replace />;
  }

  // 1) Auth still resolving — show spinner.
  if (!authReady) {
    return <BootLuxeLoader fullScreen />;
  }

  // 2) Not authenticated — redirect to login, preserving destination.
  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{
          from: { pathname: `/dashboard/${path}` },
          message: 'Please sign in to access your dashboard.',
        }}
        replace
      />
    );
  }

  // 3) Org context still hydrating — wait. Never redirect on a transient null.
  if (isOrgLoading) {
    return <DashboardLoader fullPage />;
  }

  // 4) Org resolved → forward to canonical org-scoped URL.
  if (effectiveOrganization?.slug) {
    return <Navigate to={`/org/${effectiveOrganization.slug}/dashboard/${path}`} replace />;
  }

  // 5) Authenticated, org query resolved, but no org for this account.
  //    DOCTRINE: NEVER send authenticated users to '/' (marketing). Use the
  //    dedicated dead-end page instead so the experience is clear.
  return <Navigate to="/no-organization" replace />;
}
