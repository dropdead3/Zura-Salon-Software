/**
 * RetailPerformanceAlert — calm, advisory verdict surfaced as a collapsible
 * notice strip. Default state is collapsed (headline only); expand to reveal
 * the advisory copy. Critical tier gets a "red ghost" treatment to read as a
 * notice rather than muted background text.
 *
 * Honors the visibility-contract / silence doctrine: returns null when the
 * verdict helper returns null (sub-materiality, missing inputs, no breakdown).
 */
import { useState, type KeyboardEvent } from 'react';
import { Card } from '@/components/ui/card';
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  AlertOctagon,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getRetailPerformanceVerdict,
  type RetailPerformanceTier,
} from '@/lib/retailPerformance';

interface RetailPerformanceAlertProps {
  trueRetailPercent: number | undefined;
  retailAttachmentRate: number | undefined;
  total: number;
  hasBreakdown: boolean;
  /**
   * When true, renders without the outer Card wrapper — for embedding inside
   * another card (e.g., bottom of Revenue Breakdown).
   */
  embedded?: boolean;
}

interface TierVisual {
  border: string;
  wash: string;
  washHover: string;
  ring: string;
  iconWrap: string;
  icon: LucideIcon;
  iconColor: string;
  label: string;
  labelColor: string;
}

const TIER_VISUALS: Record<RetailPerformanceTier, TierVisual> = {
  strong: {
    border: 'border-l-emerald-500/60',
    wash: 'bg-emerald-500/5',
    washHover: 'hover:bg-emerald-500/10',
    ring: '',
    iconWrap: 'bg-emerald-500/10',
    icon: TrendingUp,
    iconColor: 'text-emerald-500',
    label: 'Strong',
    labelColor: 'text-muted-foreground',
  },
  healthy: {
    border: 'border-l-foreground/30',
    wash: 'bg-muted/30',
    washHover: 'hover:bg-muted/50',
    ring: '',
    iconWrap: 'bg-muted',
    icon: Activity,
    iconColor: 'text-foreground/70',
    label: 'Healthy',
    labelColor: 'text-muted-foreground',
  },
  soft: {
    border: 'border-l-amber-500/60',
    wash: 'bg-amber-500/5',
    washHover: 'hover:bg-amber-500/10',
    ring: '',
    iconWrap: 'bg-amber-500/10',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    label: 'Soft',
    labelColor: 'text-muted-foreground',
  },
  critical: {
    border: 'border-l-red-500',
    wash: 'bg-red-500/[0.07]',
    washHover: 'hover:bg-red-500/10',
    ring: 'ring-1 ring-inset ring-red-500/20',
    iconWrap: 'bg-red-500/15 ring-1 ring-red-500/30',
    icon: AlertOctagon,
    iconColor: 'text-red-500',
    label: 'Critical',
    labelColor: 'text-red-500/90',
  },
};

export function RetailPerformanceAlert({
  trueRetailPercent,
  retailAttachmentRate,
  total,
  hasBreakdown,
  embedded = false,
}: RetailPerformanceAlertProps) {
  const [expanded, setExpanded] = useState(false);

  if (!hasBreakdown) return null;

  const verdict = getRetailPerformanceVerdict(
    trueRetailPercent,
    retailAttachmentRate,
    total,
  );
  if (!verdict) return null;

  const visual = TIER_VISUALS[verdict.tier];
  const Icon = visual.icon;

  const expand = () => setExpanded(true);
  const collapse = () => setExpanded(false);
  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      expand();
    }
  };

  const inner = (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={expand}
      onMouseLeave={collapse}
      onBlur={collapse}
      onKeyDown={handleKey}
      className={cn(
        'cursor-pointer transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        visual.washHover,
        expanded ? 'p-4' : 'py-3 px-4',
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
            visual.iconWrap,
          )}
        >
          <Icon className={cn('w-4 h-4', visual.iconColor)} />
        </div>
        <p
          className={cn(
            'flex-1 min-w-0 font-display text-xs tracking-wide uppercase',
            visual.labelColor,
          )}
        >
          Retail Health · {visual.label}
        </p>
        <ChevronDown
          className={cn(
            'w-4 h-4 shrink-0 transition-transform duration-200',
            visual.labelColor,
            expanded && 'rotate-180',
          )}
        />
      </div>
      {expanded && (
        <p className="text-sm text-foreground/90 leading-relaxed mt-2 pl-12 animate-in fade-in slide-in-from-top-1 duration-200">
          {verdict.copy}
        </p>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div
        className={cn(
          'border-l-4 rounded-md overflow-hidden',
          visual.border,
          visual.wash,
          visual.ring,
        )}
      >
        {inner}
      </div>
    );
  }

  return (
    <Card
      className={cn(
        'overflow-hidden border-l-4',
        visual.border,
        visual.wash,
        visual.ring,
      )}
    >
      {inner}
    </Card>
  );
}
