import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface BrowseColumnItem {
  key: string;
  label: string;
  count: number;
  /** 'green' = all complete, 'amber' = some missing, 'red' = majority missing */
  health?: 'green' | 'amber' | 'red';
}

/** Theme class slots for BrowseColumnBase */
export interface BrowseColumnTheme {
  container: string;
  header: string;
  headerLabel: string;
  searchIcon: string;
  searchInput: string;
  emptyText: string;
  itemActive: string;
  itemInactive: string;
  countActive: string;
  countInactive: string;
}

interface BrowseColumnBaseProps {
  title: string;
  items: BrowseColumnItem[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  theme: BrowseColumnTheme;
  /** Show inline search when items exceed this count (default 8) */
  searchThreshold?: number;
  className?: string;
  /** Enable keyboard navigation focus on this column */
  focusActive?: boolean;
  onKeyNav?: (direction: 'up' | 'down' | 'left' | 'right' | 'escape') => void;
}

const HEALTH_DOT: Record<string, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

export function BrowseColumnBase({
  title,
  items,
  selectedKey,
  onSelect,
  theme,
  searchThreshold = 8,
  className,
  focusActive,
  onKeyNav,
}: BrowseColumnBaseProps) {
  const [filter, setFilter] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = filter.trim()
    ? items.filter((i) => i.label.toLowerCase().includes(filter.toLowerCase()))
    : items;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIdx = filtered.findIndex((i) => i.key === selectedKey);
        let nextIdx: number;
        if (e.key === 'ArrowDown') {
          nextIdx = currentIdx < filtered.length - 1 ? currentIdx + 1 : 0;
        } else {
          nextIdx = currentIdx > 0 ? currentIdx - 1 : filtered.length - 1;
        }
        if (filtered[nextIdx]) onSelect(filtered[nextIdx].key);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onKeyNav?.('right');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onKeyNav?.('left');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onKeyNav?.('escape');
      }
    },
    [filtered, selectedKey, onSelect, onKeyNav],
  );

  useEffect(() => {
    if (focusActive && listRef.current) {
      listRef.current.focus();
    }
  }, [focusActive]);

  return (
    <div className={cn(theme.container, className)}>
      {/* Sticky header */}
      <div className={theme.header}>
        <span className={theme.headerLabel}>
          {title} ({filtered.length})
        </span>

        {items.length >= searchThreshold && (
          <div className="relative mt-1.5">
            <Search className={cn('absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3', theme.searchIcon)} />
            <input
              type="text"
              placeholder="Filter…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={cn('w-full h-7 pl-7 pr-2 rounded-lg border font-sans text-xs focus:outline-none', theme.searchInput)}
            />
          </div>
        )}
      </div>

      {/* Scrollable list */}
      <ScrollArea className="flex-1">
        <div
          ref={listRef}
          tabIndex={focusActive ? 0 : -1}
          onKeyDown={handleKeyDown}
          className="p-1.5 space-y-0.5 outline-none"
        >
          {filtered.length === 0 ? (
            <p className={cn('px-3 py-4 font-sans text-xs text-center', theme.emptyText)}>
              No items
            </p>
          ) : (
            filtered.map((item) => {
              const isActive = item.key === selectedKey;
              return (
                <button
                  key={item.key}
                  onClick={() => onSelect(item.key)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors border-l-2',
                    isActive ? theme.itemActive : theme.itemInactive,
                  )}
                >
                  {item.health && (
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', HEALTH_DOT[item.health])} />
                  )}
                  <span className="flex-1 font-sans text-xs font-medium truncate">
                    {item.label}
                  </span>
                  <span className={cn('shrink-0 font-sans text-[10px] tabular-nums', isActive ? theme.countActive : theme.countInactive)}>
                    {item.count}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
