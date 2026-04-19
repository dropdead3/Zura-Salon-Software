import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, ArrowRight } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import {
  useServiceAuditLog,
  getServiceAuditEventConfig,
  type ServiceAuditEntry,
} from '@/hooks/useServiceAuditLog';

// Badge import retained for future re-introduction of source differentiation
// once the audit trigger learns the call site (single edit vs bulk_edit vs api).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _BadgeReserved = Badge;

/**
 * Wave 5: Renders the chronological audit history for a single service.
 * Shown in the editor's "History" tab so operators can see who changed what
 * and when — the {{PLATFORM_NAME}} compliance lever for catalog mutations.
 */
interface ServiceAuditLogPanelProps {
  serviceId: string;
}

export function ServiceAuditLogPanel({ serviceId }: ServiceAuditLogPanelProps) {
  const { data: entries, isLoading } = useServiceAuditLog(serviceId, 100);
  const { formatCurrency } = useFormatCurrency();

  const renderValue = (
    eventType: string,
    fieldName: string | null,
    value: unknown,
  ): string => {
    if (value === null || value === undefined) return '—';
    if (fieldName === 'price' || fieldName === 'cost') {
      const n = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(n) ? formatCurrency(n) : String(value);
    }
    if (fieldName === 'duration_minutes') {
      return `${value} min`;
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (obj.form_template_name) return String(obj.form_template_name);
      return JSON.stringify(obj);
    }
    return String(value);
  };

  const renderEntry = (e: ServiceAuditEntry) => {
    const cfg = getServiceAuditEventConfig(e.event_type);
    const toneClass =
      cfg.tone === 'positive'
        ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
        : cfg.tone === 'warning'
        ? 'border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400'
        : cfg.tone === 'destructive'
        ? 'border-destructive/40 bg-destructive/5 text-destructive'
        : 'border-border bg-muted/40 text-muted-foreground';

    // Polish: skip noisy "Yes → No" deltas for boolean state events — the
    // event chip ("Activated", "Archived", "Restored") already conveys the
    // transition, so the duplicate value diff just clutters the row.
    const isBooleanStateEvent =
      e.field_name === 'is_active' || e.field_name === 'is_archived';

    const showDelta =
      e.previous_value !== null &&
      e.new_value !== null &&
      typeof e.previous_value !== 'object' &&
      !isBooleanStateEvent;

    const formMeta = e.metadata as { form_template_name?: string } | null;

    return (
      <div
        key={e.id}
        className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
      >
        <div className={`flex-shrink-0 rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wide ${toneClass}`}>
          {cfg.label}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            {showDelta ? (
              <>
                <span className="text-muted-foreground line-through">
                  {renderValue(e.event_type, e.field_name, e.previous_value)}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-foreground font-medium">
                  {renderValue(e.event_type, e.field_name, e.new_value)}
                </span>
              </>
            ) : formMeta?.form_template_name ? (
              <span className="text-foreground">{formMeta.form_template_name}</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{e.actor_name ?? 'System'}</span>
            <span>·</span>
            <span title={new Date(e.created_at).toLocaleString()}>
              {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
            </span>
            {/* Source badge intentionally suppressed: the trigger emits the
                same `'editor'` label for both single-edit and bulk-edit paths,
                so differentiating in the UI would mislead. Restore once the
                trigger learns the call site (e.g. via `app.audit_source`). */}
          </div>
        </div>
      </div>
    );
  };

  const grouped = useMemo(() => {
    if (!entries) return [];
    return entries;
  }, [entries]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className={tokens.empty.container}>
        <History className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>No history yet</h3>
        <p className={tokens.empty.description}>
          Future changes to price, duration, category, archive state, and form linkage will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className={tokens.body.emphasis}>Change history</p>
        <p className={tokens.body.muted}>
          Auto-recorded for compliance. Captures every material edit to this service and its required forms.
        </p>
      </div>
      <ScrollArea className="max-h-[440px] pr-3">
        <div className="space-y-2">
          {grouped.map(renderEntry)}
        </div>
      </ScrollArea>
    </div>
  );
}
