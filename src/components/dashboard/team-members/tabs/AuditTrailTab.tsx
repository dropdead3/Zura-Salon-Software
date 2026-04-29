import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList, Loader2, Sparkles } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { useTeamMemberAuditTrail, type AuditEvent } from '@/hooks/useTeamMemberAuditTrail';
import { cn } from '@/lib/utils';

interface AuditTrailTabProps {
  userId: string;
}

function actorInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function eventTone(kind: AuditEvent['kind']): string {
  switch (kind) {
    case 'role_added':
    case 'approved':
    case 'admin_approved':
    case 'super_admin_granted':
      return 'border-emerald-500/30 bg-emerald-500/5';
    case 'role_removed':
    case 'revoked':
    case 'admin_revoked':
    case 'super_admin_revoked':
      return 'border-amber-500/30 bg-amber-500/5';
    default:
      return 'border-border/60 bg-card/60';
  }
}

/**
 * Per-member audit trail rendering role assignments, approvals, and elevation events.
 * Reads from `account_approval_logs` via `useTeamMemberAuditTrail` (no new infrastructure).
 *
 * Design tokens: font-display for headings/relative timestamps, font-sans for body.
 * The initial role assignment is flagged with a Sparkles pill — derived at read-time.
 */
export function AuditTrailTab({ userId }: AuditTrailTabProps) {
  const { data: events, isLoading } = useTeamMemberAuditTrail(userId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <h3 className={tokens.empty.heading}>No access changes recorded</h3>
          <p className={tokens.empty.description}>
            Role assignments, approvals, and access changes will appear here as they happen.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2">
        <ClipboardList className="h-4 w-4 text-primary" />
        <h2 className="font-display text-sm uppercase tracking-wider text-foreground">
          Access Trail
        </h2>
        <span className="text-xs text-muted-foreground font-sans">
          ({events.length} event{events.length === 1 ? '' : 's'})
        </span>
      </div>
      <div className="space-y-2">
        {events.map((event) => {
          const actorName = event.performedByName ?? 'System';
          return (
            <div
              key={event.id}
              className={cn(
                'flex items-start gap-3 px-4 py-3 rounded-lg border transition-colors',
                eventTone(event.kind),
              )}
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={event.performedByPhotoUrl ?? undefined} alt={actorName} />
                <AvatarFallback className="text-xs">{actorInitials(actorName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-sans text-sm font-medium text-foreground">
                    {event.label}
                  </span>
                  {event.isInitialAssignment && (
                    <Badge
                      variant="outline"
                      className="gap-1 h-5 border-primary/40 bg-primary/5 text-primary text-[10px]"
                    >
                      <Sparkles className="h-3 w-3" />
                      First role
                    </Badge>
                  )}
                </div>
                <p className="font-sans text-xs text-muted-foreground mt-0.5">
                  by {actorName}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">
                  {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
