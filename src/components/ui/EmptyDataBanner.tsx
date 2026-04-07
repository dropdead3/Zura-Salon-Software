import { AlertTriangle, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DATE_RANGE_LABELS, getDateRangeSubtitle } from '@/lib/dateRangeLabels';

interface EmptyDataBannerProps {
  dateRangeKey?: string;
  className?: string;
}

/**
 * Advisory banner shown when all analytics are zero for a given period.
 * Suggests selecting a wider date range. Not an error — guidance only.
 */
export function EmptyDataBanner({ dateRangeKey, className }: EmptyDataBannerProps) {
  const isToday = dateRangeKey === 'today';
  const isYesterday = dateRangeKey === 'yesterday';

  return (
    <div className={cn(
      'flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4',
      className,
    )}>
      <div className="shrink-0 mt-0.5 rounded-lg bg-amber-500/10 p-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">No activity recorded for this period</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isToday
            ? "The filter is set to \"Today\" and no appointments have been completed yet. This is common early in the day or on days the salon is closed."
            : isYesterday
              ? "No appointments were completed yesterday. This may be expected if the salon was closed."
              : "No completed appointments were found in the selected date range."
          }
          {' '}Try selecting a wider range like <span className="font-medium text-foreground">Last 30 Days</span> or <span className="font-medium text-foreground">Last Month</span> to see performance data.
        </p>
      </div>
    </div>
  );
}

interface DateRangeSubtitleProps {
  dateRangeKey?: string;
  dateFrom?: string;
  dateTo?: string;
  className?: string;
}

/**
 * Shows the date-range label + computed date span, e.g. "Last Month · Mar 1 – Mar 31".
 */
export function DateRangeSubtitle({ dateRangeKey, dateFrom, dateTo, className }: DateRangeSubtitleProps) {
  if (!dateRangeKey) return null;

  const label = DATE_RANGE_LABELS[dateRangeKey] || dateRangeKey;
  const subtitle = getDateRangeSubtitle(dateRangeKey);

  // For rolling windows (7d, 30d, 90d) or custom, format dateFrom–dateTo
  const fallback = dateFrom && dateTo && !subtitle
    ? `${formatSimple(dateFrom)} – ${formatSimple(dateTo)}`
    : null;

  const detail = subtitle || fallback;
  if (!detail) return null;

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <Calendar className="w-3 h-3" />
      <span className="font-medium text-foreground">{label}</span>
      <span className="text-muted-foreground/50">·</span>
      <span>{detail}</span>
    </span>
  );
}

function formatSimple(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
