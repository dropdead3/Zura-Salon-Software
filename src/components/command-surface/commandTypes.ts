import type React from 'react';

// ─── Result Types ────────────────────────────────────────────
export type ResultType = 'navigation' | 'team' | 'client' | 'help' | 'action' | 'inventory' | 'task' | 'appointment' | 'insight';

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
  action: { label: 'Actions', priority: 1 },
  navigation: { label: 'Pages & Features', priority: 2 },
  team: { label: 'People', priority: 3 },
  client: { label: 'Clients', priority: 4 },
  appointment: { label: 'Appointments', priority: 5 },
  inventory: { label: 'Inventory', priority: 6 },
  task: { label: 'Tasks', priority: 7 },
  help: { label: 'Help & Resources', priority: 8 },
  insight: { label: 'Insights', priority: 9 },
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
