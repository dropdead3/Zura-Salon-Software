import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBillingAlerts, type BillingAlert } from '@/hooks/useBillingAlerts';
import { useOpenBillingPortal } from '@/hooks/useOrgPaymentInfo';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { cn } from '@/lib/utils';

function AlertRow({ alert, onPortal }: { alert: BillingAlert; onPortal: () => void }) {
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
    </div>
  );
}

export function BillingAlertsBanner() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { alerts, isLoading } = useBillingAlerts();
  const openPortal = useOpenBillingPortal();

  if (isLoading || alerts.length === 0) return null;

  const handlePortal = () => {
    if (orgId) openPortal.mutate(orgId);
  };

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <AlertRow key={alert.id} alert={alert} onPortal={handlePortal} />
      ))}
    </div>
  );
}
