import type React from 'react';

// ─── Result Types ────────────────────────────────────────────
export type ResultType = 'navigation' | 'team' | 'client' | 'help' | 'action';

export interface CommandResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle?: string;
  path?: string;
  icon: React.ReactNode;
  metadata?: string;
  /** Relevance score for ranking (higher = better) */
  score: number;
}

export interface ResultGroup {
  id: string;
  label: string;
  results: CommandResult[];
}

// ─── Question Detection ──────────────────────────────────────
const QUESTION_PREFIXES = [
  'how', 'what', 'why', 'where', 'when', 'who', 'which',
  'can i', 'can you', 'do i', 'does', 'is there', 'are there',
  'tell me', 'explain', 'help me', 'show me',
];

export function isQuestionQuery(query: string): boolean {
  const lower = query.trim().toLowerCase();
  return QUESTION_PREFIXES.some(p => lower.startsWith(p)) || lower.endsWith('?');
}

// ─── Group Config ────────────────────────────────────────────
export const GROUP_ORDER: Record<ResultType, { label: string; priority: number }> = {
  navigation: { label: 'Pages & Features', priority: 1 },
  team: { label: 'Team', priority: 2 },
  client: { label: 'Clients', priority: 3 },
  help: { label: 'Help & Resources', priority: 4 },
  action: { label: 'Suggested Actions', priority: 5 },
};

export function groupResults(results: CommandResult[]): ResultGroup[] {
  // Top 2 results go into "Best Match" regardless of type
  const sorted = [...results].sort((a, b) => b.score - a.score);
  const bestMatch = sorted.slice(0, 2);
  const rest = sorted.slice(2);

  const groups: ResultGroup[] = [];

  if (bestMatch.length > 0) {
    groups.push({ id: 'best', label: 'Best Match', results: bestMatch });
  }

  // Group remaining by type
  const byType = new Map<ResultType, CommandResult[]>();
  rest.forEach(r => {
    const arr = byType.get(r.type) || [];
    arr.push(r);
    byType.set(r.type, arr);
  });

  const typeEntries = Array.from(byType.entries()).sort(
    (a, b) => (GROUP_ORDER[a[0]]?.priority ?? 99) - (GROUP_ORDER[b[0]]?.priority ?? 99)
  );

  typeEntries.forEach(([type, items]) => {
    groups.push({
      id: type,
      label: GROUP_ORDER[type]?.label ?? type,
      results: items,
    });
  });

  return groups;
}
