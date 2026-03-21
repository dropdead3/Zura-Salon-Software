import { Calendar, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
} from '@/components/platform/ui/PlatformCard';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { useOrganizationIntegrations } from '@/hooks/useOrganizationIntegrations';
import { usePOSProviderLabel } from '@/hooks/usePOSProviderLabel';

interface AccountIntegrationsCardProps {
  organizationId: string;
}

export function AccountIntegrationsCard({ organizationId }: AccountIntegrationsCardProps) {
  const { data: integrations, isLoading } = useOrganizationIntegrations(organizationId);
  const { providerLabel } = usePOSProviderLabel();

  if (isLoading) {
    return (
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="text-lg">Business Integrations</PlatformCardTitle>
        </PlatformCardHeader>
        <PlatformCardContent>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg bg-slate-700/50" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-24 bg-slate-700/50" />
                    <Skeleton className="h-3 w-32 bg-slate-700/50" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20 rounded-full bg-slate-700/50" />
              </div>
            ))}
          </div>
        </PlatformCardContent>
      </PlatformCard>
    );
  }

  const phorest = integrations?.phorest;
  const payroll = integrations?.payroll;

  const payrollProviderLabel = payroll?.provider 
    ? payroll.provider === 'gusto' ? 'Gusto' : 'QuickBooks'
    : null;

  return (
    <PlatformCard variant="glass">
      <PlatformCardHeader>
        <PlatformCardTitle className="text-lg">Business Integrations</PlatformCardTitle>
      </PlatformCardHeader>
      <PlatformCardContent>
        <div className="divide-y divide-slate-700/50">
          {/* Phorest Integration */}
          <div className="flex items-center justify-between py-3 first:pt-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-700/50">
                <Calendar className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <p className="font-medium text-[hsl(var(--platform-foreground))]">{providerLabel}</p>
                <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                  {phorest?.connected 
                    ? `${phorest.branchCount} ${phorest.branchCount === 1 ? 'branch' : 'branches'}, ${phorest.staffMappingCount} staff`
                    : '--'}
                </p>
              </div>
            </div>
            <PlatformBadge variant={phorest?.connected ? 'success' : 'default'}>
              {phorest?.connected ? 'Connected' : 'Not Connected'}
            </PlatformBadge>
          </div>

          {/* Payroll Integration */}
          <div className="flex items-center justify-between py-3 last:pb-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-700/50">
                <DollarSign className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <p className="font-medium text-[hsl(var(--platform-foreground))]">
                  Payroll{payrollProviderLabel ? ` - ${payrollProviderLabel}` : ''}
                </p>
                <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                  {payroll?.connected ? 'Active connection' : '--'}
                </p>
              </div>
            </div>
            <PlatformBadge variant={payroll?.connected ? 'success' : 'default'}>
              {payroll?.connected ? 'Connected' : 'Not Connected'}
            </PlatformBadge>
          </div>
        </div>
      </PlatformCardContent>
    </PlatformCard>
  );
}
