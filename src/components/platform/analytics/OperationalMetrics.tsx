import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { usePlatformTheme } from '@/contexts/PlatformThemeContext';
import { PlatformInput as Input } from '@/components/platform/ui/PlatformInput';
import type { PlatformAnalyticsSummary, OrganizationMetrics } from '@/hooks/useOrganizationAnalytics';

interface OperationalMetricsProps {
  analytics: PlatformAnalyticsSummary;
}

type SortKey = 'name' | 'avgRebookingRate' | 'avgRetentionRate' | 'avgRetailAttachment' | 'averageTicket' | 'newClientsThisMonth';
type SortDir = 'asc' | 'desc';

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

export function OperationalMetrics({ analytics }: OperationalMetricsProps) {
  const navigate = useNavigate();
  const { resolvedTheme } = usePlatformTheme();
  const { formatCurrencyWhole } = useFormatCurrency();
  const isDark = resolvedTheme === 'dark';

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('avgRebookingRate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-4 w-4 text-slate-400" />;
    return sortDir === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-violet-500" />
      : <ArrowDown className="h-4 w-4 text-violet-500" />;
  };

  const filteredOrgs = useMemo(() => {
    let orgs = [...analytics.organizationMetrics];
    
    if (search) {
      const s = search.toLowerCase();
      orgs = orgs.filter(o => 
        o.name.toLowerCase().includes(s) || 
        o.accountNumber.toString().includes(s)
      );
    }

    orgs.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return orgs;
  }, [analytics.organizationMetrics, search, sortKey, sortDir]);

  const getOutlierStatus = (value: number, avg: number, isHigherBetter: boolean) => {
    if (value === 0) return 'neutral';
    const diff = ((value - avg) / avg) * 100;
    if (isHigherBetter) {
      if (diff > 20) return 'above';
      if (diff < -20) return 'below';
    } else {
      if (diff < -20) return 'above';
      if (diff > 20) return 'below';
    }
    return 'neutral';
  };

  const getOutlierIcon = (status: string) => {
    if (status === 'above') return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    if (status === 'below') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    return null;
  };

  const columns: { key: SortKey; label: string; format: (v: number) => string; avg: number; higherBetter: boolean }[] = [
    { key: 'avgRebookingRate', label: 'Rebooking', format: formatPercent, avg: analytics.platformAvgRebooking, higherBetter: true },
    { key: 'avgRetentionRate', label: 'Retention', format: formatPercent, avg: analytics.platformAvgRetention, higherBetter: true },
    { key: 'avgRetailAttachment', label: 'Retail Attach', format: formatPercent, avg: analytics.platformAvgRetailAttachment, higherBetter: true },
    { key: 'averageTicket', label: 'Avg Ticket', format: formatCurrencyWhole, avg: analytics.platformAvgTicket, higherBetter: true },
    { key: 'newClientsThisMonth', label: 'New Clients', format: (v) => v.toString(), avg: 0, higherBetter: true },
  ];

  return (
    <div className="space-y-6">
      {/* Platform Averages */}
      <div className={cn(
        'rounded-xl border p-6',
        isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
      )}>
        <h3 className={cn('font-medium mb-4', isDark ? 'text-white' : 'text-slate-900')}>
          Platform-Wide Benchmarks
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-3xl font-medium text-violet-500">{formatPercent(analytics.platformAvgRebooking)}</p>
            <p className={cn('text-sm mt-1', isDark ? 'text-slate-400' : 'text-slate-500')}>Avg Rebooking Rate</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-medium text-emerald-500">{formatPercent(analytics.platformAvgRetention)}</p>
            <p className={cn('text-sm mt-1', isDark ? 'text-slate-400' : 'text-slate-500')}>Avg Retention Rate</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-medium text-blue-500">{formatCurrencyWhole(analytics.platformAvgTicket)}</p>
            <p className={cn('text-sm mt-1', isDark ? 'text-slate-400' : 'text-slate-500')}>Avg Ticket Size</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-medium text-amber-500">{formatPercent(analytics.platformAvgRetailAttachment)}</p>
            <p className={cn('text-sm mt-1', isDark ? 'text-slate-400' : 'text-slate-500')}>Avg Retail Attachment</p>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className={cn(
        'rounded-xl border',
        isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
      )}>
        <div className="p-4 border-b flex items-center justify-between gap-4" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
          <h3 className={cn('font-medium', isDark ? 'text-white' : 'text-slate-900')}>
            Organization Comparison Matrix
          </h3>
          <Input
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              'w-64',
              isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-white border-slate-200'
            )}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={cn(
                'border-b',
                isDark ? 'border-slate-700' : 'border-slate-200'
              )}>
                <th className="text-left p-3">
                  <button
                    onClick={() => handleSort('name')}
                    className={cn(
                      'flex items-center gap-1 font-medium',
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    )}
                  >
                    Organization {getSortIcon('name')}
                  </button>
                </th>
                {columns.map(col => (
                  <th key={col.key} className="text-right p-3">
                    <button
                      onClick={() => handleSort(col.key)}
                      className={cn(
                        'flex items-center gap-1 font-medium ml-auto',
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      )}
                    >
                      {col.label} {getSortIcon(col.key)}
                    </button>
                  </th>
                ))}
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredOrgs.slice(0, 50).map((org) => (
                <tr
                  key={org.id}
                  className={cn(
                    'border-b transition-colors cursor-pointer',
                    isDark 
                      ? 'border-slate-700/50 hover:bg-slate-700/30' 
                      : 'border-slate-100 hover:bg-slate-50'
                  )}
                  onClick={() => navigate(`/dashboard/platform/accounts/${org.slug}`)}
                >
                  <td className="p-3">
                    <div>
                      <p className={cn('font-medium', isDark ? 'text-white' : 'text-slate-900')}>
                        {org.name}
                      </p>
                      <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>
                        #{org.accountNumber} • {org.subscriptionTier || 'No Plan'}
                      </p>
                    </div>
                  </td>
                  {columns.map(col => {
                    const value = org[col.key] as number;
                    const status = getOutlierStatus(value, col.avg, col.higherBetter);
                    return (
                      <td key={col.key} className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={cn(
                            'font-medium',
                            value === 0 && (isDark ? 'text-slate-500' : 'text-slate-400'),
                            value > 0 && (isDark ? 'text-white' : 'text-slate-900'),
                            status === 'above' && 'text-emerald-500',
                            status === 'below' && 'text-amber-500',
                          )}>
                            {value === 0 ? 'N/A' : col.format(value)}
                          </span>
                          {getOutlierIcon(status)}
                        </div>
                      </td>
                    );
                  })}
                  <td className="p-3">
                    <ExternalLink className={cn(
                      'h-4 w-4',
                      isDark ? 'text-slate-500' : 'text-slate-400'
                    )} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrgs.length > 50 && (
          <div className={cn(
            'p-3 text-center text-sm',
            isDark ? 'text-slate-400' : 'text-slate-500'
          )}>
            Showing 50 of {filteredOrgs.length} organizations
          </div>
        )}
      </div>
    </div>
  );
}
