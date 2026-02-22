import { 
  UserCheck, 
  CreditCard, 
  Trash2, 
  StickyNote, 
  CheckCircle,
  Undo2,
  Calendar,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import type { PhorestAppointment, AppointmentStatus } from '@/hooks/usePhorestCalendar';

interface ScheduleActionBarProps {
  selectedAppointment: PhorestAppointment | null;
  onCheckIn?: () => void;
  onPay?: () => void;
  onRemove?: () => void;
  onNotes?: () => void;
  onConfirm?: () => void;
  onUndo?: () => void;
  onViewDetails?: () => void;
  isUpdating?: boolean;
  todayAppointmentCount?: number;
}

export function ScheduleActionBar({
  selectedAppointment,
  onCheckIn,
  onPay,
  onRemove,
  onNotes,
  onConfirm,
  onUndo,
  onViewDetails,
  isUpdating = false,
  todayAppointmentCount = 0,
}: ScheduleActionBarProps) {
  const hasSelection = !!selectedAppointment;
  const status = selectedAppointment?.status;

  // Determine which actions are available based on current status
  const canCheckIn = hasSelection && status === 'confirmed';
  const canConfirm = hasSelection && status === 'booked';
  const canPay = hasSelection && status === 'checked_in';
  const canRemove = hasSelection && !['completed', 'cancelled'].includes(status || '');

  return (
    <div
      className={cn(
        'bg-card/80 backdrop-blur-xl border border-border rounded-full px-6 py-2.5 flex items-center justify-between transition-all duration-300 shadow-lg',
        hasSelection && 'ring-1 ring-primary/40 shadow-primary/10'
      )}
    >
      {/* Left: Undo (hidden when no handler) */}
      <div className="flex items-center gap-4">
        {onUndo && (
          <Button
            variant="ghost"
            size={tokens.button.inline}
            onClick={onUndo}
            disabled={isUpdating}
            className="gap-1.5"
          >
            <Undo2 className="h-4 w-4" />
            Undo
          </Button>
        )}
      </div>

      {/* Center: Selection info or appointment count */}
      <div className={cn('flex items-center gap-2', tokens.body.muted)}>
        {hasSelection ? (
          <div className="flex items-center gap-3">
            <span className="font-medium text-foreground">
              {selectedAppointment.client_name}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground truncate max-w-[200px]">
              {selectedAppointment.service_name}
            </span>
            <Button
              variant="ghost"
              size={tokens.button.inline}
              onClick={onViewDetails}
              className="gap-1.5 text-primary"
            >
              <Eye className="h-4 w-4" />
              Details
            </Button>
          </div>
        ) : (
          <>
            <Calendar className="h-4 w-4" />
            <span>
              <span className="font-medium text-foreground">{todayAppointmentCount}</span>
              {' '}appointment{todayAppointmentCount !== 1 ? 's' : ''} today
            </span>
          </>
        )}
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size={tokens.button.inline}
          onClick={onCheckIn}
          disabled={!canCheckIn || isUpdating}
          className={cn(
            'gap-1.5',
            canCheckIn && 'border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950'
          )}
        >
          <UserCheck className="h-4 w-4" />
          Check In
        </Button>

        <Button
          variant="outline"
          size={tokens.button.inline}
          onClick={onPay}
          disabled={!canPay || isUpdating}
          className={cn(
            'gap-1.5',
            canPay && 'border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950'
          )}
        >
          <CreditCard className="h-4 w-4" />
          Pay
        </Button>

        <Button
          variant="outline"
          size={tokens.button.inline}
          onClick={onRemove}
          disabled={!canRemove || isUpdating}
          className="gap-1.5"
        >
          <Trash2 className="h-4 w-4" />
          Cancel
        </Button>

        <Button
          variant="outline"
          size={tokens.button.inline}
          onClick={onNotes}
          disabled={!hasSelection || isUpdating}
          className="gap-1.5"
        >
          <StickyNote className="h-4 w-4" />
          Notes
        </Button>

        <Button
          variant="outline"
          size={tokens.button.inline}
          onClick={onConfirm}
          disabled={!canConfirm || isUpdating}
          className={cn(
            'gap-1.5',
            canConfirm && 'border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950'
          )}
        >
          <CheckCircle className="h-4 w-4" />
          Confirm
        </Button>
      </div>
    </div>
  );
}
