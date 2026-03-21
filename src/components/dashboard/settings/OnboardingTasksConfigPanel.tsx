import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, ClipboardCheck } from 'lucide-react';
import { 
  useOnboardingTasksConfig, 
  useUpdateTaskVisibility, 
  useUpdateTaskRequired 
} from '@/hooks/useOnboardingConfig';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface OnboardingTasksConfigPanelProps {
  selectedRole: AppRole;
}

export function OnboardingTasksConfigPanel({ selectedRole }: OnboardingTasksConfigPanelProps) {
  const { data: tasks, isLoading } = useOnboardingTasksConfig();
  const updateVisibility = useUpdateTaskVisibility();
  const updateRequired = useUpdateTaskRequired();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ClipboardCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="font-sans text-sm">No onboarding tasks configured.</p>
        <p className="text-xs mt-1">Create tasks in the Onboarding Tasks section above.</p>
      </div>
    );
  }

  const handleVisibilityChange = (taskId: string, currentRoles: AppRole[], isVisible: boolean) => {
    updateVisibility.mutate({ 
      taskId, 
      role: selectedRole, 
      isVisible, 
      currentRoles 
    });
  };

  const handleRequiredChange = (taskId: string, isRequired: boolean) => {
    updateRequired.mutate({ taskId, isRequired });
  };

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const isVisible = task.visible_to_roles?.includes(selectedRole) ?? false;
        
        return (
          <div
            key={task.id}
            className={`p-4 rounded-lg border transition-all ${
              isVisible 
                ? 'bg-background border-border' 
                : 'bg-muted/30 border-muted opacity-60'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Switch
                  checked={isVisible}
                  onCheckedChange={(checked) => 
                    handleVisibilityChange(task.id, task.visible_to_roles || [], checked)
                  }
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-sans text-sm ${!isVisible ? 'text-muted-foreground' : ''}`}>
                      {task.title}
                    </span>
                    {!task.is_active && (
                      <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                  )}
                </div>
              </div>
              
              {isVisible && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRequiredChange(task.id, !task.is_required)}
                    className="transition-colors"
                    disabled={updateRequired.isPending}
                  >
                    {task.is_required ? (
                      <Badge variant="destructive" className="text-[10px] cursor-pointer hover:opacity-80">
                        Required
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-muted">
                        Optional
                      </Badge>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
