import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Upload,
  Eye,
  Settings,
  Shield,
  Activity
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatformAuditLog, getAuditActionConfig, type AuditLogEntry } from '@/hooks/usePlatformAuditLog';

const actionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard_accessed: Eye,
  account_created: Building2,
  account_updated: Settings,
  account_activated: CheckCircle2,
  account_deactivated: AlertCircle,
  migration_started: Upload,
  migration_completed: CheckCircle2,
  migration_failed: AlertCircle,
  user_impersonated: Users,
  settings_updated: Settings,
  permission_changed: Shield,
};

const colorClasses = {
  violet: { bg: 'bg-violet-500/20', text: 'text-violet-400' },
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  amber: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  rose: { bg: 'bg-rose-500/20', text: 'text-rose-400' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  slate: { bg: 'bg-[hsl(var(--platform-bg-hover)/0.5)]', text: 'text-[hsl(var(--platform-foreground-muted))]' },
};

interface PlatformActivityFeedProps {
  limit?: number;
  showHeader?: boolean;
  className?: string;
}

export function PlatformActivityFeed({ 
  limit = 8, 
  showHeader = true,
  className 
}: PlatformActivityFeedProps) {
  const { data: logs, isLoading } = usePlatformAuditLog({ limit });

  if (isLoading) {
    return (
      <div className={cn(
        "rounded-[22px] border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.4)] backdrop-blur-xl p-5 overflow-hidden",
        className
      )}>
        {showHeader && (
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 rounded-xl bg-[hsl(var(--platform-primary)/0.2)]">
              <Activity className="h-4 w-4 text-[hsl(var(--platform-primary))]" />
            </div>
            <h2 className="text-lg font-medium text-[hsl(var(--platform-foreground))]">Activity Feed</h2>
          </div>
        )}
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl bg-[hsl(var(--platform-bg-hover))]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative rounded-[22px] border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.4)] backdrop-blur-xl p-5 overflow-hidden",
      className
    )}>
      {/* Subtle top-edge highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--platform-foreground)/0.04)] to-transparent" />

      {showHeader && (
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[hsl(var(--platform-primary)/0.2)] ring-1 ring-[hsl(var(--platform-primary)/0.1)]">
              <Activity className="h-4 w-4 text-[hsl(var(--platform-primary))]" />
            </div>
            <h2 className="text-lg font-medium text-[hsl(var(--platform-foreground))] tracking-tight">Activity Feed</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs text-[hsl(var(--platform-foreground-subtle))] font-medium tracking-wide">Live</span>
          </div>
        </div>
      )}
      
      {logs && logs.length > 0 ? (
        <div className="space-y-2">
          {logs.map((log, index) => (
            <ActivityLogItem key={log.id} log={log} isLatest={index === 0} />
          ))}
        </div>
      ) : (
        <div className="text-center py-14">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[16px] bg-[hsl(var(--platform-bg-hover)/0.3)] mb-4">
            <Activity className="h-8 w-8 text-[hsl(var(--platform-foreground-subtle))] opacity-30" />
          </div>
          <p className="text-[hsl(var(--platform-foreground-muted))] font-medium">No activity yet</p>
          <p className="text-sm text-[hsl(var(--platform-foreground-subtle))] mt-1">Actions will appear here as they happen</p>
        </div>
      )}
    </div>
  );
}

interface ActivityLogItemProps {
  log: AuditLogEntry;
  isLatest?: boolean;
}

function ActivityLogItem({ log, isLatest = false }: ActivityLogItemProps) {
  const config = getAuditActionConfig(log.action);
  const Icon = actionIcons[log.action] || Building2;
  const colors = colorClasses[config.color];

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const borderColors: Record<string, string> = {
    violet: 'border-l-violet-500/60',
    emerald: 'border-l-emerald-500/60',
    amber: 'border-l-amber-500/60',
    rose: 'border-l-rose-500/60',
    blue: 'border-l-blue-500/60',
    slate: 'border-l-[hsl(var(--platform-foreground-subtle)/0.4)]',
  };

  const linkPath = log.organization_id 
    ? `/platform/accounts/${log.organization_id}`
    : '#';

  return (
    <Link 
      to={linkPath}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--platform-bg-hover)/0.2)] border border-[hsl(var(--platform-border)/0.2)] border-l-2 cursor-pointer group/feed",
        "hover:bg-[hsl(var(--platform-bg-hover)/0.4)] hover:border-[hsl(var(--platform-border)/0.4)] hover:translate-x-0.5",
        "transition-all duration-150 ease-[cubic-bezier(0.25,0.1,0.25,1)] will-change-transform",
        borderColors[config.color] || 'border-l-[hsl(var(--platform-foreground-subtle)/0.4)]'
      )}
    >
      {/* User Avatar */}
      <Avatar className="h-8 w-8 ring-2 ring-[hsl(var(--platform-border)/0.3)] ring-offset-1 ring-offset-[hsl(var(--platform-bg-card))]">
        <AvatarImage src={log.user_photo || undefined} alt={log.user_name} />
        <AvatarFallback className="bg-[hsl(var(--platform-bg-hover))] text-[hsl(var(--platform-foreground-muted))] text-xs">
          {getInitials(log.user_name)}
        </AvatarFallback>
      </Avatar>

      {/* Action Icon */}
      <div className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition-transform duration-150 group-hover/feed:scale-105",
        colors.bg
      )}>
        <Icon className={cn("h-4 w-4", colors.text)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[hsl(var(--platform-foreground)/0.85)]">
          <span className="font-medium text-[hsl(var(--platform-foreground))]">{log.user_name || 'System'}</span>
          {' '}
          <span className="text-[hsl(var(--platform-foreground-muted))]">{config.verb}</span>
          {' '}
          {log.organization_name && (
            <span className="font-medium text-[hsl(var(--platform-primary))] group-hover/feed:text-[hsl(var(--platform-primary-hover))] transition-colors duration-200">
              {log.organization_name}
            </span>
          )}
        </p>
      </div>

      {/* Timestamp + live dot */}
      <div className="flex items-center gap-2 shrink-0">
        {isLatest && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
        <span className="text-xs text-[hsl(var(--platform-foreground-subtle))] whitespace-nowrap">
          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
        </span>
      </div>
    </Link>
  );
}
