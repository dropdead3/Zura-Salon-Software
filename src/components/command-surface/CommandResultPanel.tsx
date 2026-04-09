import React, { useRef, useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';
import { groupResults, type CommandResult } from './commandTypes';
import { CommandResultRow } from './CommandResultRow';

interface CommandResultPanelProps {
  results: CommandResult[];
  selectedIndex: number;
  query: string;
  onSelect: (result: CommandResult) => void;
}

export function CommandResultPanel({ results, selectedIndex, query, onSelect }: CommandResultPanelProps) {
  const groups = groupResults(results);
  const rowRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Flatten results for index mapping
  const flatResults = groups.flatMap(g => g.results);

  // Auto-scroll selected into view
  useEffect(() => {
    const el = rowRefs.current.get(selectedIndex);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  let globalIdx = 0;

  return (
    <div className="py-1">
      {groups.map((group, gi) => (
        <div key={group.id}>
          {gi > 0 && <div className="mx-4 border-t border-border/30 my-1" />}
          <div className="px-4 pt-2 pb-1">
            <span className={tokens.heading.subsection}>{group.label}</span>
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
