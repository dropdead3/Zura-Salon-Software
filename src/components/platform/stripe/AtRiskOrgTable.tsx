import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, ChevronRight, Building2 } from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformBadge as Badge } from '@/components/platform/ui/PlatformBadge';
import { cn } from '@/lib/utils';
import type { StripePaymentsHealth } from '@/hooks/useStripePaymentsHealth';

interface AtRiskOrgTableProps {
  organizations: StripePaymentsHealth['atRiskOrganizations'];
  isLoading: boolean;
}

export function AtRiskOrgTable({ organizations, isLoading }: AtRiskOrgTableProps) {
  const navigate = useNavigate();
  const { formatCurrency } = useFormatCurrency();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40">
        <div className="p-4 border-b border-slate-700/50">
          <div className="h-5 w-48 bg-slate-700/50 rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-12 bg-slate-700/30 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 mb-3">
          <Building2 className="h-6 w-6 text-emerald-400" />
        </div>
        <h3 className="text-sm font-medium text-white mb-1">All subscriptions healthy</h3>
        <p className="text-xs text-slate-400">No organizations with billing issues</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-slate-800/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-medium text-white">Organizations with Issues</h3>
        </div>
        <PlatformButton
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard/platform/accounts?status=past_due')}
        >
          View All
        </PlatformButton>
      </div>

      <div className="divide-y divide-slate-700/30">
        {organizations.slice(0, 5).map(org => (
          <div 
            key={org.id}
            className="px-4 py-3 flex items-center justify-between hover:bg-slate-700/20 transition-colors cursor-pointer"
            onClick={() => navigate(`/dashboard/platform/accounts/${org.id}`)}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-amber-500/20 shrink-0">
                <Building2 className="h-4 w-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{org.name}</p>
                <p className="text-xs text-slate-400 truncate">{org.billing_email || 'No billing email'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <Badge className={cn(
                  "text-xs",
                  org.subscription_status === 'past_due' 
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-rose-500/20 text-rose-400"
                )}>
                  {org.subscription_status === 'past_due' ? 'Past due' : 'Cancelled'}
                </Badge>
                {org.lastInvoice && (
                  <p className="text-xs text-slate-500 mt-1">
                    {formatCurrency(org.lastInvoice.amount / 100)} • {formatDistanceToNow(new Date(org.lastInvoice.created_at), { addSuffix: true })}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
