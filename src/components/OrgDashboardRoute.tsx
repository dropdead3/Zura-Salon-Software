import { useParams, Outlet, Navigate } from 'react-router-dom';
import { useOrganizationBySlug } from '@/hooks/useOrganizations';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { ZuraLoader } from '@/components/ui/ZuraLoader';
import { PLATFORM_NAME } from '@/lib/brand';
import NotFound from '@/pages/NotFound';
import { useEffect } from 'react';

/**
 * Route wrapper for /org/:orgSlug/dashboard/*.
 * Resolves the organization from the URL slug and syncs it into OrganizationContext.
 * Renders <Outlet /> for all nested dashboard routes.
 */
export function OrgDashboardRoute() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { data: organization, isLoading, error } = useOrganizationBySlug(orgSlug);
  const { setSelectedOrganization, effectiveOrganization } = useOrganizationContext();

  // Sync the URL-resolved org into context so all downstream hooks work
  useEffect(() => {
    if (organization && organization.id !== effectiveOrganization?.id) {
      setSelectedOrganization(organization);
    }
  }, [organization, effectiveOrganization?.id, setSelectedOrganization]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
          <ZuraLoader size="lg" platformColors />
          <p className="font-display text-xs uppercase tracking-[0.16em] text-muted-foreground">{PLATFORM_NAME}</p>
        </div>
    );
  }

  if (error || !organization || !orgSlug) {
    return <NotFound />;
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
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
          <ZuraLoader size="lg" platformColors />
          <p className="font-display text-xs uppercase tracking-[0.16em] text-muted-foreground">{PLATFORM_NAME}</p>
        </div>
    );
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
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
          <ZuraLoader size="lg" platformColors />
          <p className="font-display text-xs uppercase tracking-[0.16em] text-muted-foreground">{PLATFORM_NAME}</p>
        </div>
    );
  }

  // Authenticated but no organization found — redirect to login with message
  return <Navigate to="/login" state={{ from: { pathname: `/dashboard/${path}` }, message: 'No organization found for your account. Please contact your administrator.' }} replace />;
}
