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
  stylistUserId?: string;
  dateKey?: string;
  hoursStart: number;
  rowHeight?: number;
  slotInterval?: number;
}

const BLOCK_TYPE_CONFIG: Record<string, {
  icon: typeof Coffee;
  label: string;
  bg: string;
  border: string;
  text: string;
}> = {
  break: {
    icon: Coffee,
    label: 'Break',
    bg: 'bg-amber-500/20',
    border: 'border-l-amber-500',
    text: 'text-amber-900 dark:text-amber-200',
  },
  lunch: {
    icon: Coffee,
    label: 'Lunch',
    bg: 'bg-amber-500/20',
    border: 'border-l-amber-500',
    text: 'text-amber-900 dark:text-amber-200',
  },
  off: {
    icon: Moon,
    label: 'Off',
    bg: 'bg-muted/50',
    border: 'border-l-muted-foreground/40',
    text: 'text-muted-foreground',
  },
  blocked: {
    icon: Moon,
    label: 'Blocked',
    bg: 'bg-muted/40',
    border: 'border-l-muted-foreground/30',
    text: 'text-muted-foreground',
  },
  meeting: {
    icon: Coffee,
    label: 'Meeting',
    bg: 'bg-primary/15',
    border: 'border-l-primary',
    text: 'text-primary',
  },
};

const DEFAULT_CONFIG = {
  icon: Coffee,
  label: 'Block',
  bg: 'bg-muted/40',
  border: 'border-l-muted-foreground/30',
  text: 'text-muted-foreground',
};

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
                  'mx-0.5 rounded-lg border-l-4 overflow-hidden',
                  'transition-all hover:shadow-md hover:brightness-[1.08]',
                  config.bg,
                  config.border,
                  config.text,
                )}
                style={style}
              >
                {/* Compact: icon only */}
                {pixelHeight < 28 && (
                  <div className="flex items-center justify-center h-full">
                    <Icon className="h-3 w-3 shrink-0 opacity-70" />
                  </div>
                )}

                {/* Medium: icon + label */}
                {pixelHeight >= 28 && pixelHeight < 55 && (
                  <div className="flex items-center gap-1 px-1.5 mt-0.5">
                    <Icon className="h-3 w-3 shrink-0 opacity-70" />
                    <span className="text-[10px] font-medium truncate">
                      {displayLabel}
                    </span>
                  </div>
                )}

                {/* Full: icon + label + time */}
                {pixelHeight >= 55 && (
                  <div className="flex flex-col gap-0.5 px-1.5 py-1">
                    <div className="flex items-center gap-1">
                      <Icon className="h-3 w-3 shrink-0 opacity-70" />
                      <span className="text-[10px] font-medium truncate">
                        {displayLabel}
                      </span>
                    </div>
                    <span className="text-[9px] opacity-60 truncate pl-4">
                      {formatTime12h(block.start_time)} – {formatTime12h(block.end_time)}
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
