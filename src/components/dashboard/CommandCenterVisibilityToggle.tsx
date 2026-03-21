import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Pin, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { useDashboardVisibility } from '@/hooks/useDashboardVisibility';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

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
  const queryClient = useQueryClient();

  // Only show for Super Admins
  if (!isSuperAdmin) return null;

  // Get current visibility settings for this element
  const elementVisibility = visibilityData?.filter(
    v => v.element_key === elementKey
  ) || [];

  // Match Command Center logic: card is pinned if ANY leadership role has it visible
  const isVisibleToLeadership = LEADERSHIP_ROLES.some(role => 
    elementVisibility.find(v => v.role === role)?.is_visible === true
  );

  // #region agent log — H5: check visibility data on render
  fetch('http://127.0.0.1:7242/ingest/9caa1fd3-4fc1-4530-b70d-2ec8970af2be',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CommandCenterVisibilityToggle.tsx:RENDER',message:'render state',data:{elementKey,elementCategory,isLoading,isToggling,visibilityDataLength:visibilityData?.length,elementVisibilityCount:elementVisibility.length,elementVisibilityRoles:elementVisibility.map(v=>({role:v.role,is_visible:v.is_visible})),isVisibleToLeadership},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
  // #endregion

  const handleToggle = async (checked: boolean) => {
    // #region agent log — H3: check if handleToggle fires
    fetch('http://127.0.0.1:7242/ingest/9caa1fd3-4fc1-4530-b70d-2ec8970af2be',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CommandCenterVisibilityToggle.tsx:handleToggle:ENTRY',message:'handleToggle called',data:{checked,elementKey,elementName,elementCategory},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    setIsToggling(true);
    try {
      // Upsert all leadership roles in a single batch call
      const rows = LEADERSHIP_ROLES.map(role => ({
        element_key: elementKey,
        element_name: elementName,
        element_category: elementCategory,
        role,
        is_visible: checked,
      }));

      const { error, data, status, statusText } = await supabase
        .from('dashboard_element_visibility')
        .upsert(rows, { onConflict: 'element_key,role' })
        .select();

      // #region agent log — H1/H2: check upsert result
      fetch('http://127.0.0.1:7242/ingest/9caa1fd3-4fc1-4530-b70d-2ec8970af2be',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CommandCenterVisibilityToggle.tsx:handleToggle:UPSERT_RESULT',message:'upsert result',data:{error:error?{message:error.message,code:error.code,details:error.details,hint:error.hint}:null,dataLength:data?.length,status,statusText,returnedRows:data?.map((r:any)=>({element_key:r.element_key,role:r.role,is_visible:r.is_visible}))},timestamp:Date.now(),hypothesisId:'H1_H2'})}).catch(()=>{});
      // #endregion

      if (error) throw error;

      // Invalidate all visibility queries so UI updates everywhere
      // #region agent log — H4: check invalidation
      fetch('http://127.0.0.1:7242/ingest/9caa1fd3-4fc1-4530-b70d-2ec8970af2be',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CommandCenterVisibilityToggle.tsx:handleToggle:BEFORE_INVALIDATE',message:'about to invalidate queries',data:{queryKey:'dashboard-visibility'},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      queryClient.invalidateQueries({ queryKey: ['dashboard-visibility'] });
    } catch (error: any) {
      // #region agent log — H1/H2: catch block
      fetch('http://127.0.0.1:7242/ingest/9caa1fd3-4fc1-4530-b70d-2ec8970af2be',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CommandCenterVisibilityToggle.tsx:handleToggle:CATCH',message:'toggle error caught',data:{errorMessage:error?.message,errorCode:error?.code},timestamp:Date.now(),hypothesisId:'H1_H2'})}).catch(()=>{});
      // #endregion
      toast.error('Failed to update visibility', { description: error.message });
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
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
