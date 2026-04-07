import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Organization } from './useOrganizations';

export interface PlatformStats {
  totalOrganizations: number;
  activeOrganizations: number;
  onboardingOrganizations: number;
  pendingMigrations: number;
  totalLocations: number;
  totalUsers: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'org_created' | 'migration_completed' | 'status_change' | 'user_added';
  description: string;
  organizationName?: string;
  createdAt: string;
}

export function useOrganizationStats() {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: async (): Promise<PlatformStats> => {
      // Fetch organizations
      const { data: orgsData } = await supabase
        .from('organizations')
        .select('id, status, onboarding_stage, name, created_at');

      // Fetch counts
      const { count: locationCount } = await supabase
        .from('locations')
        .select('*', { count: 'exact', head: true });

      const { count: userCount } = await supabase
        .from('employee_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { data: importsData } = await supabase
        .from('import_jobs')
        .select('id, status');

      const organizations = (orgsData || []) as Organization[];
      const activeOrgs = organizations.filter(o => o.status === 'active');
      const onboardingOrgs = organizations.filter(o => 
        o.status === 'pending' || 
        (o.onboarding_stage && o.onboarding_stage !== 'live')
      );
      
      const imports = (importsData || []) as { id: string; status: string }[];
      const pendingMigrations = imports.filter(
        j => j.status === 'processing' || j.status === 'pending'
      ).length;

      // Build recent activity from organizations created
      const recentActivity: ActivityItem[] = organizations
        .slice(0, 5)
        .map(org => ({
          id: org.id,
          type: 'org_created' as const,
          description: `New account created`,
          organizationName: org.name,
          createdAt: org.created_at,
        }));

      return {
        totalOrganizations: organizations.length,
        activeOrganizations: activeOrgs.length,
        onboardingOrganizations: onboardingOrgs.length,
        pendingMigrations,
        totalLocations: locationCount || 0,
        totalUsers: userCount || 0,
        recentActivity,
      };
    },
    refetchInterval: 300000, // Refresh every 5 minutes (platform admin, low traffic)
  });
}

export function useOrganizationsByStatus(status?: string) {
  return useQuery({
    queryKey: ['organizations-by-status', status],
    queryFn: async () => {
      let query = supabase.from('organizations').select('*', { count: 'exact' });
      
      if (status && status !== 'all') {
        query = query.eq('status', status as any);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as Organization[];
    },
  });
}
