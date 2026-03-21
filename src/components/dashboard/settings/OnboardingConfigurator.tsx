import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Settings, ClipboardCheck, BookOpen, CreditCard } from 'lucide-react';
import { HandbooksContent } from '@/components/dashboard/settings/HandbooksContent';
import { useRoles } from '@/hooks/useRoles';
import { OnboardingTasksManager } from '@/components/dashboard/OnboardingTasksManager';
import { OnboardingTasksConfigPanel } from './OnboardingTasksConfigPanel';
import { OnboardingSectionsConfigPanel } from './OnboardingSectionsConfigPanel';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { AppRole } from '@/hooks/useOnboardingConfig';

export function OnboardingConfigurator() {
  const { user } = useAuth();
  const { data: rolesData, isLoading: rolesLoading } = useRoles();
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);

  // Get user's organization
  const { data: organizationId } = useQuery({
    queryKey: ['user-organization', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data } = await supabase
        .from('employee_profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      
      return data?.organization_id || null;
    },
    enabled: !!user?.id,
  });

  // Filter to just the configurable roles (exclude platform roles)
  const configurableRoles = rolesData?.filter(role => 
    !['super_admin', 'platform_admin'].includes(role.name)
  ) || [];

  // Set default selected role
  if (!selectedRole && configurableRoles.length > 0) {
    setSelectedRole(configurableRoles[0].name as AppRole);
  }

  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Task Manager - Create/Edit Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <CardTitle className="font-display text-lg">ONBOARDING TASKS</CardTitle>
          </div>
          <CardDescription>
            Create and manage onboarding tasks. Configure visibility per role below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingTasksManager />
        </CardContent>
      </Card>

      {/* Role-Based Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <CardTitle className="font-display text-lg">ROLE CONFIGURATION</CardTitle>
          </div>
          <CardDescription>
            Configure which onboarding items are visible and required for each role.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Role Pills */}
          <div className="flex flex-wrap gap-2">
            {configurableRoles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.name as AppRole)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-sans transition-all",
                  selectedRole === role.name
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                )}
              >
                {role.display_name || role.name.replace('_', ' ')}
              </button>
            ))}
          </div>

          {selectedRole && (
            <>
              {/* Selected Role Info */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Configuring onboarding for:</span>
                <Badge variant="secondary" className="capitalize">
                  {selectedRole.replace('_', ' ')}
                </Badge>
              </div>

              {/* Tabs for Tasks vs Sections */}
              <Tabs defaultValue="tasks" className="w-full">
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="tasks" className="gap-2">
                    <ClipboardCheck className="w-4 h-4" />
                    Tasks
                  </TabsTrigger>
                  <TabsTrigger value="sections" className="gap-2">
                    <CreditCard className="w-4 h-4" />
                    Requests & Docs
                  </TabsTrigger>
                  <TabsTrigger value="handbooks" className="gap-2">
                    <BookOpen className="w-4 h-4" />
                    Handbooks
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="tasks" className="mt-4">
                  <OnboardingTasksConfigPanel selectedRole={selectedRole} />
                </TabsContent>
                
                <TabsContent value="sections" className="mt-4">
                  <OnboardingSectionsConfigPanel 
                    selectedRole={selectedRole} 
                    organizationId={organizationId || undefined}
                  />
                </TabsContent>

                <TabsContent value="handbooks" className="mt-4">
                  <HandbooksContent />
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
