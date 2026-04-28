import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Pin, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { useDashboardVisibility } from '@/hooks/useDashboardVisibility';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import {
  useDashboardLayout,
  useSaveDashboardLayout,
  isPinnedInLayout,
  toPinnedEntry,
} from '@/hooks/useDashboardLayout';

type AppRole = Database['public']['Enums']['app_role'];

interface CommandCenterVisibilityToggleProps {
  elementKey: string;
  elementName: string;
  elementCategory?: string;
}

const LEADERSHIP_ROLES: AppRole[] = ['super_admin', 'admin', 'manager'];

export function CommandCenterVisibilityToggle({ 
  elementKey, 
  elementName,
  elementCategory = 'Analytics Hub',
}: CommandCenterVisibilityToggleProps) {
  const { data: profile } = useEmployeeProfile();
  const isSuperAdmin = profile?.is_super_admin;
  const [isOpen, setIsOpen] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  
  const { data: visibilityData, isLoading } = useDashboardVisibility();
  const { layout } = useDashboardLayout();
  const saveLayout = useSaveDashboardLayout();
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id ?? null;

  // Only show for Super Admins
  if (!isSuperAdmin) return null;

  // Get current visibility settings for this element
  const elementVisibility = visibilityData?.filter(
    v => v.element_key === elementKey
  ) || [];

  // Card is pinned if ANY leadership role has it visible OR it's in the layout's pinnedCards
  const isVisibleViaRoles = LEADERSHIP_ROLES.some(role => 
    elementVisibility.find(v => v.role === role)?.is_visible === true
  );
  const isVisibleToLeadership = isVisibleViaRoles || isPinnedInLayout(layout, elementKey);

  const handleToggle = async (checked: boolean) => {
    setIsToggling(true);
    try {
      if (!orgId) {
        throw new Error('No active organization selected.');
      }
      // Wave 2: tenant-scoped upsert. NULL-org rows are platform-seeded
      // global defaults and must not be touched here.
      const rows = LEADERSHIP_ROLES.map(role => ({
        element_key: elementKey,
        element_name: elementName,
        element_category: elementCategory,
        role,
        is_visible: checked,
        organization_id: orgId,
      }));

      // Read-then-update/insert (partial unique index can't be used as ON CONFLICT target).
      const { data: existing, error: selErr } = await supabase
        .from('dashboard_element_visibility')
        .select('id, role')
        .eq('element_key', elementKey)
        .eq('organization_id', orgId)
        .in('role', LEADERSHIP_ROLES);
      if (selErr) throw selErr;

      const existingByRole = new Map((existing || []).map(r => [r.role, r.id]));
      const toUpdate = rows.filter(r => existingByRole.has(r.role));
      const toInsert = rows.filter(r => !existingByRole.has(r.role));

      for (const row of toUpdate) {
        const id = existingByRole.get(row.role)!;
        const { error } = await supabase
          .from('dashboard_element_visibility')
          .update({ is_visible: row.is_visible, element_name: row.element_name, element_category: row.element_category })
          .eq('id', id);
        if (error) throw error;
      }
      if (toInsert.length > 0) {
        const { error } = await supabase
          .from('dashboard_element_visibility')
          .insert(toInsert);
        if (error) throw error;
      }

      // Sync to dashboard_layout so Customizer stays in sync
      const currentLayout = layout ?? { sections: [], widgets: [], hasCompletedSetup: false, pinnedCards: [], sectionOrder: [] };
      const pinnedEntry = toPinnedEntry(elementKey);

      if (checked) {
        const newPinnedCards = [...new Set([...(currentLayout.pinnedCards || []), elementKey])];
        const newSectionOrder = [...new Set([...(currentLayout.sectionOrder || []), pinnedEntry])];
        saveLayout.mutate({ ...currentLayout, pinnedCards: newPinnedCards, sectionOrder: newSectionOrder });
      } else {
        const newPinnedCards = (currentLayout.pinnedCards || []).filter(id => id !== elementKey);
        const newSectionOrder = (currentLayout.sectionOrder || []).filter(id => id !== pinnedEntry);
        saveLayout.mutate({ ...currentLayout, pinnedCards: newPinnedCards, sectionOrder: newSectionOrder });
      }

      // Invalidate all visibility queries so UI updates everywhere
      queryClient.invalidateQueries({ queryKey: ['dashboard-visibility'] });
    } catch (error: any) {
      toast.error('Failed to update visibility', { description: error.message });
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "h-7 w-7 rounded-full",
                  isVisibleToLeadership 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Pin className={cn(
                  "h-4 w-4 transition-transform",
                  isVisibleToLeadership && "fill-current rotate-[-45deg]"
                )} />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          {!isOpen && (
            <TooltipContent side="bottom" className="text-xs">
              {isVisibleToLeadership ? 'Unpin from Command Center' : 'Pin to Command Center'}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-medium text-sm">Page Settings</h4>
            <p className="text-xs text-muted-foreground">
              Configure visibility on Command Center
            </p>
          </div>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {isVisibleToLeadership ? (
                <Eye className="h-4 w-4 text-muted-foreground" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              <Label htmlFor="visibility-toggle" className="text-sm">
                Show on Command Center
              </Label>
            </div>
            {isLoading || isToggling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Switch
                id="visibility-toggle"
                checked={isVisibleToLeadership}
                onCheckedChange={handleToggle}
              />
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            When enabled, the {elementName} card will appear on the Command Center dashboard for leadership roles.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
