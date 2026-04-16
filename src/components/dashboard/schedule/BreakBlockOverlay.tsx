import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Coffee, Moon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getEventStyle, formatTime12h } from '@/lib/schedule-utils';
import type { StaffScheduleBlock } from '@/hooks/useStaffScheduleBlocks';

interface BreakBlockOverlayProps {
  blocks: StaffScheduleBlock[];
  /** In DayView: the stylist user_id. In WeekView: not used (pass undefined). */
  stylistUserId?: string;
  /** In WeekView: the date string 'yyyy-MM-dd' to filter blocks for that day. */
  dateKey?: string;
  hoursStart: number;
  rowHeight?: number;
  slotInterval?: number;
}

const BLOCK_TYPE_CONFIG: Record<string, { icon: typeof Coffee; label: string; className: string }> = {
  break: { icon: Coffee, label: 'Break', className: 'bg-amber-500/15 border-l-2 border-l-amber-500/50' },
  lunch: { icon: Coffee, label: 'Lunch', className: 'bg-amber-500/15 border-l-2 border-l-amber-500/50' },
  off: { icon: Moon, label: 'Off', className: 'bg-muted/40 border-l-2 border-l-muted-foreground/30' },
  blocked: { icon: Moon, label: 'Blocked', className: 'bg-muted/30 border-l-2 border-l-muted-foreground/30' },
  meeting: { icon: Coffee, label: 'Meeting', className: 'bg-primary/10 border-l-2 border-l-primary/40' },
};

const DEFAULT_CONFIG = { icon: Coffee, label: 'Block', className: 'bg-muted/30 border-l-2 border-l-muted-foreground/30' };

export function BreakBlockOverlay({
  blocks,
  stylistUserId,
  dateKey,
  hoursStart,
  rowHeight = 20,
  slotInterval = 15,
}: BreakBlockOverlayProps) {
  const relevantBlocks = useMemo(() => {
    return blocks.filter(b => {
      if (stylistUserId && b.user_id !== stylistUserId) return false;
      if (dateKey && b.block_date !== dateKey) return false;
      return true;
    });
  }, [blocks, stylistUserId, dateKey]);

  if (relevantBlocks.length === 0) return null;

  return (
    <>
      {relevantBlocks.map((block) => {
        const style = getEventStyle(block.start_time, block.end_time, hoursStart, rowHeight, slotInterval);
        const config = BLOCK_TYPE_CONFIG[block.block_type] ?? DEFAULT_CONFIG;
        const Icon = config.icon;
        const displayLabel = block.label || config.label;
        const pixelHeight = parseInt(style.height);

        return (
          <Tooltip key={block.id}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'absolute left-0 right-0 z-[3] pointer-events-auto cursor-default',
                  'flex items-start gap-1 px-1.5 overflow-hidden',
                  config.className,
                )}
                style={{
                  ...style,
                  // Hatched pattern overlay
                  backgroundImage: `repeating-linear-gradient(
                    -45deg,
                    transparent,
                    transparent 4px,
                    hsl(var(--muted-foreground) / 0.06) 4px,
                    hsl(var(--muted-foreground) / 0.06) 5px
                  )`,
                }}
              >
                {pixelHeight >= 24 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Icon className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                    <span className="text-[10px] text-muted-foreground/80 font-medium truncate">
                      {displayLabel}
                    </span>
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs max-w-xs z-[100]">
              <div className="space-y-0.5">
                <div className="font-medium">{displayLabel}</div>
                <div className="text-muted-foreground">
                  {formatTime12h(block.start_time)} – {formatTime12h(block.end_time)}
                </div>
                {block.source === 'phorest' && (
                  <div className="text-muted-foreground/60 text-[10px]">Synced from POS</div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );
}
