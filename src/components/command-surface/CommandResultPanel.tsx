import React, { useRef, useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';
import type { RankedResultGroup, RankedResult } from '@/lib/searchRanker';
import { CommandResultRow } from './CommandResultRow';

interface CommandResultPanelProps {
  groups: RankedResultGroup[];
  selectedIndex: number;
  query: string;
  isQuestion?: boolean;
  onSelect: (result: RankedResult) => void;
  onHover?: (result: RankedResult) => void;
  onClose?: () => void;
}

export function CommandResultPanel({ groups, selectedIndex, query, isQuestion, onSelect, onHover, onClose }: CommandResultPanelProps) {
  const rowRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  useEffect(() => {
    const el = rowRefs.current.get(selectedIndex);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  let globalIdx = 0;

  return (
    <div className="py-1">
      {groups.map((group, gi) => {
        const isBestGroup = group.id === 'best';
        const groupLabel = isQuestion && group.id === 'help'
          ? 'Learn'
          : isBestGroup
            ? (group.results.length === 1 ? 'Top Result' : 'Top Results')
            : group.label;

        return (
          <div key={group.id}>
            {gi > 0 && <div className="mx-4 border-t border-border/20 my-1" />}
            <div className="px-4 pt-2 pb-1 flex items-center gap-2">
              <span className={tokens.heading.subsection}>
                {groupLabel}
              </span>
              {group.results.length > 5 && (
                <span className="font-sans text-[10px] text-muted-foreground/50">{group.results.length}</span>
              )}
            </div>
            {group.results.map((result, ri) => {
              const idx = globalIdx++;
              const isDominant = isBestGroup && ri === 0;
              return (
                <CommandResultRow
                  key={result.id}
                  ref={(el) => { if (el) rowRefs.current.set(idx, el); }}
                  result={result}
                  isSelected={selectedIndex === idx}
                  isTopResult={isBestGroup}
                  isDominant={isDominant}
                  query={query}
                  onClick={() => onSelect(result)}
                  onHover={onHover}
                  onClose={onClose}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
