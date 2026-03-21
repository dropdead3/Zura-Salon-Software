import { History, UserPlus, UserMinus, Shield, ShieldOff, Crown, Check, X } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { useRoleChangeHistory, ROLE_LABELS } from '@/hooks/useUserRoles';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface RoleHistoryPanelProps {
  userId: string;
  isOpen: boolean;
  onToggle: () => void;
}

const ACTION_CONFIG: Record<string, { icon: typeof History; label: string; color: string }> = {
  approved: { icon: Check, label: 'Account approved', color: 'text-green-600' },
  revoked: { icon: X, label: 'Account approval revoked', color: 'text-red-600' },
  admin_approved: { icon: Shield, label: 'Admin role approved', color: 'text-green-600' },
  admin_revoked: { icon: ShieldOff, label: 'Admin approval revoked', color: 'text-red-600' },
  super_admin_granted: { icon: Crown, label: 'Super Admin granted', color: 'text-amber-600' },
  super_admin_revoked: { icon: Crown, label: 'Super Admin revoked', color: 'text-red-600' },
};

function parseAction(action: string): { icon: typeof History; label: string; color: string } {
  // Check for role_added:role or role_removed:role format
  if (action.startsWith('role_added:')) {
    const role = action.replace('role_added:', '') as keyof typeof ROLE_LABELS;
    return {
      icon: UserPlus,
      label: `${ROLE_LABELS[role] || role} role added`,
      color: 'text-green-600',
    };
  }
  
  if (action.startsWith('role_removed:')) {
    const role = action.replace('role_removed:', '') as keyof typeof ROLE_LABELS;
    return {
      icon: UserMinus,
      label: `${ROLE_LABELS[role] || role} role removed`,
      color: 'text-red-600',
    };
  }

  // Check predefined actions
  return ACTION_CONFIG[action] || { icon: History, label: action, color: 'text-muted-foreground' };
}

export function RoleHistoryPanel({ userId, isOpen, onToggle }: RoleHistoryPanelProps) {
  const { data: history, isLoading } = useRoleChangeHistory(userId);

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size={tokens.button.inline} className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
          <History className="w-3 h-3" />
          {isOpen ? 'Hide History' : 'View History'}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-3 pt-3 border-t border-dashed">
          <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <History className="w-3 h-3" />
            Role Change History
          </h4>
          
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="w-4 h-4 rounded-full" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-20 ml-auto" />
                </div>
              ))}
            </div>
          ) : history && history.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {history.map((log) => {
                const { icon: Icon, label, color } = parseAction(log.action);
                return (
                  <div 
                    key={log.id} 
                    className="flex items-start gap-2 text-xs py-1"
                  >
                    <Icon className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", color)} />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground"> by {log.performed_by_name}</span>
                    </div>
                    <span className="text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No history available</p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}