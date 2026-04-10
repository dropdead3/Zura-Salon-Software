import React from 'react';
import { cn } from '@/lib/utils';
import type { ResultType } from './commandTypes';

export type SearchScope = 'all' | 'navigation' | 'team' | 'action' | 'client' | 'inventory' | 'task' | 'appointment';

interface CommandSearchFiltersProps {
  activeScope: SearchScope;
  onScopeChange: (scope: SearchScope) => void;
}

const SCOPES: { value: SearchScope; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'action', label: 'Actions' },
  { value: 'navigation', label: 'Pages' },
  { value: 'team', label: 'People' },
  { value: 'client', label: 'Clients' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'task', label: 'Tasks' },
  { value: 'appointment', label: 'Appointments' },
];

export function CommandSearchFilters({ activeScope, onScopeChange }: CommandSearchFiltersProps) {
  return (
    <div className="flex items-center gap-1 px-5 py-1.5 border-b border-border/30 overflow-x-auto scrollbar-hide">
      {SCOPES.map((scope, idx) => (
        <button
          key={scope.value}
          type="button"
          onClick={() => onScopeChange(scope.value)}
          className={cn(
            'h-6 px-2.5 rounded-full text-xs font-sans font-medium transition-colors duration-150 shrink-0',
            idx >= 5 && 'hidden sm:inline-flex',
            activeScope === scope.value
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          )}
          tabIndex={-1}
        >
          {scope.label}
        </button>
      ))}
    </div>
  );
}

/** Detect scope from prefix syntax. Returns null if no prefix detected. */
export function detectScopePrefix(query: string): { scope: SearchScope; cleanQuery: string } | null {
  const trimmed = query.trimStart();
  if (trimmed.startsWith('@') && trimmed.length > 1) {
    return { scope: 'team', cleanQuery: trimmed.slice(1) };
  }
  if (trimmed.startsWith('/') && trimmed.length > 1) {
    return { scope: 'navigation', cleanQuery: trimmed.slice(1) };
  }
  return null;
}
