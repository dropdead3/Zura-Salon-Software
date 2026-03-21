import { AlertTriangle, Clock, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AtRiskParticipantBadgeProps {
  daysSinceLastCompletion: number | null;
  streakCount: number;
  status: string;
  className?: string;
}

type RiskLevel = 'none' | 'warning' | 'critical';

export function AtRiskParticipantBadge({
  daysSinceLastCompletion,
  streakCount,
  status,
  className,
}: AtRiskParticipantBadgeProps) {
  // Determine risk level
  const getRiskLevel = (): { level: RiskLevel; reason: string } => {
    if (status !== 'active') return { level: 'none', reason: '' };
    
    if (daysSinceLastCompletion !== null) {
      if (daysSinceLastCompletion >= 3) {
        return { level: 'critical', reason: `${daysSinceLastCompletion} days inactive` };
      }
      if (daysSinceLastCompletion >= 2) {
        return { level: 'warning', reason: `${daysSinceLastCompletion} days since last activity` };
      }
    }
    
    // High streak at risk (evening check - could be about to break)
    if (streakCount >= 7 && daysSinceLastCompletion === 1) {
      return { level: 'warning', reason: `${streakCount}-day streak at risk` };
    }
    
    return { level: 'none', reason: '' };
  };

  const { level, reason } = getRiskLevel();

  if (level === 'none') return null;

  const config = {
    warning: {
      icon: Clock,
      className: 'bg-amber-500/10 text-amber-600 border-amber-500/30', // amber: categorical warning, no theme token yet
      label: 'At Risk',
    },
    critical: {
      icon: AlertTriangle,
      className: 'bg-destructive/10 text-destructive border-destructive/30',
      label: 'Critical',
    },
  };

  const { icon: Icon, className: badgeClass, label } = config[level];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] gap-1 cursor-help",
              badgeClass,
              className
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>{reason}</p>
          <p className="text-muted-foreground mt-1">May need coach outreach</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface AtRiskSummaryProps {
  participants: Array<{
    daysSinceLastCompletion: number | null;
    streakCount: number;
    status: string;
  }>;
  className?: string;
}

export function AtRiskSummary({ participants, className }: AtRiskSummaryProps) {
  const atRiskCount = participants.filter(p => {
    if (p.status !== 'active') return false;
    if (p.daysSinceLastCompletion !== null && p.daysSinceLastCompletion >= 2) return true;
    return false;
  }).length;

  const criticalCount = participants.filter(p => {
    if (p.status !== 'active') return false;
    if (p.daysSinceLastCompletion !== null && p.daysSinceLastCompletion >= 3) return true;
    return false;
  }).length;

  if (atRiskCount === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg border",
        criticalCount > 0
          ? "bg-destructive/5 border-destructive/30"
          : "bg-amber-500/5 border-amber-500/30",
        className
      )}
    >
      <AlertTriangle
        className={cn(
          "w-5 h-5",
          criticalCount > 0 ? "text-destructive" : "text-amber-600"
        )}
      />
      <div className="flex-1">
        <p className="text-sm font-medium">
          {atRiskCount} participant{atRiskCount !== 1 ? 's' : '')} at risk
        </p>
        {criticalCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {criticalCount} critical (3+ days inactive)
          </p>
        )}
      </div>
      <TrendingDown className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}
