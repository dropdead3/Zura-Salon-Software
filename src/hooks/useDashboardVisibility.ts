import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useViewAs } from '@/contexts/ViewAsContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useEffectiveUserId } from './useEffectiveUser';
import { useGodModeTargetUserId } from './useGodModeTargetUserId';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface DashboardElementVisibility {
  id: string;
  element_key: string;
  element_name: string;
  element_category: string;
  role: AppRole;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

// Fetch all visibility settings
export function useDashboardVisibility() {
  return useQuery({
    queryKey: ['dashboard-visibility'],
    queryFn: async () => {
      // Table has 1800+ rows — must override the default 1000-row limit
      const { data, error } = await supabase
        .from('dashboard_element_visibility')
        .select('*')
        .order('element_category')
        .order('element_name')
        .limit(5000);

      if (error) throw error;
      return data as unknown as DashboardElementVisibility[];
    },
  });
}

// Fetch unique elements from the database (dynamic, not hardcoded)
export function useVisibilityElements() {
  return useQuery({
    queryKey: ['visibility-elements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_element_visibility')
        .select('element_key, element_name, element_category')
        .order('element_category')
        .order('element_name');

      if (error) throw error;

      // Deduplicate by element_key
      const uniqueElements = new Map<string, { element_key: string; element_name: string; element_category: string }>();
      data.forEach((item) => {
        if (!uniqueElements.has(item.element_key)) {
          uniqueElements.set(item.element_key, item);
        }
      });

      return Array.from(uniqueElements.values());
    },
  });
}

// Fetch unique categories from the database
export function useVisibilityCategories() {
  return useQuery({
    queryKey: ['visibility-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_element_visibility')
        .select('element_category');

      if (error) throw error;

      const categories = new Set<string>();
      data.forEach((item) => categories.add(item.element_category));
      return Array.from(categories).sort();
    },
  });
}

// Fetch visibility settings for the current effective dashboard context.
// In God Mode, this resolves roles from the impersonated org owner's profile.
export function useMyDashboardVisibility() {
  const { roles: actualRoles } = useAuth();
  const { isViewingAsUser, viewAsRole } = useViewAs();
  const { isImpersonating } = useOrganizationContext();
  const { targetUserId: godModeTargetUserId, isResolvingTarget } = useGodModeTargetUserId();
  const effectiveUserId = useEffectiveUserId();
  const roleSourceUserId = isImpersonating ? godModeTargetUserId : effectiveUserId;

  return useQuery({
    queryKey: ['dashboard-visibility', 'my', roleSourceUserId, viewAsRole, isViewingAsUser, isImpersonating, actualRoles],
    queryFn: async () => {
      let rolesToCheck: AppRole[] = actualRoles as AppRole[];

      if ((isViewingAsUser || isImpersonating) && roleSourceUserId) {
        rolesToCheck = [];

        const [{ data: userRoles, error: rolesError }, { data: profile, error: profileError }] = await Promise.all([
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', roleSourceUserId),
          supabase
            .from('employee_profiles')
            .select('is_super_admin')
            .eq('user_id', roleSourceUserId)
            .maybeSingle(),
        ]);

        if (!rolesError && userRoles && userRoles.length > 0) {
          rolesToCheck = userRoles.map((r) => r.role);
        }

        if (!profileError && profile?.is_super_admin) {
          rolesToCheck = Array.from(new Set([...rolesToCheck, 'super_admin' as AppRole]));
        }
      } else if (viewAsRole) {
        rolesToCheck = [viewAsRole];
      }

      if (rolesToCheck.length === 0) return {};

      const { data, error } = await supabase
        .from('dashboard_element_visibility')
        .select('*')
        .in('role', rolesToCheck);

      if (error) throw error;

      const visibilityMap: Record<string, boolean> = {};

      (data as DashboardElementVisibility[]).forEach((item) => {
        if (visibilityMap[item.element_key] === undefined) {
          visibilityMap[item.element_key] = item.is_visible;
        } else {
          visibilityMap[item.element_key] = visibilityMap[item.element_key] || item.is_visible;
        }
      });

      return visibilityMap;
    },
    enabled: !isResolvingTarget && (
      (isImpersonating && !!roleSourceUserId) ||
      (!isImpersonating && (actualRoles.length > 0 || isViewingAsUser || !!viewAsRole))
    ),
  });
}

