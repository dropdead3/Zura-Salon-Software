import { DATE_RANGE_LABELS } from '@/lib/dateRangeLabels';
import { useFormatDate } from '@/hooks/useFormatDate';

interface ReportDateSubtitleProps {
  dateFrom: string;
  dateTo: string;
  dateRangeKey?: string;
}

/**
 * Renders the date subtitle for report cards.
 * Shows "Last 30 Days · Mar 9, 2026 – Apr 7, 2026" when a preset is selected,
 * or just the date span for custom ranges.
 */
export function ReportDateSubtitle({ dateFrom, dateTo, dateRangeKey }: ReportDateSubtitleProps) {
  const { formatDate } = useFormatDate();
  const span = `${formatDate(new Date(dateFrom), 'MMM d, yyyy')} – ${formatDate(new Date(dateTo), 'MMM d, yyyy')}`;
  const label = dateRangeKey && dateRangeKey !== 'custom' ? DATE_RANGE_LABELS[dateRangeKey] : null;

  return <>{label ? `${label} · ${span}` : span}</>;
}
