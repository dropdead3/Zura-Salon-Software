import { useState } from 'react';
import { History, ChevronDown, Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDashboardLayoutAudit } from '@/hooks/useDashboardLayoutAudit';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface DashboardLayoutAuditPanelProps {
  /** Optional: scope the log to a single role (e.g. when previewing one). */
  role?: AppRole | null;
}

const actionMeta: Record<'insert' | 'update' | 'delete', { icon: typeof Plus; label: string; tone: string }> = {
  insert: { icon: Plus, label: 'Created', tone: 'text-emerald-500' },
  update: { icon: Pencil, label: 'Updated', tone: 'text-blue-500' },
  delete: { icon: Trash2, label: 'Reset to template', tone: 'text-orange-500' },
};

/**
 * Owner-only collapsible panel showing recent dashboard role layout changes.
 * Renders nothing if the user is not a primary owner (the underlying hook
 * gates the query so non-owners get an empty result).
 */
export function DashboardLayoutAuditPanel({ role }: DashboardLayoutAuditPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: entries = [], isLoading } = useDashboardLayoutAudit(role ?? undefined, 25);

  // Hide panel entirely when there's no history and we're idle.
  if (!isLoading && entries.length === 0) return null;

  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 overflow-hidden">
      <Button
        variant="ghost"
        onClick={() => setIsOpen(o => !o)}
        className="w-full h-auto py-2.5 px-3 justify-between text-left hover:bg-muted/40"
      >
        <span className="flex items-center gap-2 text-xs font-display tracking-wider uppercase text-muted-foreground">
          <History className="w-3.5 h-3.5" />
          Layout history {role ? `· ${role.replace(/_/g, ' ')}` : ''}
          {entries.length > 0 && (
            <span className="text-muted-foreground/60 normal-case tracking-normal">
              ({entries.length})
            </span>
          )}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
      </Button>

      {isOpen && (
        <div className="px-3 pb-3 pt-1 space-y-2 max-h-64 overflow-y-auto">
          {isLoading && (
            <p className="text-[11px] text-muted-foreground py-2 text-center">Loading…</p>
          )}
          {entries.map(entry => {
            const meta = actionMeta[entry.action];
            const Icon = meta.icon;
            return (
              <div
                key={entry.id}
                className="flex items-start gap-2 text-[11px] py-1.5 border-b border-border/20 last:border-b-0"
              >
                <Icon className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', meta.tone)} />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground">
                    <span className="font-medium">{meta.label}</span>
                    {' '}
                    <span className="capitalize">{entry.role.replace(/_/g, ' ')}</span>
                    {' layout'}
                  </p>
                  <p className="text-muted-foreground/70 mt-0.5">
                    {entry.changed_by_name || 'System'} · {format(new Date(entry.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
