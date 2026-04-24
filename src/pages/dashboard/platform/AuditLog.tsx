import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, subHours } from 'date-fns';
import { 
  FileText, 
  Download, 
  Filter, 
  Search, 
  ChevronRight,
  Calendar,
  Building2,
  RefreshCw
} from 'lucide-react';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformInput as Input } from '@/components/platform/ui/PlatformInput';
import {
  Select,
  PlatformSelectContent as SelectContent,
  PlatformSelectItem as SelectItem,
  PlatformSelectTrigger as SelectTrigger,
  SelectValue,
} from '@/components/platform/ui/PlatformSelect';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlatformBadge as Badge } from '@/components/platform/ui/PlatformBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { 
  usePlatformAuditLogExplorer, 
  useAuditLogActions,
  exportAuditLogs,
  type AuditLogFilters 
} from '@/hooks/usePlatformAuditLogExplorer';
import { getAuditActionConfig, type AuditLogEntry } from '@/hooks/usePlatformAuditLog';
import { useOrganizations } from '@/hooks/useOrganizations';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { PageExplainer } from '@/components/ui/PageExplainer';

const DATE_PRESETS = [
  { label: 'Last 24 hours', value: '24h', getRange: () => ({ from: subHours(new Date(), 24), to: new Date() }) },
  { label: 'Last 7 days', value: '7d', getRange: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: 'Last 30 days', value: '30d', getRange: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: 'Last 90 days', value: '90d', getRange: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
];

export default function AuditLogPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    pageSize: 50,
  });
  const [datePreset, setDatePreset] = useState('7d');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const { data, isLoading, refetch, isFetching } = usePlatformAuditLogExplorer({
    ...filters,
    searchQuery,
    ...DATE_PRESETS.find(p => p.value === datePreset)?.getRange() || {},
  });
  const { data: actions } = useAuditLogActions();
  const { data: organizations } = useOrganizations();

  const handleExport = (format: 'csv' | 'json') => {
    if (data?.logs) {
      exportAuditLogs(data.logs, format);
    }
  };

  const handleFilterChange = (key: keyof AuditLogFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  return (
    <PlatformPageContainer>
      <PlatformPageHeader
        title="Audit Logs"
        description="Comprehensive audit trail of all platform activities and changes"
        actions={
          <div className="flex gap-2">
            <PlatformButton variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("w-4 h-4 mr-2", isFetching && "animate-spin")} />
        <PageExplainer pageId="platform-audit-log" />
              Refresh
            </PlatformButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <PlatformButton variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </PlatformButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')}>
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <div className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-card rounded-lg border border-border/60">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          
          <Select value={filters.actions?.[0] || 'all'} onValueChange={(v) => handleFilterChange('actions', v === 'all' ? undefined : [v])}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {actions?.map(action => (
                <SelectItem key={action} value={action}>
                  {getAuditActionConfig(action).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.organizationId} onValueChange={(v) => handleFilterChange('organizationId', v === 'all' ? undefined : v)}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="All Organizations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {organizations?.map(org => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={datePreset} onValueChange={setDatePreset}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map(preset => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border/60 overflow-hidden bg-card">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground font-medium">
              <tr>
                <th className="px-4 py-3 w-32">Action</th>
                <th className="px-4 py-3 w-48">User</th>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3 w-48">Timestamp</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-4">
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : data?.logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No audit logs found matching your filters</p>
                  </td>
                </tr>
              ) : (
                data?.logs.map(log => {
                  const config = getAuditActionConfig(log.action);
                  const colorClasses = {
                    emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                    amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
                    rose: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
                    blue: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
                    slate: 'bg-muted text-muted-foreground',
                  };

                  return (
                    <tr 
                      key={log.id} 
                      className="border-b border-border/40 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-4 py-3">
                        <Badge className={colorClasses[config.color]}>
                          {config.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={log.user_photo || undefined} />
                            <AvatarFallback className="text-xs bg-muted">
                              {log.user_name?.[0] || 'S'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-foreground">
                            {log.user_name || 'System'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {log.organization_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM d, h:mm a')}
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="border-t border-border/60 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Showing {((filters.page || 1) - 1) * (filters.pageSize || 50) + 1}-
              {Math.min((filters.page || 1) * (filters.pageSize || 50), data.totalCount)} of {data.totalCount} entries
            </span>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(Math.max(1, (filters.page || 1) - 1))}
                    className={cn(
                      (filters.page || 1) <= 1 && "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
                {[...Array(Math.min(5, data.totalPages))].map((_, i) => {
                  const page = i + 1;
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={page === (filters.page || 1)}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handlePageChange(Math.min(data.totalPages, (filters.page || 1) + 1))}
                    className={cn(
                      (filters.page || 1) >= data.totalPages && "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <PremiumFloatingPanel open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)} maxWidth="500px">
        <div className="p-5 pb-3 border-b border-border/40">
          <h2 className="font-display text-sm tracking-wide uppercase">Activity Log Details</h2>
        </div>
        {selectedLog && (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            <div>
              <label className={tokens.heading.subsection}>Action</label>
              <p className="mt-1 text-foreground">{getAuditActionConfig(selectedLog.action).label}</p>
            </div>
            <div>
              <label className={tokens.heading.subsection}>User</label>
              <p className="mt-1 text-foreground">{selectedLog.user_name || 'System'}</p>
            </div>
            <div>
              <label className={tokens.heading.subsection}>Organization</label>
              <p className="mt-1 text-foreground">{selectedLog.organization_name || '-'}</p>
            </div>
            <div>
              <label className={tokens.heading.subsection}>Timestamp</label>
              <p className="mt-1 text-foreground">{format(new Date(selectedLog.created_at), 'PPpp')}</p>
            </div>
            {selectedLog.entity_type && (
              <div>
                <label className={tokens.heading.subsection}>Entity</label>
                <p className="mt-1 text-foreground">{selectedLog.entity_type} ({selectedLog.entity_id})</p>
              </div>
            )}
            <div>
              <label className={tokens.heading.subsection}>Details</label>
              <pre className="mt-1 p-3 bg-muted/50 rounded-lg text-sm text-foreground overflow-auto max-h-[300px]">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </PremiumFloatingPanel>
    </PlatformPageContainer>
  );
}
