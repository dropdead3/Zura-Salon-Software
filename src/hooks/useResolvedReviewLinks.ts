import { useQuery } from '@tanstack/react-query';
import { resolveReviewLinks, type ResolvedReviewLinks } from '@/lib/reputation/resolveReviewLinks';

/**
 * Fetch per-location → org → empty precedence-resolved review URLs for a given context.
 * Safe to call from public (unauthenticated) surfaces — relies on RLS on
 * `location_review_settings` and `site_settings` for the public read path.
 */
export function useResolvedReviewLinks(organizationId?: string | null, locationId?: string | null) {
  return useQuery<ResolvedReviewLinks>({
    queryKey: ['resolved-review-links', organizationId, locationId],
    queryFn: () => resolveReviewLinks(organizationId as string, locationId ?? null),
    enabled: !!organizationId,
    staleTime: 60_000,
  });
}
