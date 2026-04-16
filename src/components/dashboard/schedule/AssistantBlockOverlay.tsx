import { useMemo, useState, useCallback, useRef } from 'react';
import { cn, formatDisplayName } from '@/lib/utils';
import { Users, GripHorizontal } from 'lucide-react';
import { toast } from 'sonner';
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
  slotInterval?: number;
  onBlockClick?: (block: AssistantTimeBlock) => void;
  onBlockResize?: (blockId: string, newEndTime: string) => void;
  currentUserId?: string;
}

import { parseTimeToMinutes, formatTime12h, minutesToTimeStr, getEventStyle as getEventStyleShared } from '@/lib/schedule-utils';

function getBlockStyle(startTime: string, endTime: string, hoursStart: number, rowHeight: number = 20, slotInterval: number = 15) {
  return getEventStyleShared(startTime, endTime, hoursStart, rowHeight, slotInterval);
}

/**
 * Renders semi-transparent overlay blocks in a stylist's DayView column
 * for their assistant time block obligations (both as requester and as assistant).
 * Supports drag-to-resize on the bottom edge for unconfirmed blocks owned by the current user.
 */
export function AssistantBlockOverlay({
  timeBlocks,
  stylistUserId,
  hoursStart,
  rowHeight = 20,
  slotInterval = 15,
  onBlockClick,
  onBlockResize,
  currentUserId,
}: AssistantBlockOverlayProps) {
  const [resizingBlockId, setResizingBlockId] = useState<string | null>(null);
  const [resizeDeltaPx, setResizeDeltaPx] = useState(0);
  const startYRef = useRef(0);

  // Filter blocks relevant to this stylist column
  const relevantBlocks = useMemo(() => {
    return timeBlocks.filter(b => {
      if (b.requesting_user_id === stylistUserId) return true;
      if (b.assistant_user_id === stylistUserId && b.status === 'confirmed') return true;
      return false;
    });
  }, [timeBlocks, stylistUserId]);

  const handleResizeStart = useCallback((e: React.PointerEvent, blockId: string) => {
    e.stopPropagation();
    e.preventDefault();
    startYRef.current = e.clientY;
    setResizingBlockId(blockId);
    setResizeDeltaPx(0);

    const handleMove = (ev: PointerEvent) => {
      const delta = ev.clientY - startYRef.current;
      setResizeDeltaPx(delta);
    };

    const handleUp = (ev: PointerEvent) => {
      const finalDelta = ev.clientY - startYRef.current;
      // Snap to slot increments
      const deltaSlots = Math.round(finalDelta / rowHeight);
      const deltaMinutes = deltaSlots * slotInterval;

      if (deltaMinutes !== 0 && onBlockResize) {
        const block = timeBlocks.find(b => b.id === blockId);
        if (block) {
          const currentEnd = parseTimeToMinutes(block.end_time);
          const newEnd = Math.max(parseTimeToMinutes(block.start_time) + slotInterval, currentEnd + deltaMinutes);
          const newEndStr = minutesToTimeStr(newEnd);

          // Basic overlap check against other blocks for same user
          const hasOverlap = timeBlocks.some(other =>
            other.id !== blockId
            && (other.requesting_user_id === block.requesting_user_id || other.assistant_user_id === block.requesting_user_id)
            && parseTimeToMinutes(other.start_time) < newEnd
            && parseTimeToMinutes(other.end_time) > parseTimeToMinutes(block.start_time)
            && other.date === block.date
          );

          if (hasOverlap) {
            toast.warning('Resize would create a conflict — reverted');
          } else {
            onBlockResize(blockId, newEndStr);
          }
        }
      }

      setResizingBlockId(null);
      setResizeDeltaPx(0);
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
  }, [rowHeight, onBlockResize, timeBlocks]);

  if (relevantBlocks.length === 0) return null;

  return (
    <>
      {relevantBlocks.map(block => {
        const isResizing = resizingBlockId === block.id;
        const extraHeight = isResizing ? resizeDeltaPx : 0;
        const style = getBlockStyle(block.start_time, block.end_time, hoursStart, rowHeight, slotInterval);
        const baseHeight = parseInt(style.height);
        const finalHeight = Math.max(rowHeight, baseHeight + extraHeight);

        const isRequester = block.requesting_user_id === stylistUserId;
        const isAssistant = block.assistant_user_id === stylistUserId;
        const isUnassigned = !block.assistant_user_id;
        const isConfirmed = block.status === 'confirmed';
        const canResize = isRequester && !isConfirmed && currentUserId === block.requesting_user_id;

        const requesterName = block.requesting_profile
          ? formatDisplayName(block.requesting_profile.full_name, block.requesting_profile.display_name)
          : 'Unknown';
        const assistantName = block.assistant_profile
          ? formatDisplayName(block.assistant_profile.full_name, block.assistant_profile.display_name)
          : null;

        // Ghost end time preview during resize
        let ghostEndTime: string | null = null;
        if (isResizing) {
          const deltaSlots = Math.round(resizeDeltaPx / rowHeight);
          const deltaMinutes = deltaSlots * slotInterval;
          const currentEnd = parseTimeToMinutes(block.end_time);
          const newEnd = Math.max(parseTimeToMinutes(block.start_time) + slotInterval, currentEnd + deltaMinutes);
          ghostEndTime = formatTime12h(minutesToTimeStr(newEnd));
        }

        return (
          <Tooltip key={block.id}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'absolute left-0 right-0 z-[5] pointer-events-auto rounded-sm mx-0.5 flex flex-col overflow-hidden',
                  onBlockClick && !isResizing ? 'cursor-pointer' : 'cursor-default',
                  isRequester && isUnassigned && 'border-2 border-dashed border-amber-400/60 bg-amber-500/10 dark:bg-amber-500/5',
                  isRequester && isConfirmed && 'border border-primary/30 bg-primary/8 dark:bg-primary/5',
                  isAssistant && 'border border-dashed border-primary/40 bg-primary/10 dark:bg-primary/8',
                  isResizing && 'ring-1 ring-primary/40',
                )}
                style={{ top: style.top, height: `${finalHeight}px` }}
                onClick={() => !isResizing && onBlockClick?.(block)}
              >
                <div className="flex items-center gap-1 text-[10px] truncate px-1.5 py-0.5 flex-1">
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
                  {isResizing && ghostEndTime && (
                    <span className="ml-auto text-primary text-[9px]">→ {ghostEndTime}</span>
                  )}
                </div>

                {/* Bottom drag handle for resize */}
                {canResize && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-2 cursor-row-resize flex items-center justify-center hover:bg-primary/10 transition-colors"
                    onPointerDown={(e) => handleResizeStart(e, block.id)}
                  >
                    <GripHorizontal className="h-2.5 w-2.5 text-muted-foreground/40" />
                  </div>
                )}
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
                {canResize && (
                  <div className="text-muted-foreground italic">Drag bottom edge to resize</div>
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
