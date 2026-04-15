import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export type BusinessType = 'salon' | 'spa' | 'esthetics' | 'barbershop' | 'med_spa' | 'wellness' | 'other';

export interface Organization {
  id: string;
  name: string;
  legal_name: string | null;
  slug: string;
  status: 'pending' | 'active' | 'suspended' | 'churned';
  onboarding_stage: 'new' | 'importing' | 'training' | 'live';
  subscription_tier: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  source_software: string | null;
  logo_url: string | null;
  website_url: string | null;
  settings: Json;
  timezone: string;
  created_at: string;
  activated_at: string | null;
  updated_at: string;
  business_type: BusinessType;
  account_number: number | null;
  go_live_date: string | null;
  is_internal: boolean;
  is_multi_location: boolean;
}

export interface OrganizationInsert {
  name: string;
  slug: string;
  legal_name?: string | null;
  primary_contact_email?: string | null;
  primary_contact_phone?: string | null;
  source_software?: string | null;
  subscription_tier?: string;
  logo_url?: string | null;
  website_url?: string | null;
  settings?: Json;
  timezone?: string;
  business_type?: BusinessType;
}

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as Organization[];
    },
  });
}

export function useOrganization(id: string | undefined) {
  return useQuery({
    queryKey: ['organization', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as unknown as Organization;
    },
    enabled: !!id,
  });
}

export function useOrganizationBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['organization-slug', slug],
    queryFn: async () => {
      if (!slug) return null;
      
      // First try authenticated direct query (for org members)
      const { data: session } = await supabase.auth.getSession();
      if (session?.session) {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('slug', slug)
          .single();
        
        if (!error && data) return data as unknown as Organization;
      }
      
      // Fall back to public RPC (safe columns only, no credentials)
      const { data: publicData, error: rpcError } = await (supabase
        .rpc as any)('lookup_organization_by_slug', { p_slug: slug });

      if (rpcError) throw rpcError;
      if (!publicData || publicData.length === 0) throw new Error('Organization not found');
      
      // RPC returns array, take first row and map to Organization shape
      const row = publicData[0];
      return {
        ...row,
        // Fields not returned by the public RPC
        legal_name: null,
        primary_contact_email: null,
        primary_contact_phone: null,
        source_software: null,
        onboarding_stage: 'live',
        subscription_tier: null,
        created_at: '',
        activated_at: null,
        updated_at: '',
        account_number: null,
        go_live_date: null,
        is_internal: false,
      } as Organization;
    },
    enabled: !!slug,
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (org: OrganizationInsert) => {
      const { data, error } = await supabase
        .from('organizations')
        .insert([org])
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Organization;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      toast.success('Organization created successfully');
      
      // Log the creation for audit
      logPlatformAction(data.id, 'org_created', 'organization', data.id, {
        name: data.name,
        slug: data.slug,
      });
    },
    onError: (error) => {
      toast.error('Failed to create organization', {
        description: error.message,
      });
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Omit<Organization, 'id'>> & { id: string }) => {
      const { data, error } = await supabase
        .from('organizations')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Organization;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization', data.id] });
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      toast.success('Organization updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update organization', {
        description: error.message,
      });
    },
  });
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      toast.success('Organization deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete organization', {
        description: error.message,
      });
    },
  });
}

export interface OrganizationWithStats extends Organization {
  locationCount: number;
  adminCount: number;
  importCount: number;
  completedImports: number;
}

export interface OrganizationListItem extends Organization {
  locationCount: number;
  stripeLocationsActive: number;
  hasStripeIssues: boolean;
  primaryLocation: {
    state_province: string | null;
    country: string | null;
  } | null;
}

interface LocationWithStripe {
  organization_id: string | null;
  is_active: boolean;
  state_province: string | null;
  country: string | null;
  stripe_status: string | null;
  display_order: number;
}

export function useOrganizationsWithStats() {
  return useQuery({
    queryKey: ['organizations-with-stats'],
    queryFn: async () => {
      // Fetch organizations
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch locations with Stripe and geography data
      const { data: locationsData } = await supabase
        .from('locations')
        .select('organization_id, is_active, state_province, country, stripe_status, display_order')
        .eq('is_active' as never, true)
        .order('display_order', { ascending: true });

      const locations = (locationsData || []) as unknown as LocationWithStripe[];

      // Aggregate data per org
      const orgDataMap = new Map<string, {
        count: number;
        stripeActive: number;
        hasIssues: boolean;
        primaryLocation: { state_province: string | null; country: string | null } | null;
      }>();

      locations.forEach((loc) => {
        const orgId = loc.organization_id;
        if (!orgId) return;

        const existing = orgDataMap.get(orgId) || {
          count: 0,
          stripeActive: 0,
          hasIssues: false,
          primaryLocation: null,
        };

        existing.count += 1;
        if (loc.stripe_status === 'active') existing.stripeActive += 1;
        if (loc.stripe_status === 'issues') existing.hasIssues = true;
        if (!existing.primaryLocation && (loc.state_province || loc.country)) {
          existing.primaryLocation = {
            state_province: loc.state_province,
            country: loc.country,
          };
        }

        orgDataMap.set(orgId, existing);
      });

      return (orgs as Organization[]).map(org => {
        const data = orgDataMap.get(org.id);
        return {
          ...org,
          locationCount: data?.count || 0,
          stripeLocationsActive: data?.stripeActive || 0,
          hasStripeIssues: data?.hasIssues || false,
          primaryLocation: data?.primaryLocation || null,
        };
      }) as OrganizationListItem[];
    },
  });
}

export function useOrganizationWithStats(id: string | undefined) {
  return useQuery({
    queryKey: ['organization-stats', id],
    queryFn: async (): Promise<OrganizationWithStats | null> => {
      if (!id) return null;

      // Fetch organization first
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

      if (orgError) throw orgError;

      // Use raw queries to avoid TS deep instantiation issues
      const { count: locationCount } = await supabase
        .from('locations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id' as never, id);

      const { count: adminCount } = await supabase
        .from('organization_admins')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', id);

      const { data: importsData } = await supabase
        .from('import_jobs')
        .select('id, status')
        .eq('organization_id' as never, id);

      const org = orgData as Organization;
      const imports = (importsData || []) as { id: string; status: string }[];

      return {
        ...org,
        locationCount: locationCount || 0,
        adminCount: adminCount || 0,
        importCount: imports.length,
        completedImports: imports.filter(i => i.status === 'completed').length,
      };
    },
    enabled: !!id,
  });
}

// Log a platform action for audit trail
export async function logPlatformAction(
  organizationId: string | null,
  action: string,
  entityType?: string,
  entityId?: string,
  details?: Record<string, unknown>
) {
  const { error } = await supabase.rpc('log_platform_action', {
    _org_id: organizationId,
    _action: action,
    _entity_type: entityType || null,
    _entity_id: entityId || null,
    _details: (details || {}) as Json,
  });

  if (error) {
    console.error('Failed to log platform action:', error);
  }
}
