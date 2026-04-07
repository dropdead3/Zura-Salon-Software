import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import type { Organization } from './useOrganizations';

export interface OnboardingOrganization extends Organization {
  locationCount: number;
  daysUntilGoLive: number | null;
  isOverdue: boolean;
  isApproaching: boolean; // within 7 days
}

export interface OnboardingStats {
  totalOnboarding: number;
  approaching: number;     // go-live within 7 days
  overdue: number;         // past go-live but not live
  byStage: Record<string, number>;
  avgDaysToGoLive: number | null;
}

interface LocationCount {
  organization_id: string | null;
}

export function useOnboardingOrganizations() {
  return useQuery({
    queryKey: ['onboarding-organizations'],
    queryFn: async () => {
      const today = startOfDay(new Date());

      // Fetch organizations that are not yet "live"
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select('*')
        .neq('onboarding_stage', 'live')
        .order('go_live_date', { ascending: true, nullsFirst: false })
        .limit(200);

      if (error) throw error;

      // Fetch location counts
      const { data: locationsData } = await supabase
        .from('locations')
        .select('organization_id')
        .eq('is_active' as never, true);

      const locations = (locationsData || []) as unknown as LocationCount[];

      // Count locations per org
      const locationCountMap = new Map<string, number>();
      locations.forEach((loc) => {
        if (loc.organization_id) {
          locationCountMap.set(
            loc.organization_id,
            (locationCountMap.get(loc.organization_id) || 0) + 1
          );
        }
      });

      // Enrich organizations with computed fields
      const enrichedOrgs: OnboardingOrganization[] = (orgs as Organization[]).map(org => {
        let daysUntilGoLive: number | null = null;
        let isOverdue = false;
        let isApproaching = false;

        if (org.go_live_date) {
          const goLiveDate = startOfDay(parseISO(org.go_live_date));
          daysUntilGoLive = differenceInDays(goLiveDate, today);
          isOverdue = daysUntilGoLive < 0;
          isApproaching = daysUntilGoLive >= 0 && daysUntilGoLive <= 7;
        }

        return {
          ...org,
          locationCount: locationCountMap.get(org.id) || 0,
          daysUntilGoLive,
          isOverdue,
          isApproaching,
        };
      });

      // Calculate stats
      const stats: OnboardingStats = {
        totalOnboarding: enrichedOrgs.length,
        approaching: enrichedOrgs.filter(o => o.isApproaching).length,
        overdue: enrichedOrgs.filter(o => o.isOverdue).length,
        byStage: {},
        avgDaysToGoLive: null,
      };

      // Count by stage
      enrichedOrgs.forEach(org => {
        const stage = org.onboarding_stage;
        stats.byStage[stage] = (stats.byStage[stage] || 0) + 1;
      });

      // Calculate average days to go-live (only for non-overdue with dates)
      const futureGoLives = enrichedOrgs.filter(o => o.daysUntilGoLive !== null && o.daysUntilGoLive >= 0);
      if (futureGoLives.length > 0) {
        const totalDays = futureGoLives.reduce((sum, o) => sum + (o.daysUntilGoLive || 0), 0);
        stats.avgDaysToGoLive = Math.round(totalDays / futureGoLives.length);
      }

      return { organizations: enrichedOrgs, stats };
    },
    refetchInterval: 300000, // 5 minutes (platform admin, low traffic)
  });
}
