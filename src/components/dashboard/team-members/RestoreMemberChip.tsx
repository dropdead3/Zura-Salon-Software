import { useMemo, type MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useUnarchiveTeamMember } from '@/hooks/useArchiveTeamMember';
import type { OrganizationUser } from '@/hooks/useOrganizationUsers';
import { cn } from '@/lib/utils';

interface RestoreMemberChipProps {
  member: OrganizationUser;
  organizationId: string | undefined;
  className?: string;
}

const RESTORE_WINDOW_DAYS = 90;

/**
 * Inline restore trigger for the Archived tab on the Team Members roster.
 * Mirrors ArchiveMemberChip — same hover-reveal treatment, opposite intent.
 *
 * - One-click restore (no wizard). Restoring is non-destructive and
 *   reversible by re-archiving via ArchiveWizard.
 * - Disabled past the 90-day window (matches SecurityTab copy and
 *   useUnarchiveTeamMember backend constraint).
 * - Confirms with sonner; explicitly notes that reassigned/cancelled
 *   work was not undone — symmetry with the archive flow's audit promise.
 */
export function RestoreMemberChip({ member, organizationId, className }: RestoreMemberChipProps) {
  const unarchive = useUnarchiveTeamMember(organizationId);

  // 90-day gate: archived_at + RESTORE_WINDOW_DAYS must be in the future.
  // Computed once per render — no need for a timer.
  const { isExpired, daysRemaining } = useMemo(() => {
    if (!member.archived_at) return { isExpired: true, daysRemaining: 0 };
    const archivedMs = new Date(member.archived_at).getTime();
    const expiresMs = archivedMs + RESTORE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const remaining = Math.max(0, Math.ceil((expiresMs - Date.now()) / (24 * 60 * 60 * 1000)));
    return { isExpired: Date.now() > expiresMs, daysRemaining: remaining };
  }, [member.archived_at]);

  const name = member.display_name || member.full_name || 'team member';

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isExpired || unarchive.isPending) return;
    unarchive.mutate(member.user_id, {
      onSuccess: () => {
        // Augment the hook's generic success toast with the symmetry-preserving caveat.
        toast.success(`Restored ${name}`, {
          description: 'Reassigned or cancelled work was not undone.',
        });
      },
    });
  };

  const tooltipLabel = isExpired
    ? 'Restore window expired (90 days after archive)'
    : `Restore — ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClick}
          disabled={isExpired || unarchive.isPending}
          aria-label={`Restore ${name}`}
          className={cn(
            'h-7 w-7 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10',
            'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity',
            'disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground',
            className,
          )}
        >
          {unarchive.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {tooltipLabel}
      </TooltipContent>
    </Tooltip>
  );
}
