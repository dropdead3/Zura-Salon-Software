import React, { useCallback, useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChainSegment, type SegmentType } from './ChainSegment';
import type { ChainedQuery, NegativeFilter } from '@/lib/queryChainEngine';
import { DATE_RANGE_LABELS } from '@/lib/dateRangeLabels';

interface CommandChainBarProps {
  chain: ChainedQuery;
  query: string;
  aiMode: boolean;
  hasActiveAction: boolean;
  locationNames?: string[];
  onQueryChange: (q: string) => void;
  onNavigate?: (path: string) => void;
}

// Time options for the editable popover
const TIME_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'thisWeek', label: 'This Week' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: '90d', label: 'Last 90 Days' },
];

// Map time values to query-friendly text for replacement
const TIME_QUERY_TEXT: Record<string, string> = {
  today: 'today',
  thisWeek: 'this week',
  '7d': 'last 7 days',
  '30d': 'last 30 days',
  thisMonth: 'this month',
  lastMonth: 'last month',
  '90d': 'last 90 days',
};

// Time-related words to strip from query when replacing
const TIME_WORDS = new Set([
  'today', 'yesterday', 'this', 'last', 'week', 'month', 'days', 'day',
  'quarter', 'year', '7', '30', '90', '60', 'past',
]);

function formatNegativeFilter(nf: NegativeFilter): string {
  const base = nf.type.replace('no_', 'No ').replace(/_/g, ' ');
  if (nf.daysThreshold) return `${base}, ${nf.daysThreshold}d`;
  return base;
}

function formatTimeLabel(value: string): string {
  return DATE_RANGE_LABELS[value] || value;
}

export function CommandChainBar({
  chain,
  query,
  aiMode,
  hasActiveAction,
  locationNames = [],
  onQueryChange,
  onNavigate,
}: CommandChainBarProps) {
  // Visibility: must meet all conditions
  const visible =
    query.trim().length >= 2 &&
    chain.slotCount >= 2 &&
    chain.confidence >= 0.4 &&
    !aiMode &&
    !hasActiveAction;

  // Build segments from chain slots
  const segments = useMemo(() => {
    if (!visible) return [];

    const segs: {
      type: SegmentType;
      label: string;
      key: string;
      ambiguous?: boolean;
      editable?: boolean;
    }[] = [];

    if (chain.rankingModifier) {
      const dir = chain.rankingModifier.direction;
      const label = dir.charAt(0).toUpperCase() + dir.slice(1);
      segs.push({ type: 'ranking', label, key: 'ranking' });
    }

    if (chain.subject) {
      const ambiguous =
        chain.subject.confidence < 0.6 || !chain.subjectType;
      segs.push({
        type: 'subject',
        label: chain.subject.value,
        key: 'subject',
        ambiguous,
      });
    }

    if (chain.topic) {
      const label =
        chain.topic.value.charAt(0).toUpperCase() + chain.topic.value.slice(1);
      segs.push({ type: 'topic', label, key: 'topic' });
    }

    if (chain.negativeFilter) {
      segs.push({
        type: 'negativeFilter',
        label: formatNegativeFilter(chain.negativeFilter),
        key: 'negFilter',
      });
    }

    if (chain.timeRange) {
      segs.push({
        type: 'time',
        label: formatTimeLabel(chain.timeRange.value),
        key: 'time',
        editable: true,
      });
    }

    if (chain.locationScope) {
      segs.push({
        type: 'location',
        label: chain.locationScope.value,
        key: 'location',
        editable: locationNames.length > 1,
      });
    }

    if (chain.actionVerb) {
      segs.push({
        type: 'action',
        label: chain.actionVerb.type,
        key: 'action',
      });
    }

    return segs;
  }, [visible, chain, locationNames.length]);

  // Handle time selection → reconstruct query
  const handleTimeSelect = useCallback(
    (newValue: string) => {
      const words = query.split(/\s+/);
      const nonTimeWords = words.filter(
        (w) => !TIME_WORDS.has(w.toLowerCase()),
      );
      const newTimeText = TIME_QUERY_TEXT[newValue] || newValue;
      onQueryChange([...nonTimeWords, newTimeText].join(' '));
    },
    [query, onQueryChange],
  );

  // Handle location selection → reconstruct query
  const handleLocationSelect = useCallback(
    (newLocation: string) => {
      const currentLoc = chain.locationScope?.value?.toLowerCase();
      if (!currentLoc) return;
      const words = query.split(/\s+/);
      const replaced = words.map((w) =>
        w.toLowerCase() === currentLoc ? newLocation : w,
      );
      onQueryChange(replaced.join(' '));
    },
    [query, chain.locationScope, onQueryChange],
  );

  const locationOptions = useMemo(
    () => locationNames.map((n) => ({ value: n, label: n })),
    [locationNames],
  );

  const showDestination =
    chain.destinationHint && chain.confidence >= 0.7 && onNavigate;

  if (!visible || segments.length === 0) return null;

  return (
    <div className="hidden sm:flex items-center gap-1.5 px-5 py-2 border-b border-border/20 overflow-x-auto">
      {segments.map((seg) => (
        <ChainSegment
          key={seg.key}
          type={seg.type}
          label={seg.label}
          ambiguous={seg.ambiguous}
          editable={seg.editable}
          options={
            seg.key === 'time'
              ? TIME_OPTIONS
              : seg.key === 'location'
                ? locationOptions
                : undefined
          }
          onSelect={
            seg.key === 'time'
              ? handleTimeSelect
              : seg.key === 'location'
                ? handleLocationSelect
                : undefined
          }
        />
      ))}

      {showDestination && chain.destinationHint && (
        <button
          type="button"
          onClick={() => onNavigate!(chain.destinationHint!.path)}
          className={cn(
            'ml-auto inline-flex items-center gap-1 shrink-0',
            'text-[11px] font-sans text-primary/70',
            'hover:text-primary transition-colors duration-100',
          )}
          tabIndex={-1}
        >
          <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
          <span className="truncate max-w-[200px]">
            {chain.destinationHint.label.split(' · ')[0]}
          </span>
        </button>
      )}
    </div>
  );
}
