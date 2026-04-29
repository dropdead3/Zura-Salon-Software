import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

/**
 * Single source of truth for an organization's public-facing URL.
 *
 * Resolution order:
 *   1. Verified custom domain from `organization_domains` (status='active' + ssl_provisioned_at IS NOT NULL)
 *      → `https://{domain}{subpath}`
 *   2. Default org slug fallback → `${origin}/org/{slug}{subpath}`
 *
 * Mirrors the shape of `useOrgDashboardPath` so callers feel familiar.
 *
 * Usage:
 *   const { publicUrl, isUsingCustomDomain, customDomain } = useOrgPublicUrl();
 *   <a href={publicUrl()}>Preview site</a>
 *   <a href={publicUrl('/shop')}>Open store</a>
 */
export function useOrgPublicUrl() {
  const { effectiveOrganization, currentOrganization } = useOrganizationContext();
  const org = effectiveOrganization || currentOrganization;
  const orgId = org?.id ?? null;
  const slug = org?.slug ?? null;

  const { data: customDomain, isLoading } = useQuery({
    queryKey: ['organization_domain', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('organization_domains')
        .select('domain, status, ssl_provisioned_at')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .not('ssl_provisioned_at', 'is', null)
        .maybeSingle();
      if (error) return null;
      return data?.domain ?? null;
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });

  const isUsingCustomDomain = !!customDomain;

  const publicUrl = useCallback(
    (subpath: string = '') => {
      const clean = subpath && !subpath.startsWith('/') ? `/${subpath}` : subpath;
      if (customDomain) {
        return `https://${customDomain}${clean}`;
      }
      if (slug && typeof window !== 'undefined') {
        return `${window.location.origin}/org/${slug}${clean}`;
      }
      return null;
    },
    [customDomain, slug],
  );

  const publicPageUrl = useCallback(
    (
      pageSlug?: string | null,
      options?: {
        preview?: boolean;
        mode?: 'view' | 'edit';
      },
    ) => {
      const base = publicUrl(pageSlug ? `/${pageSlug.replace(/^\/+/, '')}` : '');
      if (!base) return null;

      if (!options?.preview && !options?.mode) {
        return base;
      }

      const url = new URL(base);
      if (options.preview) {
        url.searchParams.set('preview', 'true');
      }
      if (options.mode) {
        url.searchParams.set('mode', options.mode);
      }

      return url.toString();
    },
    [publicUrl],
  );

  return {
    publicUrl,
    publicPageUrl,
    customDomain: customDomain ?? null,
    isUsingCustomDomain,
    isLoading,
  };
}
