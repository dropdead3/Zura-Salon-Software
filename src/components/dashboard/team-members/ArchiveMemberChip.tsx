import { useState, type MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Archive } from 'lucide-react';
import { ArchiveWizard } from '@/components/dashboard/team-members/archive/ArchiveWizard';
import type { OrganizationUser } from '@/hooks/useOrganizationUsers';
import { cn } from '@/lib/utils';

interface ArchiveMemberChipProps {
  member: OrganizationUser;
  className?: string;
}

/**
 * Inline archive trigger for MemberRow on the Team Members roster.
 * Opens the existing ArchiveWizard (full reassignment + reason flow) so
 * historical data, dependency handling, and audit trail are preserved.
 *
 * - Stops click propagation so the parent MemberRow doesn't navigate.
 * - Hidden for already-archived members (caller should also gate by
 *   permission and exclude super_admin where appropriate).
 */
export function ArchiveMemberChip({ member, className }: ArchiveMemberChipProps) {
  const [open, setOpen] = useState(false);

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClick}
            aria-label={`Archive ${member.display_name || member.full_name || 'team member'}`}
            className={cn(
              'h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10',
              className,
            )}
          >
            <Archive className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Archive team member
        </TooltipContent>
      </Tooltip>

      <ArchiveWizard open={open} onOpenChange={setOpen} member={member} />
    </>
  );
}
