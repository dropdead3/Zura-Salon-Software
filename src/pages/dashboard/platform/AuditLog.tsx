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
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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

const DATE_PRESETS = [
  { label: 'Last 24 hours', value: '24h', getRange: () => ({ from: subHours(new Date(), 24), to: new Date() }) },
  { label: 'Last 7 days', value: '7d', getRange: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: 'Last 30 days', value: '30d', getRange: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: 'Last 90 days', value: '90d', getRange: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
  { label: 'All time', value: 'all', getRange: () => ({ from: undefined, to: undefined }) },
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

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="Activity Log"
        description="View and search platform activity history"
        backTo="/dashboard/platform/overview"
        backLabel="Back to Overview"
        actions={
          <div className="flex items-center gap-2">
            <PlatformButton 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", isFetching && "animate-spin")} />
              Refresh
            </PlatformButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <PlatformButton variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </PlatformButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
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

      {/* Filters Bar */}
      <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={datePreset} onValueChange={setDatePreset}>
              <SelectTrigger className={cn("w-auto", tokens.input.filter)}>
                <SelectValue />
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

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select 
              value={filters.actions?.[0] || 'all'} 
              onValueChange={(v) => setFilters(prev => ({ 
                ...prev, 
                actions: v === 'all' ? undefined : [v],
                page: 1
              }))}
            >
              <SelectTrigger className={cn("w-auto", tokens.input.filter)}>
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actions?.map(action => (
                  <SelectItem key={action} value={action}>
                    {getAuditActionConfig(action).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select 
              value={filters.organizationId || 'all'} 
              onValueChange={(v) => setFilters(prev => ({ 
                ...prev, 
                organizationId: v === 'all' ? undefined : v,
                page: 1
              }))}
            >
              <SelectTrigger className={cn("w-auto", tokens.input.filter)}>
                <SelectValue placeholder="All organizations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All organizations</SelectItem>
                {organizations?.map(org => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn("pl-9", tokens.input.search)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60">
                <th className={cn("text-left px-4 py-3", tokens.table.columnHeader)}>Action</th>
                <th className={cn("text-left px-4 py-3", tokens.table.columnHeader)}>User</th>
                <th className={cn("text-left px-4 py-3", tokens.table.columnHeader)}>Organization</th>
                <th className={cn("text-left px-4 py-3", tokens.table.columnHeader)}>Time</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="px-4 py-3"><Skeleton className="h-6 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-28" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-28" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-20" /></td>
                    <td></td>
                  </tr>
                ))
              ) : data?.logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    No audit logs found matching your filters.
                  </td>
                </tr>
              ) : (
                data?.logs.map(log => {
                  const config = getAuditActionConfig(log.action);
                  const colorClasses = {
                    violet: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
                    emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                    amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
                    rose: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
                    blue: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
                    slate: 'bg-muted text-muted-foreground',
                  };

                  return (
                    <tr 
                      key={log.id} 
                      className="border-b border-border/30 hover:bg-muted/50 cursor-pointer transition-colors"
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
      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent className="bg-card border-border w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle className="text-foreground">Activity Log Details</SheetTitle>
          </SheetHeader>
          {selectedLog && (
            <div className="mt-6 space-y-6">
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
        </SheetContent>
      </Sheet>
    </PlatformPageContainer>
  );
}
