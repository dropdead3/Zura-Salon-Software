import React, { useRef, useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';
import type { RankedResultGroup, RankedResult } from '@/lib/searchRanker';
import { CommandResultRow } from './CommandResultRow';

interface CommandResultPanelProps {
  groups: RankedResultGroup[];
  selectedIndex: number;
  query: string;
  onSelect: (result: RankedResult) => void;
}

export function CommandResultPanel({ groups, selectedIndex, query, onSelect }: CommandResultPanelProps) {
  const rowRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  useEffect(() => {
    const el = rowRefs.current.get(selectedIndex);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  let globalIdx = 0;

  return (
    <div className="py-1">
      {groups.map((group, gi) => (
        <div key={group.id}>
          {gi > 0 && <div className="mx-4 border-t border-border/20 my-1" />}
          <div className="px-4 pt-2 pb-1 flex items-center gap-2">
            <span className={tokens.heading.subsection}>{group.label}</span>
            {group.results.length > 5 && (
              <span className="font-sans text-[10px] text-muted-foreground/50">{group.results.length}</span>
            )}
          </div>
          {group.results.map(result => {
            const idx = globalIdx++;
            return (
              <CommandResultRow
                key={result.id}
                ref={(el) => { if (el) rowRefs.current.set(idx, el); }}
                result={result}
                isSelected={selectedIndex === idx}
                query={query}
                onClick={() => onSelect(result)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
