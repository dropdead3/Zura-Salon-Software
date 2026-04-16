import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { ScheduleTypeSelector } from './ScheduleTypeSelector';

interface ScheduleEntryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTime?: string;
  onSelectClientBooking: () => void;
  onSelectMeeting: () => void;
  onSelectTimeblock: () => void;
}

/**
 * Unified right-side entry drawer for "Add Event".
 *
 * Step 0 of all scheduling flows. Routes to the appropriate downstream surface
 * (booking, meeting wizard, or timeblock) when a tile is picked. Matches the
 * width and aesthetic of MeetingSchedulerWizard for continuity.
 */
export function ScheduleEntryDrawer({
  open,
  onOpenChange,
  selectedTime,
  onSelectClientBooking,
  onSelectMeeting,
  onSelectTimeblock,
}: ScheduleEntryDrawerProps) {
  return (
    <PremiumFloatingPanel
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="28rem"
      side="right"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/40 shrink-0">
          <h2 className="font-display text-base tracking-wide text-foreground uppercase">
            Add Event
          </h2>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <ScheduleTypeSelector
            selectedTime={selectedTime}
            onSelectClientBooking={onSelectClientBooking}
            onSelectMeeting={onSelectMeeting}
            onSelectTimeblock={onSelectTimeblock}
          />
        </div>
      </div>
    </PremiumFloatingPanel>
  );
}
