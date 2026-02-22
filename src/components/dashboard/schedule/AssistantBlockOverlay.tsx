import { useMemo } from 'react';
import { cn, formatDisplayName } from '@/lib/utils';
import { Users } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { AssistantTimeBlock } from '@/hooks/useAssistantTimeBlocks';

interface AssistantBlockOverlayProps {
  timeBlocks: AssistantTimeBlock[];
  stylistUserId: string;
  hoursStart: number;
  rowHeight?: number;
  onBlockClick?: (block: AssistantTimeBlock) => void;
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function getBlockStyle(startTime: string, endTime: string, hoursStart: number, rowHeight: number = 20) {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  const startOffset = startMinutes - (hoursStart * 60);
  const duration = endMinutes - startMinutes;
  const top = (startOffset / 15) * rowHeight;
  const height = Math.max((duration / 15) * rowHeight, rowHeight);
  return { top: `${top}px`, height: `${height}px` };
}

function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes.slice(0, 2)} ${ampm}`;
}

/**
 * Renders semi-transparent overlay blocks in a stylist's DayView column
 * for their assistant time block obligations (both as requester and as assistant).
 */
export function AssistantBlockOverlay({
  timeBlocks,
  stylistUserId,
  hoursStart,
  rowHeight = 20,
  onBlockClick,
}: AssistantBlockOverlayProps) {
  // Filter blocks relevant to this stylist column
  const relevantBlocks = useMemo(() => {
    return timeBlocks.filter(b => {
      // Show in requesting stylist's column
      if (b.requesting_user_id === stylistUserId) return true;
      // Show in assigned assistant's column
      if (b.assistant_user_id === stylistUserId && b.status === 'confirmed') return true;
      return false;
    });
  }, [timeBlocks, stylistUserId]);

  if (relevantBlocks.length === 0) return null;

  return (
    <>
      {relevantBlocks.map(block => {
        const style = getBlockStyle(block.start_time, block.end_time, hoursStart, rowHeight);
        const isRequester = block.requesting_user_id === stylistUserId;
        const isAssistant = block.assistant_user_id === stylistUserId;
        const isUnassigned = !block.assistant_user_id;
        const isConfirmed = block.status === 'confirmed';

        const requesterName = block.requesting_profile
          ? formatDisplayName(block.requesting_profile.full_name, block.requesting_profile.display_name)
          : 'Unknown';
        const assistantName = block.assistant_profile
          ? formatDisplayName(block.assistant_profile.full_name, block.assistant_profile.display_name)
          : null;

        return (
          <Tooltip key={block.id}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'absolute left-0 right-0 z-[5] pointer-events-auto rounded-sm mx-0.5 flex items-start px-1.5 py-0.5 overflow-hidden',
                  onBlockClick ? 'cursor-pointer' : 'cursor-default',
                  isRequester && isUnassigned && 'border-2 border-dashed border-amber-400/60 bg-amber-500/10 dark:bg-amber-500/5',
                  isRequester && isConfirmed && 'border border-primary/30 bg-primary/8 dark:bg-primary/5',
                  isAssistant && 'border border-dashed border-primary/40 bg-primary/10 dark:bg-primary/8',
                )}
                style={style}
                onClick={() => onBlockClick?.(block)}
              >
                <div className="flex items-center gap-1 text-[10px] truncate">
                  <Users className="h-3 w-3 shrink-0 opacity-60" />
                  {isRequester && isUnassigned && (
                    <span className="text-amber-600 dark:text-amber-400 opacity-80">Help needed</span>
                  )}
                  {isRequester && isConfirmed && assistantName && (
                    <span className="text-primary/70">w/ {assistantName}</span>
                  )}
                  {isAssistant && (
                    <span className="text-primary/70">Assisting {requesterName}</span>
                  )}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" align="center" sideOffset={4} className="max-w-xs z-[100]">
              <div className="space-y-1 text-xs">
                <div className="font-medium">
                  {isAssistant ? `Assisting ${requesterName}` : 'Assistant Coverage'}
                </div>
                <div className="text-muted-foreground">
                  {formatTime12h(block.start_time)} – {formatTime12h(block.end_time)}
                </div>
                {isRequester && isUnassigned && (
                  <div className="text-amber-600 dark:text-amber-400">Unassigned — awaiting assistant</div>
                )}
                {isRequester && isConfirmed && assistantName && (
                  <div className="text-primary">{assistantName} confirmed</div>
                )}
                {block.notes && (
                  <div className="text-muted-foreground italic">{block.notes}</div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );
}
