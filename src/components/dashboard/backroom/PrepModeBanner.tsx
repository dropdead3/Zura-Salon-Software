/**
 * PrepModeBanner — Shows prep status and approval workflow for assistant-prepared sessions.
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Clock } from 'lucide-react';
import type { MixSession } from '@/hooks/backroom/useMixSession';

interface PrepModeBannerProps {
  session: MixSession;
  currentUserId?: string;
  assignedStylistId?: string;
  isManager?: boolean;
  onApprove: () => void;
  isApproving?: boolean;
}

export function PrepModeBanner({
  session,
  currentUserId,
  assignedStylistId,
  isManager,
  onApprove,
  isApproving,
}: PrepModeBannerProps) {
  if (!session.is_prep_mode) return null;

  const isApproved = !!session.prep_approved_at;
  const canApprove = !isApproved && (
    currentUserId === assignedStylistId || isManager
  );

  if (isApproved) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 flex items-center gap-3">
        <UserCheck className="w-4 h-4 text-success shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-sans text-sm text-foreground">Prep approved</p>
          <p className="font-sans text-xs text-muted-foreground">
            Ready for service
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] text-success border-success/30 shrink-0">
          Approved
        </Badge>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 flex items-center gap-3">
      <Clock className="w-4 h-4 text-warning shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-sans text-sm text-foreground">
          Assistant Prep — Awaiting Review
        </p>
        <p className="font-sans text-xs text-muted-foreground">
          Bowls have been pre-mixed and are ready for stylist approval
        </p>
      </div>
      {canApprove ? (
        <Button
          size="sm"
          className="h-9 px-4 font-sans text-sm shrink-0"
          onClick={onApprove}
          disabled={isApproving}
        >
          <UserCheck className="w-3.5 h-3.5 mr-1.5" />
          Approve & Mix
        </Button>
      ) : (
        <Badge variant="outline" className="text-[10px] text-warning border-warning/30 shrink-0">
          Pending
        </Badge>
      )}
    </div>
  );
}
