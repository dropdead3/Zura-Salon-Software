import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Organization } from '@/hooks/useOrganizations';

interface OrganizationContextValue {
  /** The user's own organization (detected from employee_profile) */
  currentOrganization: Organization | null;
  /** Platform user's manual override selection OR multi-org owner's selection */
  selectedOrganization: Organization | null;
  /** The organization to use for queries (selected > current) */
  effectiveOrganization: Organization | null;
  /** Whether a platform user is viewing as a different org */
  isImpersonating: boolean;
  /** Whether the user has access to multiple organizations */
  isMultiOrgOwner: boolean;
  /** List of organizations the user has access to (for multi-org owners) */
  userOrganizations: Organization[];
  /** Set the organization override (for platform users or multi-org owners) */
  setSelectedOrganization: (org: Organization | null) => void;
  /** Clear any org override */
  clearSelection: () => void;
  /** Loading state */
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user, isPlatformUser } = useAuth();
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);

  // Fetch user's own organization from their employee_profile
  const { data: currentOrganization, isLoading: isLoadingCurrent } = useQuery({
    queryKey: ['user-organization', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // First get the user's org ID from their profile
      const { data: profile, error: profileError } = await supabase
        .from('employee_profiles')
        .select('organization_id, active_organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching user profile org:', profileError);
        return null;
      }

      if (!profile?.organization_id) return null;

      // Now fetch the full organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (orgError) {
        console.error('Error fetching organization:', orgError);
        return null;
      }

      return org as Organization;
    },
    enabled: !!user?.id && !isPlatformUser,
  });

  // Fetch all organizations the user has access to (for multi-org owners)
  const { data: userOrganizations = [], isLoading: isLoadingUserOrgs } = useQuery({
    queryKey: ['user-accessible-organizations', user?.id],
    queryFn: async (): Promise<Organization[]> => {
      if (!user?.id) return [];

      const allOrgs = new Map<string, Organization>();

      // Get primary org from employee profile
      const { data: profile } = await supabase
        .from('employee_profiles')
        .select(`
          organization_id,
          active_organization_id,
          organizations:organization_id (*)
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.organizations && profile.organization_id) {
        const org = profile.organizations as unknown as Organization;
        allOrgs.set(profile.organization_id, org);
      }

      // Get additional orgs from organization_admins
      const { data: adminOrgs } = await supabase
        .from('organization_admins')
        .select(`
          organization_id,
          role,
          organizations:organization_id (*)
        `)
        .eq('user_id', user.id);

      adminOrgs?.forEach(ao => {
        if (ao.organizations && ao.organization_id) {
          const org = ao.organizations as unknown as Organization;
          if (!allOrgs.has(ao.organization_id)) {
            allOrgs.set(ao.organization_id, org);
          }
        }
      });

      return Array.from(allOrgs.values());
    },
    enabled: !!user?.id && !isPlatformUser,
  });

  // Check if user is a multi-org owner
  const isMultiOrgOwner = useMemo(() => {
    return userOrganizations.length > 1;
  }, [userOrganizations]);

  // Load persisted active org preference for multi-org owners
  useEffect(() => {
    if (!isMultiOrgOwner || isPlatformUser || selectedOrganization) return;

    const loadPersistedOrg = async () => {
      const { data: profile } = await supabase
        .from('employee_profiles')
        .select('active_organization_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profile?.active_organization_id) {
        const persistedOrg = userOrganizations.find(o => o.id === profile.active_organization_id);
        if (persistedOrg) {
          setSelectedOrganization(persistedOrg);
        }
      }
    };

    loadPersistedOrg();
  }, [isMultiOrgOwner, isPlatformUser, user?.id, userOrganizations, selectedOrganization]);

  // Clear selection when logging out
  useEffect(() => {
    if (!user) {
      setSelectedOrganization(null);
    }
  }, [user]);

  const clearSelection = useCallback(() => {
    setSelectedOrganization(null);
  }, []);

  // Compute effective organization
  const effectiveOrganization = useMemo(() => {
    // Platform users: use selection if set, otherwise null (platform-wide view)
    if (isPlatformUser) {
      return selectedOrganization;
    }
    // Multi-org owners: use selection if set, otherwise their primary org
    if (isMultiOrgOwner && selectedOrganization) {
      return selectedOrganization;
    }
    // Regular users: always use their own organization
    return currentOrganization || null;
  }, [isPlatformUser, isMultiOrgOwner, selectedOrganization, currentOrganization]);

  // Check if platform user is "impersonating" an org
  const isImpersonating = useMemo(() => {
    return isPlatformUser && selectedOrganization !== null;
  }, [isPlatformUser, selectedOrganization]);

  const value = useMemo(() => ({
    currentOrganization: currentOrganization || null,
    selectedOrganization,
    effectiveOrganization,
    isImpersonating,
    isMultiOrgOwner,
    userOrganizations,
    setSelectedOrganization,
    clearSelection,
    isLoading: isLoadingCurrent || isLoadingUserOrgs,
  }), [
    currentOrganization,
    selectedOrganization,
    effectiveOrganization,
    isImpersonating,
    isMultiOrgOwner,
    userOrganizations,
    clearSelection,
    isLoadingCurrent,
    isLoadingUserOrgs,
  ]);

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganizationContext() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganizationContext must be used within an OrganizationProvider');
  }
  return context;
}
