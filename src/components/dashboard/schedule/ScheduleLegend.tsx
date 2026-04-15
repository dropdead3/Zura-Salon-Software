import { Info, Repeat, ArrowRightLeft, Users, RotateCcw, Star, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { tokens, APPOINTMENT_STATUS_BADGE } from '@/lib/design-tokens';

type StatusKey = keyof typeof APPOINTMENT_STATUS_BADGE;

const STATUS_ORDER: StatusKey[] = ['unconfirmed', 'confirmed', 'walk_in', 'checked_in', 'completed', 'pending', 'cancelled', 'no_show'];

const STATUS_DESCRIPTIONS: Partial<Record<StatusKey, string>> = {
  unconfirmed: 'Default state — not yet confirmed by client or staff',
  confirmed: 'Client or staff confirmed the visit',
  walk_in: 'Created via kiosk walk-in or front desk same-day booking',
  checked_in: 'Client has arrived and checked in',
  completed: 'Service finished and payment processed',
  pending: 'Awaiting confirmation',
  cancelled: 'Appointment was cancelled',
  no_show: 'Client did not show up',
};

interface LegendRow {
  visual: React.ReactNode;
  label: string;
  description: string;
}

function LegendSection({ title, rows }: { title: string; rows: LegendRow[] }) {
  return (
    <div className="space-y-1.5">
      <h4 className={cn(tokens.heading.subsection, 'px-1')}>{title}</h4>
      <div className="space-y-0.5">
        {rows.map((row, i) => (
          <div key={i} className="flex items-start gap-3 px-1 py-1.5 rounded-md">
            <div className="shrink-0 mt-0.5">{row.visual}</div>
            <div className="min-w-0">
              <span className={cn(tokens.body.emphasis, 'block text-xs')}>{row.label}</span>
              <span className={cn(tokens.body.muted, 'block text-[11px] leading-snug')}>{row.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusSwatch({ statusKey }: { statusKey: StatusKey }) {
  const badge = APPOINTMENT_STATUS_BADGE[statusKey];
  return (
    <div className={cn('w-5 h-5 rounded-sm border', badge.bg, badge.border)} />
  );
}

function IconSwatch({ icon: Icon, className }: { icon: React.ElementType; className?: string }) {
  return (
    <div className="w-5 h-5 flex items-center justify-center">
      <Icon className={cn('w-3.5 h-3.5 text-muted-foreground', className)} />
    </div>
  );
}

function BadgeSwatch({ label, className }: { label: string; className: string }) {
  return (
    <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap border', className)}>
      {label}
    </span>
  );
}

function LineSwatch({ style }: { style: 'solid' | 'dashed' | 'dotted' }) {
  const borderStyle = style === 'solid' ? 'border-solid' : style === 'dashed' ? 'border-dashed' : 'border-dotted';
  return (
    <div className="w-5 h-5 flex items-center justify-center">
      <div className={cn('w-full border-t border-border', borderStyle)} />
    </div>
  );
}

export function ScheduleLegend() {
  const statusRows: LegendRow[] = STATUS_ORDER.map((key) => ({
    visual: <StatusSwatch statusKey={key} />,
    label: APPOINTMENT_STATUS_BADGE[key].label,
    description: STATUS_DESCRIPTIONS[key] || '',
  }));

  const badgeRows: LegendRow[] = [
    {
      visual: <BadgeSwatch label="Confirmed" className="bg-green-100 text-green-800 border-green-800/30 dark:bg-green-900/30 dark:text-green-300 dark:border-green-300/30" />,
      label: 'Status Badge',
      description: 'Colored pill showing appointment status',
    },
    {
      visual: <BadgeSwatch label="NEW" className="bg-amber-100 text-amber-800 border-amber-800/30 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-300/30" />,
      label: 'New Client',
      description: 'First-time client visiting this salon',
    },
    {
      visual: <BadgeSwatch label="AST" className="bg-accent text-accent-foreground border-accent-foreground/30" />,
      label: 'Assistant',
      description: 'Stylist is assisting on this appointment',
    },
  ];

  const iconRows: LegendRow[] = [
    { visual: <IconSwatch icon={Repeat} />, label: 'Recurring', description: 'Recurring appointment' },
    { visual: <IconSwatch icon={ArrowRightLeft} />, label: 'Rescheduled', description: 'Appointment was moved from another time' },
    { visual: <IconSwatch icon={Users} />, label: 'Has Assistant', description: 'Assistant(s) assigned to this service' },
    { visual: <IconSwatch icon={RotateCcw} />, label: 'Redo', description: 'Service is being redone' },
    { visual: <IconSwatch icon={Star} className="text-amber-500" />, label: 'New Client', description: 'First-time client (compact cards)' },
  ];

  const gridRows: LegendRow[] = [
    { visual: <LineSwatch style="solid" />, label: 'Hour Line', description: 'Full hour boundary' },
    { visual: <LineSwatch style="dashed" />, label: 'Half-Hour Line', description: '30-minute mark' },
    { visual: <LineSwatch style="dotted" />, label: 'Quarter-Hour Line', description: '15-minute mark' },
    {
      visual: (
        <div className="w-5 h-5 rounded-sm bg-muted-foreground/10" />
      ),
      label: 'Past Time',
      description: 'Time slot is no longer available',
    },
    {
      visual: (
        <div className="w-5 h-5 rounded-sm border border-border overflow-hidden relative">
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <pattern id="legend-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="4" className="stroke-muted-foreground/30" strokeWidth="1" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#legend-hatch)" />
          </svg>
        </div>
      ),
      label: 'Outside Hours',
      description: 'Outside location operating hours',
    },
    {
      visual: (
        <div className="flex items-center">
          <Moon className="w-3 h-3 text-destructive" />
        </div>
      ),
      label: 'Closed',
      description: 'Location closed (holiday or regular closure)',
    },
  ];

  const overlayRows: LegendRow[] = [
    {
      visual: (
        <div className="w-5 h-5 rounded-sm border border-border bg-muted/50 relative overflow-hidden">
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="0" x2="100%" y2="100%" className="stroke-muted-foreground/40" strokeWidth="1" />
            <line x1="100%" y1="0" x2="0" y2="100%" className="stroke-muted-foreground/40" strokeWidth="1" />
          </svg>
        </div>
      ),
      label: 'Block / Break',
      description: 'Staff break or blocked time',
    },
    {
      visual: <div className="w-5 h-5 rounded-sm border border-dashed border-amber-500 bg-amber-50 dark:bg-amber-900/20" />,
      label: 'Pending Redo',
      description: 'Redo appointment awaiting completion',
    },
    {
      visual: (
        <div className="w-5 h-5 rounded-sm border border-border bg-muted/50 relative overflow-hidden">
          <div className="absolute top-1/2 left-0 right-0 border-t border-muted-foreground/40" />
        </div>
      ),
      label: 'Cancelled',
      description: 'Appointment has been cancelled',
    },
    {
      visual: (
        <div className="w-5 h-5 rounded-sm bg-destructive/20 border border-destructive/40 flex items-center justify-center">
          <AlertTriangle className="w-3 h-3 text-destructive" />
        </div>
      ),
      label: 'No-Show',
      description: 'Client did not attend the appointment',
    },
  ];

  const colorModeRows: LegendRow[] = [
    {
      visual: (
        <div className="flex gap-0.5">
          <div className="w-2 h-5 rounded-sm bg-green-500" />
          <div className="w-2 h-5 rounded-sm bg-blue-500" />
        </div>
      ),
      label: 'By Status',
      description: 'Cards colored by appointment status',
    },
    {
      visual: (
        <div className="flex gap-0.5">
          <div className="w-2 h-5 rounded-sm bg-pink-400" />
          <div className="w-2 h-5 rounded-sm bg-teal-400" />
        </div>
      ),
      label: 'By Service',
      description: 'Cards colored by service category',
    },
    {
      visual: (
        <div className="flex gap-0.5">
          <div className="w-2 h-5 rounded-sm bg-orange-400" />
          <div className="w-2 h-5 rounded-sm bg-indigo-400" />
        </div>
      ),
      label: 'By Stylist',
      description: 'Cards colored per stylist',
    },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn('rounded-full h-9 w-9 shrink-0 bg-card/80 backdrop-blur-xl')}
        >
          <Info className="h-4 w-4" />
          <span className="sr-only">Schedule Key</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className="w-80 p-0 rounded-xl overflow-hidden"
      >
        <div className="px-4 pt-3 pb-2 border-b border-border">
          <h3 className={tokens.heading.card}>Schedule Key</h3>
          <p className={cn(tokens.body.muted, 'text-xs mt-0.5')}>Visual guide for all calendar elements</p>
        </div>
        <ScrollArea className="h-[60vh]">
          <div className="px-4 py-3 space-y-4">
            <LegendSection title="Appointment Status" rows={statusRows} />
            <LegendSection title="Badges" rows={badgeRows} />
            <LegendSection title="Card Icons" rows={iconRows} />
            <LegendSection title="Grid & Time Slots" rows={gridRows} />
            <LegendSection title="Card Overlays" rows={overlayRows} />
            <LegendSection title="Color Modes" rows={colorModeRows} />
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
