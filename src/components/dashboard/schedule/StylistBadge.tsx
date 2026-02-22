import { cn, formatDisplayName } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { User, Users } from 'lucide-react';

interface StylistBadgeProps {
  stylistProfile?: {
    display_name: string | null;
    full_name: string;
    photo_url: string | null;
  } | null;
  assistantNames?: string[];
  size?: 'sm' | 'md';
  className?: string;
}

function getStylistInitials(profile: { display_name: string | null; full_name: string }): string {
  const name = profile.display_name || profile.full_name;
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function StylistBadge({ stylistProfile, assistantNames, size = 'sm', className }: StylistBadgeProps) {
  if (!stylistProfile) return null;

  const displayName = formatDisplayName(stylistProfile.full_name, stylistProfile.display_name);
  const dim = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6';
  const textSize = size === 'sm' ? 'text-[8px]' : 'text-[9px]';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn('z-10 shrink-0', className)}>
          {stylistProfile.photo_url ? (
            <Avatar className={dim}>
              <AvatarImage src={stylistProfile.photo_url} />
              <AvatarFallback className={cn(textSize, 'bg-muted/80')}>
                {getStylistInitials(stylistProfile)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className={cn(
              dim,
              textSize,
              'rounded-full flex items-center justify-center font-medium',
              'bg-muted/80 backdrop-blur-sm text-muted-foreground',
            )}>
              {getStylistInitials(stylistProfile)}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" align="end" sideOffset={4} className="text-xs z-[100]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3 shrink-0 opacity-70" />
            <span>{displayName}</span>
          </div>
          {assistantNames && assistantNames.length > 0 && (
            <div className="flex items-center gap-1.5 opacity-80">
              <Users className="h-3 w-3 shrink-0" />
              <span>w/ {assistantNames.join(', ')}</span>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
