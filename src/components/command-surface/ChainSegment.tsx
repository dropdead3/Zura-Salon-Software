import React, { useState } from 'react';
import {
  MapPin,
  Clock,
  BarChart3,
  ArrowUpDown,
  Filter,
  User,
  Zap,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

export type SegmentType =
  | 'location'
  | 'time'
  | 'topic'
  | 'ranking'
  | 'negativeFilter'
  | 'subject'
  | 'action';

interface ChainSegmentProps {
  type: SegmentType;
  label: string;
  ambiguous?: boolean;
  editable?: boolean;
  options?: { value: string; label: string }[];
  onSelect?: (value: string) => void;
}

const SEGMENT_ICONS: Record<SegmentType, LucideIcon> = {
  location: MapPin,
  time: Clock,
  topic: BarChart3,
  ranking: ArrowUpDown,
  negativeFilter: Filter,
  subject: User,
  action: Zap,
};

export function ChainSegment({
  type,
  label,
  ambiguous,
  editable,
  options,
  onSelect,
}: ChainSegmentProps) {
  const [open, setOpen] = useState(false);
  const Icon = SEGMENT_ICONS[type];

  const chipContent = (
    <span
      className={cn(
        'inline-flex items-center gap-1 h-6 px-2 rounded-md',
        'text-[11px] font-sans leading-none',
        'bg-muted/40 border border-border/30 text-foreground/80',
        'transition-colors duration-100',
        editable && 'cursor-pointer hover:bg-muted/60 hover:border-border/50',
      )}
    >
      <Icon className="w-3 h-3 text-muted-foreground/60 shrink-0" strokeWidth={1.5} />
      <span className="truncate max-w-[120px]">{label}</span>
      {ambiguous && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-2.5 h-2.5 text-muted-foreground/40 shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Could be a client or stylist
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </span>
  );

  if (editable && options && onSelect) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{chipContent}</PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-auto min-w-[140px] max-w-[220px] p-1"
        >
          <div className="flex flex-col">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onSelect(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  'text-left px-2.5 py-1.5 rounded text-xs font-sans',
                  'text-foreground/80 hover:bg-muted/60 transition-colors',
                  opt.label === label && 'bg-muted/40 text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return chipContent;
}
