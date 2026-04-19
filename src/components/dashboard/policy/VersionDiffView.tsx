/**
 * VersionDiffView (Wave 28.9)
 *
 * Lightweight line-based diff between two markdown bodies. No external diff
 * library — uses LCS-style alignment for clean added/removed/unchanged
 * classification. Color-coded with semantic tokens at low opacity so the prose
 * stays readable, not glaring.
 */
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

type DiffLineKind = 'added' | 'removed' | 'unchanged';
interface DiffLine {
  kind: DiffLineKind;
  text: string;
}

/**
 * Compute LCS table then walk it backwards to produce a clean diff.
 * O(n*m) memory — fine for policy bodies (typically <500 lines).
 */
function computeDiff(prev: string, next: string): DiffLine[] {
  const a = prev.split('\n');
  const b = next.split('\n');
  const n = a.length;
  const m = b.length;

  // Build LCS length table.
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  // Walk to assemble the diff.
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ kind: 'unchanged', text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: 'removed', text: a[i] });
      i++;
    } else {
      out.push({ kind: 'added', text: b[j] });
      j++;
    }
  }
  while (i < n) {
    out.push({ kind: 'removed', text: a[i] });
    i++;
  }
  while (j < m) {
    out.push({ kind: 'added', text: b[j] });
    j++;
  }
  return out;
}

interface Props {
  previousBody: string | null;
  currentBody: string | null;
}

export function VersionDiffView({ previousBody, currentBody }: Props) {
  const diff = useMemo(
    () => computeDiff(previousBody ?? '', currentBody ?? ''),
    [previousBody, currentBody],
  );

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    diff.forEach((l) => {
      if (l.kind === 'added') added++;
      else if (l.kind === 'removed') removed++;
    });
    return { added, removed };
  }, [diff]);

  if (!currentBody && !previousBody) {
    return (
      <p className="font-sans text-xs text-muted-foreground italic">
        No content for this variant.
      </p>
    );
  }

  if (!previousBody) {
    return (
      <div className="space-y-2">
        <p className="font-sans text-[10px] text-muted-foreground uppercase tracking-wider">
          Initial version — no prior body to compare
        </p>
        <pre className="font-sans text-xs whitespace-pre-wrap rounded-md border border-border/60 bg-muted/20 p-3 text-foreground">
          {currentBody}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 font-sans text-[10px] uppercase tracking-wider">
        <span className="text-muted-foreground">Changes</span>
        <span className="text-emerald-600 dark:text-emerald-400">+{stats.added}</span>
        <span className="text-destructive">−{stats.removed}</span>
      </div>
      <div className="rounded-md border border-border/60 bg-muted/10 overflow-hidden">
        <div className="font-sans text-xs leading-relaxed">
          {diff.map((line, idx) => (
            <div
              key={idx}
              className={cn(
                'flex gap-2 px-3 py-0.5 whitespace-pre-wrap break-words',
                line.kind === 'added' && 'bg-emerald-500/10 text-foreground',
                line.kind === 'removed' && 'bg-destructive/10 text-muted-foreground line-through',
                line.kind === 'unchanged' && 'text-muted-foreground/80',
              )}
            >
              <span
                className={cn(
                  'select-none w-3 flex-shrink-0',
                  line.kind === 'added' && 'text-emerald-600 dark:text-emerald-400',
                  line.kind === 'removed' && 'text-destructive',
                )}
              >
                {line.kind === 'added' ? '+' : line.kind === 'removed' ? '−' : ' '}
              </span>
              <span className="flex-1">{line.text || '\u00A0'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
