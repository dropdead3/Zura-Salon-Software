import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Skeleton } from '@/components/ui/skeleton';
import { PlatformBadge as Badge } from '@/components/platform/ui/PlatformBadge';
import {
  Select,
  SelectValue,
  PlatformSelectContent as SelectContent,
  PlatformSelectItem as SelectItem,
  PlatformSelectTrigger as SelectTrigger,
} from '@/components/platform/ui/PlatformSelect';
import { 
  Upload, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RotateCcw,
  AlertTriangle,
  FileText,
  Users,
  Scissors,
  Package,
  Calendar,
  MapPin,
} from 'lucide-react';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
} from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { useImportJobs, useRollbackImport, type ImportJob } from '@/hooks/useImportJobs';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface AccountImportHistoryTabProps {
  organizationId: string;
}

const entityTypeIcons: Record<string, React.ElementType> = {
  clients: Users,
  services: Scissors,
  staff: Users,
  products: Package,
  appointments: Calendar,
  locations: MapPin,
};

const statusConfig: Record<string, { icon: React.ElementType; color: string; badge: 'success' | 'warning' | 'error' | 'default' }> = {
  completed: { icon: CheckCircle2, color: 'text-emerald-400', badge: 'success' },
  processing: { icon: Clock, color: 'text-amber-400', badge: 'warning' },
  failed: { icon: XCircle, color: 'text-red-400', badge: 'error' },
  pending: { icon: Clock, color: 'text-slate-400', badge: 'default' },
  rolled_back: { icon: RotateCcw, color: 'text-slate-500', badge: 'default' },
};

export function AccountImportHistoryTab({ organizationId }: AccountImportHistoryTabProps) {
  const navigate = useNavigate();
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const { data: allJobs = [], isLoading } = useImportJobs({ organizationId });
  const rollback = useRollbackImport();

  // Filter jobs by entity type
  const filteredJobs = entityFilter === 'all' 
    ? allJobs 
    : allJobs.filter(job => job.entity_type === entityFilter);

  // Get unique entity types for filter
  const entityTypes = [...new Set(allJobs.map(job => job.entity_type))];

  const handleRollback = (jobId: string) => {
    if (confirm('Are you sure you want to rollback this import? This will delete all records created by this import.')) {
      rollback.mutate(jobId);
    }
  };

  return (
    <PlatformCard variant="glass" size="container">
      <PlatformCardHeader className="flex flex-row items-center justify-between">
        <PlatformCardTitle>Import History</PlatformCardTitle>
        <div className="flex items-center gap-3">
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {entityTypes.map(type => (
                <SelectItem key={type} value={type} className="capitalize">
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PlatformButton size={tokens.button.card} onClick={() => navigate(`/platform/import?org=${organizationId}`)}>
            <Upload className="h-4 w-4 mr-2" />
            New Import
          </PlatformButton>
        </div>
      </PlatformCardHeader>
      <PlatformCardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full bg-slate-800" />
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <Upload className="h-12 w-12 mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">
              {entityFilter !== 'all' 
                ? `No ${entityFilter} imports found` 
                : 'No imports yet for this organization'}
            </p>
            <PlatformButton 
              variant="secondary" 
              className="mt-4"
              onClick={() => navigate(`/platform/import?org=${organizationId}`)}
            >
              Start First Import
            </PlatformButton>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map(job => (
              <ImportJobCard 
                key={job.id} 
                job={job} 
                onRollback={() => handleRollback(job.id)}
                isRollingBack={rollback.isPending}
              />
            ))}
          </div>
        )}
      </PlatformCardContent>
    </PlatformCard>
  );
}

interface ImportJobCardProps {
  job: ImportJob;
  onRollback: () => void;
  isRollingBack: boolean;
}

function ImportJobCard({ job, onRollback, isRollingBack }: ImportJobCardProps) {
  const { formatDate } = useFormatDate();
  const EntityIcon = entityTypeIcons[job.entity_type] || FileText;
  const status = statusConfig[job.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  const canRollback = job.status === 'completed' && !job.rolled_back_at && !job.is_dry_run;

  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-slate-600/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center",
          job.status === 'completed' ? 'bg-emerald-500/10' : 'bg-slate-700/50'
        )}>
          <EntityIcon className={cn(
            "h-5 w-5",
            job.status === 'completed' ? 'text-emerald-400' : 'text-slate-400'
          )} />
        </div>
        
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-white capitalize">
              {job.entity_type}
            </span>
            <span className="text-slate-500">from</span>
            <span className="text-slate-300">{job.source_type}</span>
            <PlatformBadge variant={status.badge} className="ml-2">
              <StatusIcon className="h-3 w-3 mr-1" />
              {job.status === 'rolled_back' ? 'Rolled Back' : job.status}
            </PlatformBadge>
            {job.is_dry_run && (
              <PlatformBadge variant="warning">Dry Run</PlatformBadge>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
            {job.created_at && (
              <span>{formatDate(new Date(job.created_at), 'MMM d, yyyy h:mm a')}</span>
            )}
            {job.success_count !== null && (
              <span className="text-emerald-400">
                ✓ {job.success_count} imported
              </span>
            )}
            {job.error_count !== null && job.error_count > 0 && (
              <span className="text-red-400">
                ✗ {job.error_count} failed
              </span>
            )}
            {job.skip_count !== null && job.skip_count > 0 && (
              <span className="text-amber-400">
                ⊘ {job.skip_count} skipped
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {canRollback && (
          <PlatformButton 
            variant="ghost" 
            size={tokens.button.inline}
            onClick={onRollback}
            disabled={isRollingBack}
            className="text-slate-400 hover:text-red-400"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Rollback
          </PlatformButton>
        )}
      </div>
    </div>
  );
}