// Toggle visibility for a specific element and role
export function useToggleDashboardVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ elementKey, elementName, elementCategory, role, isVisible }: { elementKey: string; elementName: string; elementCategory: string; role: AppRole; isVisible: boolean }) => {
      const { error } = await supabase
        .from('dashboard_element_visibility')
        .upsert(
          {
            element_key: elementKey,
            element_name: elementName,
            element_category: elementCategory,
            role,
            is_visible: isVisible,
          },
          { onConflict: 'element_key,role' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-visibility'] });
    },
    onError: (error) => {
      toast.error('Failed to update visibility', { description: error.message });
    },
  });
}

// Bulk update visibility for multiple elements/roles
export function useBulkUpdateVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { elementKey: string; role: AppRole; isVisible: boolean }[]) => {
      // Process updates one by one (Supabase doesn't support bulk upsert with different values easily)
      for (const update of updates) {
        const { error } = await supabase
          .from('dashboard_element_visibility')
          .update({ is_visible: update.isVisible })
          .eq('element_key', update.elementKey)
          .eq('role', update.role);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-visibility'] });
      toast.success('Visibility settings updated');
    },
    onError: (error) => {
      toast.error('Failed to update visibility settings', { description: error.message });
    },
  });
}

// Sync visibility elements - ensures all elements have entries for all active roles
export function useSyncVisibilityElements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Get all active roles from the roles table
      const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('name')
        .eq('is_active', true);

      if (rolesError) throw rolesError;

      // Get existing element-role combinations
      const { data: existing, error: existingError } = await supabase
        .from('dashboard_element_visibility')
        .select('element_key, element_name, element_category, role');

      if (existingError) throw existingError;

      // Build a set of existing combinations and get unique elements
      const existingSet = new Set(
        (existing || []).map(e => `${e.element_key}:${e.role}`)
      );

      // Get unique elements from the database
      const uniqueElements = new Map<string, { element_key: string; element_name: string; element_category: string }>();
      (existing || []).forEach((item) => {
        if (!uniqueElements.has(item.element_key)) {
          uniqueElements.set(item.element_key, {
            element_key: item.element_key,
            element_name: item.element_name,
            element_category: item.element_category,
          });
        }
      });

      // Find missing role combinations for existing elements
      const toInsert: {
        element_key: string;
        element_name: string;
        element_category: string;
        role: AppRole;
        is_visible: boolean;
      }[] = [];

      for (const element of uniqueElements.values()) {
        for (const role of roles || []) {
          const key = `${element.element_key}:${role.name}`;
          if (!existingSet.has(key)) {
            toInsert.push({
              element_key: element.element_key,
              element_name: element.element_name,
              element_category: element.element_category,
              role: role.name as AppRole,
              is_visible: true, // Default to visible
            });
          }
        }
      }

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('dashboard_element_visibility')
          .insert(toInsert);

        if (insertError) throw insertError;
      }

      return { synced: toInsert.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-visibility'] });
      queryClient.invalidateQueries({ queryKey: ['visibility-elements'] });
      queryClient.invalidateQueries({ queryKey: ['visibility-categories'] });
      if (data.synced > 0) {
        toast.success(`Synced ${data.synced} new visibility entries`);
      } else {
        toast.info('All visibility entries are up to date');
      }
    },
    onError: (error) => {
      toast.error('Failed to sync visibility elements', { description: error.message });
    },
  });
}

// Add a new element to the visibility system for all roles
export function useAddVisibilityElement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      elementKey, 
      elementName, 
      elementCategory,
      defaultVisible = true 
    }: { 
      elementKey: string; 
      elementName: string; 
      elementCategory: string;
      defaultVisible?: boolean;
    }) => {
      // Get all active roles
      const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('name')
        .eq('is_active', true);

      if (rolesError) throw rolesError;

      // Create entries for all roles
      const entries = (roles || []).map(role => ({
        element_key: elementKey,
        element_name: elementName,
        element_category: elementCategory,
        role: role.name as AppRole,
        is_visible: defaultVisible,
      }));

      const { error } = await supabase
        .from('dashboard_element_visibility')
        .insert(entries);

      if (error) throw error;

      return { count: entries.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-visibility'] });
      queryClient.invalidateQueries({ queryKey: ['visibility-elements'] });
      queryClient.invalidateQueries({ queryKey: ['visibility-categories'] });
      toast.success(`Element added for ${data.count} roles`);
    },
    onError: (error) => {
      toast.error('Failed to add element', { description: error.message });
    },
  });
}

