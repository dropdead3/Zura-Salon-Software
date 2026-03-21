import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getRoleIconComponent } from '@/components/dashboard/RoleIconPicker';
import { getRoleColorClasses } from '@/components/dashboard/RoleColorPicker';
import { useUserResponsibilities } from '@/hooks/useResponsibilities';
import { cn } from '@/lib/utils';

interface ResponsibilityBadgesProps {
  userId: string;
  size?: 'sm' | 'default';
}

export function ResponsibilityBadges({ userId, size = 'default' }: ResponsibilityBadgesProps) {
  const { data: userResponsibilities = [] } = useUserResponsibilities(userId);

  if (userResponsibilities.length === 0) return null;

  return (
    <>
      {userResponsibilities.map(ur => {
        if (!ur.responsibility) return null;
        const r = ur.responsibility;
        const Icon = getRoleIconComponent(r.icon);
        const colorClasses = getRoleColorClasses(r.color);
        
        return (
          <Tooltip key={ur.id}>
            <TooltipTrigger>
              <Badge
                variant="outline"
                className={cn(
                  'gap-1 border-dashed',
                  colorClasses.bg,
                  colorClasses.text,
                  size === 'sm' ? 'text-[10px] h-5 px-1.5' : 'text-xs'
                )}
              >
                <Icon className={cn(size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
                {r.display_name}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              {r.description || r.display_name}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );
}
