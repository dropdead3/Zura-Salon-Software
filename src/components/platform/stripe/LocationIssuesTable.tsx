import { useNavigate } from 'react-router-dom';
import { tokens } from '@/lib/design-tokens';
import { AlertTriangle, ChevronRight, MapPin, CheckCircle } from 'lucide-react';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformBadge as Badge } from '@/components/platform/ui/PlatformBadge';
import { cn } from '@/lib/utils';
import type { StripePaymentsHealth } from '@/hooks/useStripePaymentsHealth';

interface LocationIssuesTableProps {
  locations: StripePaymentsHealth['locationsWithIssues'];
  isLoading: boolean;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  issues: { label: 'Issues', className: 'bg-amber-500/20 text-amber-400' },
  suspended: { label: 'Suspended', className: 'bg-rose-500/20 text-rose-400' },
  pending: { label: 'Pending', className: 'bg-blue-500/20 text-blue-400' },
  not_connected: { label: 'Not connected', className: 'bg-slate-500/20 text-slate-400' },
};

export function LocationIssuesTable({ locations, isLoading }: LocationIssuesTableProps) {
  const navigate = useNavigate();

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

  // Filter to only show problematic statuses (issues, suspended)
  const problemLocations = locations.filter(l => 
    l.stripe_status === 'issues' || l.stripe_status === 'suspended'
  );

  if (problemLocations.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 mb-3">
          <CheckCircle className="h-6 w-6 text-emerald-400" />
        </div>
        <h3 className="text-sm font-medium text-white mb-1">All locations healthy</h3>
        <p className="text-xs text-slate-400">No locations with Connect issues</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-slate-800/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-medium text-white">Locations with Payment Issues</h3>
        </div>
        <PlatformButton
          variant="ghost"
          size={tokens.button.inline}
          onClick={() => navigate('/dashboard/platform/accounts')}
        >
          View All
        </PlatformButton>
      </div>

      <div className="divide-y divide-slate-700/30">
        {problemLocations.slice(0, 5).map(loc => {
          const statusConfig = STATUS_LABELS[loc.stripe_status] || STATUS_LABELS.not_connected;
          
          return (
            <div 
              key={loc.id}
              className="px-4 py-3 flex items-center justify-between hover:bg-slate-700/20 transition-colors cursor-pointer"
              onClick={() => navigate(`/dashboard/platform/accounts/${loc.organization_id}`)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-amber-500/20 shrink-0">
                  <MapPin className="h-4 w-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{loc.name}</p>
                  <p className="text-xs text-slate-400 truncate">{loc.organization_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <Badge className={cn("text-xs", statusConfig.className)}>
                  {statusConfig.label}
                </Badge>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