// Update element metadata (name and category)
export function useUpdateVisibilityElement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      elementKey, 
      elementName, 
      elementCategory 
    }: { 
      elementKey: string; 
      elementName?: string; 
      elementCategory?: string;
    }) => {
      const updates: Record<string, string> = {};
      if (elementName) updates.element_name = elementName;
      if (elementCategory) updates.element_category = elementCategory;

      const { error } = await supabase
        .from('dashboard_element_visibility')
        .update(updates)
        .eq('element_key', elementKey);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-visibility'] });
      queryClient.invalidateQueries({ queryKey: ['visibility-elements'] });
      queryClient.invalidateQueries({ queryKey: ['visibility-categories'] });
      toast.success('Element updated');
    },
    onError: (error) => {
      toast.error('Failed to update element', { description: error.message });
    },
  });
}

// Delete an element from the visibility system (all roles)
export function useDeleteVisibilityElement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (elementKey: string) => {
      const { error } = await supabase
        .from('dashboard_element_visibility')
        .delete()
        .eq('element_key', elementKey);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-visibility'] });
      queryClient.invalidateQueries({ queryKey: ['visibility-elements'] });
      queryClient.invalidateQueries({ queryKey: ['visibility-categories'] });
      toast.success('Element deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete element', { description: error.message });
    },
  });
}

// Register an element if it doesn't exist (used by VisibilityGate for auto-registration)
export function useRegisterVisibilityElement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      elementKey, 
      elementName, 
      elementCategory 
    }: { 
      elementKey: string; 
      elementName: string; 
      elementCategory: string;
    }) => {
      // Check if element already exists
      const { data: existing, error: checkError } = await supabase
        .from('dashboard_element_visibility')
        .select('id')
        .eq('element_key', elementKey)
        .limit(1);

      if (checkError) throw checkError;

      // If element already exists, skip
      if (existing && existing.length > 0) {
        return { registered: false };
      }

      // Get all active roles
      const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('name')
        .eq('is_active', true);

      if (rolesError) throw rolesError;

      // Create entries for all roles (default visible)
      const entries = (roles || []).map(role => ({
        element_key: elementKey,
        element_name: elementName,
        element_category: elementCategory,
        role: role.name as AppRole,
        is_visible: true,
      }));

      const { error } = await supabase
        .from('dashboard_element_visibility')
        .insert(entries);

      if (error) throw error;

      return { registered: true, count: entries.length };
    },
    onSuccess: (data) => {
      if (data.registered) {
        queryClient.invalidateQueries({ queryKey: ['dashboard-visibility'] });
        queryClient.invalidateQueries({ queryKey: ['visibility-elements'] });
        queryClient.invalidateQueries({ queryKey: ['visibility-categories'] });
      }
    },
    // Silent - no toast on success since this is auto-registration
    onError: (error) => {
      console.error('Failed to register visibility element:', error);
    },
  });
}

// Group visibility settings by category and element
export function groupVisibilityByElement(data: DashboardElementVisibility[]) {
  const grouped: Record<string, {
    element_key: string;
    element_name: string;
    element_category: string;
    roles: Record<AppRole, boolean>;
  }> = {};

  data.forEach((item) => {
    if (!grouped[item.element_key]) {
      grouped[item.element_key] = {
        element_key: item.element_key,
        element_name: item.element_name,
        element_category: item.element_category,
        roles: {} as Record<AppRole, boolean>,
      };
    }
    grouped[item.element_key].roles[item.role] = item.is_visible;
  });

  return Object.values(grouped);
}

// Group by category
export function groupByCategory(elements: ReturnType<typeof groupVisibilityByElement>) {
  const categories: Record<string, typeof elements> = {};

  elements.forEach((element) => {
    if (!categories[element.element_category]) {
      categories[element.element_category] = [];
    }
    categories[element.element_category].push(element);
  });

  return categories;
}
