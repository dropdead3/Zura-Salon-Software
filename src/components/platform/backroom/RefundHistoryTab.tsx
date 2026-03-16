import { useState } from 'react';
import { usePlatformRefundHistory, type RefundFilters } from '@/hooks/platform/usePlatformRefundHistory';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatDate } from '@/hooks/useFormatDate';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectValue, PlatformSelectContent as SelectContent, PlatformSelectItem as SelectItem, PlatformSelectTrigger as SelectTrigger } from '@/components/platform/ui/PlatformSelect';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ReceiptText,
  DollarSign,
  Clock,
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  approved: 'success',
  processed: 'success',
  completed: 'success',
  pending: 'warning',
  rejected: 'error',
  denied: 'error',
};

export function RefundHistoryTab() {
  const { formatCurrency } = useFormatCurrency();
  const { formatDateFull } = useFormatDate();

  const [filters, setFilters] = useState<RefundFilters>({});
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { records, totalCount, summary, isLoading, totalPages } = usePlatformRefundHistory(filters, page, pageSize);

  const updateFilter = <K extends keyof RefundFilters>(key: K, value: RefundFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<ReceiptText className="w-5 h-5 text-violet-400" />}
          label="Total Refunds"
          value={isLoading ? null : summary.totalCount.toLocaleString()}
        />
        <KpiCard
          icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
          label="Total Amount"
          value={isLoading ? null : formatCurrency(summary.totalAmount)}
        />
        <KpiCard
          icon={<Clock className="w-5 h-5 text-amber-400" />}
          label="Pending"
          value={isLoading ? null : summary.pendingCount.toLocaleString()}
        />
        <KpiCard
          icon={<TrendingUp className="w-5 h-5 text-sky-400" />}
          label="Avg Refund"
          value={isLoading ? null : formatCurrency(summary.avgAmount)}
        />
      </div>

      {/* Filters + Table */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <div className="flex items-center justify-between">
            <div>
              <PlatformCardTitle className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-violet-400" />
                Refund Records
              </PlatformCardTitle>
              <PlatformCardDescription>
                Cross-organization refund audit trail • {totalCount} records
              </PlatformCardDescription>
            </div>
            {hasActiveFilters && (
              <PlatformButton variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                Clear filters
              </PlatformButton>
            )}
          </div>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-4">
          {/* Filter Bar */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <PlatformInput
              type="date"
              placeholder="From date"
              value={filters.dateFrom ?? ''}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
            />
            <PlatformInput
              type="date"
              placeholder="To date"
              value={filters.dateTo ?? ''}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
            />
            <PlatformInput
              type="number"
              placeholder="Min amount"
              value={filters.minAmount ?? ''}
              onChange={(e) => updateFilter('minAmount', e.target.value ? Number(e.target.value) : undefined)}
            />
            <PlatformInput
              type="number"
              placeholder="Max amount"
              value={filters.maxAmount ?? ''}
              onChange={(e) => updateFilter('maxAmount', e.target.value ? Number(e.target.value) : undefined)}
            />
            <PlatformInput
              placeholder="Search org…"
              icon={<Search className="w-3.5 h-3.5" />}
              value={filters.orgSearch ?? ''}
              onChange={(e) => updateFilter('orgSearch', e.target.value)}
            />
            <Select
              value={filters.status ?? 'all'}
              onValueChange={(v) => updateFilter('status', v === 'all' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg bg-slate-800/50" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ReceiptText className="w-10 h-10 text-slate-600 mb-3" />
              <h3 className="text-sm font-medium text-slate-300">No refund records found</h3>
              <p className="text-xs text-slate-500 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-slate-700/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700/50 hover:bg-transparent">
                      <TableHead className="text-slate-400 text-xs">Organization</TableHead>
                      <TableHead className="text-slate-400 text-xs">Item</TableHead>
                      <TableHead className="text-slate-400 text-xs">Amount</TableHead>
                      <TableHead className="text-slate-400 text-xs">Type</TableHead>
                      <TableHead className="text-slate-400 text-xs">Status</TableHead>
                      <TableHead className="text-slate-400 text-xs">Reason</TableHead>
                      <TableHead className="text-slate-400 text-xs">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => (
                      <TableRow key={r.id} className="border-slate-700/30 hover:bg-slate-800/30">
                        <TableCell className="text-sm text-slate-200 font-medium">{r.org_name}</TableCell>
                        <TableCell className="text-sm text-slate-300">{r.original_item_name ?? '—'}</TableCell>
                        <TableCell className="text-sm text-slate-200 font-medium tabular-nums">
                          {formatCurrency(r.refund_amount)}
                        </TableCell>
                        <TableCell>
                          <PlatformBadge variant="default" className="capitalize text-xs">
                            {r.refund_type.replace(/_/g, ' ')}
                          </PlatformBadge>
                        </TableCell>
                        <TableCell>
                          <PlatformBadge variant={STATUS_VARIANTS[r.status] ?? 'default'} className="capitalize text-xs">
                            {r.status}
                          </PlatformBadge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-400 max-w-[200px] truncate">
                          {r.reason ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm text-slate-400 whitespace-nowrap">
                          {r.created_at ? formatDateFull(r.created_at) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-slate-500">
                    Page {page} of {totalPages} • {totalCount} records
                  </p>
                  <div className="flex items-center gap-1">
                    <PlatformButton
                      variant="ghost"
                      size="icon-sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </PlatformButton>
                    <PlatformButton
                      variant="ghost"
                      size="icon-sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </PlatformButton>
                  </div>
                </div>
              )}
            </>
          )}
        </PlatformCardContent>
      </PlatformCard>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  return (
    <PlatformCard variant="glass">
      <PlatformCardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-800/80">{icon}</div>
          <div>
            <p className="text-xs text-slate-400 font-medium tracking-wide uppercase font-display">{label}</p>
            {value === null ? (
              <Skeleton className="h-6 w-20 mt-1 bg-slate-800/50" />
            ) : (
              <p className="text-lg font-medium text-slate-100 tabular-nums">{value}</p>
            )}
          </div>
        </div>
      </PlatformCardContent>
    </PlatformCard>
  );
}
