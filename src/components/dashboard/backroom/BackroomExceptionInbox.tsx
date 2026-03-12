/**
 * BackroomExceptionInbox — Manager-facing inbox for operational anomalies.
 * Surfaces problems automatically instead of burying them in reports.
 * Filterable, resolvable, with clear visual hierarchy by severity.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useBackroomExceptions,
  useResolveException,
  type BackroomException,
  type ExceptionFilters,
} from '@/hooks/backroom/useBackroomExceptions';
import { ExceptionResolveDialog } from './ExceptionResolveDialog';
import { tokens } from '@/lib/design-tokens';
import {
  AlertTriangle,
  Ghost,
  Scale,
  TrendingUp,
  Package,
  FileQuestion,
  DollarSign,
  Timer,
  CheckCircle,
  Eye,
  XCircle,
  Inbox,
} from 'lucide-react';

const EXCEPTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  high_waste: AlertTriangle,
  ghost_loss: Ghost,
  missing_reweigh: Scale,
  variance_outlier: TrendingUp,
  no_baseline: FileQuestion,
  cost_spike: DollarSign,
  unresolved_session: Timer,
  stockout_risk: Package,
};

const SEVERITY_STYLES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  info: { label: 'Info', variant: 'secondary' },
  warning: { label: 'Warning', variant: 'default' },
  critical: { label: 'Critical', variant: 'destructive' },
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'high_waste', label: 'High Waste' },
  { value: 'ghost_loss', label: 'Ghost Loss' },
  { value: 'missing_reweigh', label: 'Missing Reweigh' },
  { value: 'variance_outlier', label: 'Variance Outlier' },
  { value: 'no_baseline', label: 'No Baseline' },
  { value: 'cost_spike', label: 'Cost Spike' },
  { value: 'unresolved_session', label: 'Unresolved Session' },
];

export function BackroomExceptionInbox() {
  const [statusFilter, setStatusFilter] = useState('open');
  const [typeFilter, setTypeFilter] = useState('all');
  const [resolveTarget, setResolveTarget] = useState<BackroomException | null>(null);

  const filters: ExceptionFilters = {};
  if (statusFilter !== 'all') filters.status = statusFilter;
  if (typeFilter !== 'all') filters.exceptionType = typeFilter;

  const { data: exceptions = [], isLoading } = useBackroomExceptions(filters);
  const resolveException = useResolveException();

  const handleAcknowledge = (exception: BackroomException) => {
    resolveException.mutate({
      exceptionId: exception.id,
      action: 'acknowledged',
    });
  };

  const handleDismiss = (exception: BackroomException) => {
    resolveException.mutate({
      exceptionId: exception.id,
      action: 'dismissed',
    });
  };

  return (
    <>
      <Card className="bg-card/80 backdrop-blur-xl border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={tokens.card.iconBox}>
                <Inbox className={tokens.card.icon} />
              </div>
              <div>
                <CardTitle className={tokens.card.title}>Exception Inbox</CardTitle>
                <CardDescription className="font-sans text-xs text-muted-foreground">
                  Operational anomalies requiring review
                </CardDescription>
              </div>
            </div>
            {exceptions.length > 0 && (
              <Badge variant="destructive" className="text-[10px] tabular-nums">
                {exceptions.length}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Filters */}
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 flex-1 font-sans text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="font-sans text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 flex-1 font-sans text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="font-sans text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Exception list */}
          <AnimatePresence mode="popLayout">
            {exceptions.map((exception) => {
              const IconComp = EXCEPTION_ICONS[exception.exception_type] ?? AlertTriangle;
              const severity = SEVERITY_STYLES[exception.severity] ?? SEVERITY_STYLES.warning;
              const isActionable = exception.status === 'open' || exception.status === 'acknowledged';

              return (
                <motion.div
                  key={exception.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2"
                >
                  {/* Header row */}
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 shrink-0">
                      <IconComp className={`w-4 h-4 ${
                        exception.severity === 'critical'
                          ? 'text-destructive'
                          : exception.severity === 'warning'
                            ? 'text-warning'
                            : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-sans text-sm font-medium truncate">
                          {exception.title}
                        </p>
                        <Badge variant={severity.variant} className="text-[10px] shrink-0">
                          {severity.label}
                        </Badge>
                      </div>
                      {exception.description && (
                        <p className="font-sans text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {exception.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Metric comparison */}
                  {exception.metric_value != null && exception.threshold_value != null && (
                    <div className="flex items-center gap-3 font-sans text-xs text-muted-foreground pl-6">
                      <span>Actual: <span className="text-foreground tabular-nums">{exception.metric_value.toFixed(1)}</span></span>
                      <span>Threshold: <span className="tabular-nums">{exception.threshold_value.toFixed(1)}</span></span>
                    </div>
                  )}

                  {/* Resolved info */}
                  {exception.resolved_notes && (
                    <p className="font-sans text-xs text-muted-foreground italic pl-6">
                      {exception.resolved_notes}
                    </p>
                  )}

                  {/* Actions */}
                  {isActionable && (
                    <div className="flex gap-1.5 pl-6">
                      {exception.status === 'open' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-sans"
                          onClick={() => handleAcknowledge(exception)}
                          disabled={resolveException.isPending}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Acknowledge
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-sans"
                        onClick={() => setResolveTarget(exception)}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Resolve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs font-sans text-muted-foreground"
                        onClick={() => handleDismiss(exception)}
                        disabled={resolveException.isPending}
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Empty state */}
          {!isLoading && exceptions.length === 0 && (
            <div className={tokens.empty.container}>
              <CheckCircle className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No open exceptions</h3>
              <p className={tokens.empty.description}>
                All backroom operations are running smoothly
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve dialog */}
      <ExceptionResolveDialog
        exception={resolveTarget}
        onClose={() => setResolveTarget(null)}
      />
    </>
  );
}
