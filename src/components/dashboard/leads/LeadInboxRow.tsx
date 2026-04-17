import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  UserPlus, 
  Hand, 
  MapPin,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { LeadWithAssignee } from '@/hooks/useLeadInbox';
import { LeadStatusBadge } from './LeadStatusBadge';
import { LeadSourceBadge } from './LeadSourceBadge';
import { MatchConfidenceBadge } from './MatchConfidenceBadge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface LeadInboxRowProps {
  lead: LeadWithAssignee;
  onAssign: () => void;
  onClaim: () => void;
  onClick: () => void;
  canClaim: boolean;
  canAssign: boolean;
  isClaiming: boolean;
}

export function LeadInboxRow({
  lead,
  onAssign,
  onClaim,
  onClick,
  canClaim,
  canAssign,
  isClaiming,
}: LeadInboxRowProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isUnassigned = !lead.assigned_to;
  const isNew = lead.status === 'new';

  return (
    <div 
      className={cn(
        "group flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer",
        "hover:border-primary/30 hover:bg-muted/30",
        isNew && isUnassigned && "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20"
      )}
      onClick={onClick}
    >
      {/* Avatar */}
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarFallback className={cn(
          "text-sm font-medium",
          isNew ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400" 
            : "bg-muted text-muted-foreground"
        )}>
          {getInitials(lead.name)}
        </AvatarFallback>
      </Avatar>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-medium truncate">{lead.name}</span>
          <LeadStatusBadge status={lead.status} />
          <MatchConfidenceBadge
            matchMethod={lead.match_method}
            matchConfidence={lead.match_confidence}
            hasContactInfo={!!(lead.email || lead.phone)}
          />
        </div>
        
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LeadSourceBadge source={lead.source} showIcon={false} className="text-xs py-0" />
          
          {lead.preferred_location_name && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {lead.preferred_location_name}
            </span>
          )}
          
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 flex-shrink-0" />
            {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Assignee info */}
        {lead.assignee_name && (
          <div className="mt-1 text-xs text-muted-foreground">
            Assigned to <span className="font-medium">{lead.assignee_name}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {isUnassigned && canClaim && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={(e) => { e.stopPropagation(); onClaim(); }}
            disabled={isClaiming}
            className="gap-1"
          >
            <Hand className="w-3 h-3" />
            Claim
          </Button>
        )}
        
        {isUnassigned && canAssign && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={(e) => { e.stopPropagation(); onAssign(); }}
            className="gap-1"
          >
            <UserPlus className="w-3 h-3" />
            Assign
          </Button>
        )}
        
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
}
