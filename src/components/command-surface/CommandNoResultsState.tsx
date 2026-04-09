import React from 'react';
import { CornerDownLeft } from 'lucide-react';
import { ZuraZIcon } from '@/components/icons/ZuraZIcon';
import { cn } from '@/lib/utils';
import { ChainSegment, type SegmentType } from './ChainSegment';
import type { ChainedQuery } from '@/lib/queryChainEngine';

interface CommandNoResultsStateProps {
  query: string;
  chainedQuery: ChainedQuery | null;
  onAskZura: () => void;
  isFocused?: boolean;
}

function PartialInterpretation({ chain }: { chain: ChainedQuery }) {
  const slots: { type: SegmentType; label: string }[] = [];

  if (chain.topic) slots.push({ type: 'topic', label: chain.topic.value });
  if (chain.subject) slots.push({ type: 'subject', label: chain.subject.value });
  if (chain.timeRange) {
    const label = chain.timeRange.label || chain.timeRange.value;
    slots.push({ type: 'time', label });
  }
  if (chain.locationScope) slots.push({ type: 'location', label: chain.locationScope.value });
  if (chain.rankingModifier) slots.push({ type: 'ranking', label: chain.rankingModifier.direction });
  if (chain.negativeFilter) slots.push({ type: 'negativeFilter', label: chain.negativeFilter.type.replace(/_/g, ' ') });

  if (slots.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 opacity-60">
      <span className="font-sans text-[11px] text-muted-foreground shrink-0">Understood:</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {slots.map((slot, i) => (
          <ChainSegment key={i} type={slot.type} label={slot.label} />
        ))}
      </div>
      <span className="font-sans text-[11px] text-muted-foreground">— no direct match</span>
    </div>
  );
}

export function CommandNoResultsState({
  query,
  chainedQuery,
  onAskZura,
  isFocused,
}: CommandNoResultsStateProps) {
  const showInterpretation = chainedQuery && chainedQuery.slotCount >= 1;

  return (
    <div className="py-3">
      {/* Partial interpretation — trust signal */}
      {showInterpretation && <PartialInterpretation chain={chainedQuery} />}

      {/* AI Continuation Card */}
      <div className="px-3 py-1">
        <button
          type="button"
          onClick={onAskZura}
          className={cn(
            'w-full flex items-center gap-3 rounded-lg p-3 text-left',
            'bg-card-inner/60 border border-primary/10',
            'transition-all duration-150',
            'hover:bg-primary/5 active:scale-[0.995]',
            isFocused && 'ring-1 ring-primary/20 bg-primary/5',
          )}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 shrink-0">
            <ZuraZIcon className={cn('w-4 h-4 text-primary', isFocused && 'animate-pulse')} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-sans text-sm text-foreground font-medium">Ask Zura</span>
            <p className="font-sans text-xs text-muted-foreground mt-0.5">
              Zura AI can help answer or route this
            </p>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 h-5 px-1.5 rounded border border-border/40 bg-muted/30 font-sans text-[10px] text-muted-foreground/50 shrink-0">
            <CornerDownLeft className="w-2.5 h-2.5" />
          </kbd>
        </button>
      </div>
    </div>
  );
}
