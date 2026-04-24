import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { AlertTriangle, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMinutesToDuration } from '@/lib/formatDuration';
import { formatTime12h } from '@/lib/schedule-utils';
import type { EligibleStylist, EligibilityTier } from '@/hooks/useEligibleStylistsForService';

interface ServiceShape {
  name: string;
  category?: string | null;
  duration?: number | null;
  price?: number | null;
}

interface PickerGroup {
  tier: EligibilityTier;
  label: string;
  members: EligibleStylist[];
}

interface Props {
  service: ServiceShape;
  groups: PickerGroup[];
  selectedId: string | null | undefined;
  leadStylistId: string | null | undefined;
  isDefault: boolean;
  onSelect: (userId: string) => void;
  onClearOverride: () => void;
}

/**
 * Per-service stylist picker, grouped by eligibility tier.
 * - "Available now" and "Has conflicts" are open by default
 * - "Off today" and "Other staff" are collapsed (silence is valid)
 * - Selecting a conflicting stylist surfaces an inline double-book confirm
 *   before committing (the manager may know something the system doesn't,
 *   but we surface the cost first).
 */
export function ServiceAssignmentPicker({
  service,
  groups,
  selectedId,
  leadStylistId,
  isDefault,
  onSelect,
  onClearOverride,
}: Props) {
  const [openTiers, setOpenTiers] = useState<Record<EligibilityTier, boolean>>({
    available: true,
    conflicting: true,
    off_today: false,
    other_location: false,
  });
  const [pendingConflict, setPendingConflict] = useState<EligibleStylist | null>(null);

  const handleClick = (member: EligibleStylist) => {
    if (member.tier === 'conflicting' && member.user_id !== leadStylistId) {
      setPendingConflict(member);
      return;
    }
    onSelect(member.user_id);
    setPendingConflict(null);
  };

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate">{service.name}</span>
          {service.category && <Badge variant="outline" className="text-[10px]">{service.category}</Badge>}
          {service.duration && (
            <span className="text-xs text-muted-foreground shrink-0">
              {formatMinutesToDuration(service.duration)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isDefault ? (
            <Badge variant="secondary" className="text-[10px]">Default</Badge>
          ) : (
            <button
              type="button"
              onClick={onClearOverride}
              className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {pendingConflict && (
        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 text-xs space-y-1.5">
          <div className="flex items-start gap-1.5 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
            <span>
              <strong>{pendingConflict.name}</strong> already has{' '}
              {pendingConflict.conflicts.length} overlapping{' '}
              {pendingConflict.conflicts.length === 1 ? 'booking' : 'bookings'}.
              Assigning this service will create a double-booking.
            </span>
          </div>
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setPendingConflict(null)}
              className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onSelect(pendingConflict.user_id);
                setPendingConflict(null);
              }}
              className="text-[11px] bg-amber-600 hover:bg-amber-700 text-white px-2 py-0.5 rounded"
            >
              Assign anyway
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {groups.map((group) => {
          const isOpen = openTiers[group.tier];
          return (
            <Collapsible
              key={group.tier}
              open={isOpen}
              onOpenChange={(o) => setOpenTiers(prev => ({ ...prev, [group.tier]: o }))}
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 w-full text-left text-[11px] uppercase tracking-wide text-muted-foreground hover:text-foreground py-1"
                >
                  {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <span>{group.label}</span>
                  <span className="text-muted-foreground/70">({group.members.length})</span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-0.5 pl-1">
                  {group.members.map((member) => {
                    const isActive = selectedId === member.user_id;
                    return (
                      <button
                        type="button"
                        key={member.user_id}
                        onClick={() => handleClick(member)}
                        className={cn(
                          'flex items-start gap-2 w-full p-2 rounded-md text-left text-sm transition-colors',
                          isActive ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted',
                        )}
                      >
                        <Avatar className="h-6 w-6 mt-0.5 shrink-0">
                          <AvatarImage src={member.photo_url || undefined} />
                          <AvatarFallback className="text-[8px]">
                            {(member.name || '?').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm leading-tight">{member.name}</span>
                            {member.is_lead && (
                              <Badge variant="outline" className="text-[9px] py-0">Lead</Badge>
                            )}
                            {member.tier === 'conflicting' && (
                              <Badge
                                variant="outline"
                                className="text-[9px] py-0 text-amber-700 dark:text-amber-300 border-amber-300"
                              >
                                <AlertTriangle className="h-2 w-2 mr-0.5" />
                                {member.conflicts.length}
                              </Badge>
                            )}
                          </div>
                          {member.tier === 'conflicting' && member.conflicts[0] && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 leading-tight">
                              {member.conflicts[0].role === 'assistant' ? 'Assisting' : 'Busy'}{' '}
                              {formatTime12h(member.conflicts[0].startTime)}–{formatTime12h(member.conflicts[0].endTime)}
                              {' · '}{member.conflicts[0].serviceName}
                            </span>
                          )}
                          {member.tier !== 'conflicting' && (
                            <span className="text-[10px] text-muted-foreground leading-tight">
                              {member.reasons.join(' · ')}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
        {groups.length === 0 && (
          <p className="text-xs text-muted-foreground italic px-1 py-2">
            No service providers found for this location.
          </p>
        )}
      </div>
    </div>
  );
}
