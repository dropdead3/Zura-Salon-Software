import { useState, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBillingAlerts, type BillingAlert } from '@/hooks/useBillingAlerts';
import { useOpenBillingPortal } from '@/hooks/useOrgPaymentInfo';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'zura_dismissed_billing_alerts';

function readDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function persistDismissed(ids: Set<string>) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

function AlertRow({
  alert,
  onPortal,
  onDismiss,
}: {
  alert: BillingAlert;
  onPortal: () => void;
  onDismiss?: (id: string) => void;
}) {
  const isRed = alert.severity === 'red';

  const handleCta = () => {
    if (alert.ctaAction === 'open-portal') {
      onPortal();
    } else {
      const el = document.getElementById('plan-comparison');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3',
        isRed
          ? 'border-destructive/40 bg-destructive/5 text-destructive'
          : 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400',
      )}
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-sans text-sm font-medium">{alert.title}</p>
        <p className="font-sans text-xs text-muted-foreground mt-0.5">{alert.description}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className={cn(
          'shrink-0 font-sans',
          isRed
            ? 'border-destructive/50 text-destructive hover:bg-destructive/10'
            : 'border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10',
        )}
        onClick={handleCta}
      >
        {alert.ctaLabel}
      </Button>
      {alert.dismissible && onDismiss && (
        <button
          onClick={() => onDismiss(alert.id)}
          className={cn(
            'shrink-0 p-1 rounded-md transition-colors',
            isRed
              ? 'hover:bg-destructive/10 text-destructive'
              : 'hover:bg-amber-500/10 text-amber-700 dark:text-amber-400',
          )}
          aria-label={`Dismiss ${alert.title}`}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function BillingAlertsBanner() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { alerts, isLoading } = useBillingAlerts();
  const openPortal = useOpenBillingPortal();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(readDismissed);

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      persistDismissed(next);
      return next;
    });
  }, []);

  const visibleAlerts = alerts.filter(
    (a) => !a.dismissible || !dismissedIds.has(a.id),
  );

  if (isLoading || visibleAlerts.length === 0) return null;

  const handlePortal = () => {
    if (orgId) openPortal.mutate(orgId);
  };

  return (
    <div className="space-y-2">
      {visibleAlerts.map((alert) => (
        <AlertRow
          key={alert.id}
          alert={alert}
          onPortal={handlePortal}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  );
}
