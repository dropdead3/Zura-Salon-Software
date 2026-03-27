/**
 * PrepModeBanner — Shows prep status, per-bowl review, and approval workflow
 * for assistant-prepared sessions.
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Clock, CheckCircle2 } from 'lucide-react';
import type { MixSession } from '@/hooks/backroom/useMixSession';
import type { MixBowl } from '@/hooks/backroom/useMixBowls';
import type { MixBowlLine } from '@/hooks/backroom/useMixBowlLines';
import { StylistBowlReview } from './StylistBowlReview';
import { isAwaitingApproval, isPreparedBowl } from '@/lib/backroom/bowl-state-machine';

interface PrepModeBannerProps {
  session: MixSession;
  currentUserId?: string;
  assignedStylistId?: string;
  isManager?: boolean;
  onApprove: () => void;
  isApproving?: boolean;
  // Per-bowl review props (for awaiting_stylist_approval sessions)
  bowls?: MixBowl[];
  bowlLines?: Record<string, MixBowlLine[]>;
  onApproveBowl?: (bowlId: string) => void;
  onAdjustBowl?: (bowlId: string) => void;
  onDiscardBowl?: (bowlId: string) => void;
  onApproveAll?: () => void;
}

export function PrepModeBanner({
  session,
  currentUserId,
  assignedStylistId,
  isManager,
  onApprove,
  isApproving,
  bowls = [],
  bowlLines = {},
  onApproveBowl,
  onAdjustBowl,
  onDiscardBowl,
  onApproveAll,
}: PrepModeBannerProps) {
  if (!session.is_prep_mode) return null;

  const isApproved = !!session.prep_approved_at;
  const canApprove = !isApproved && (
    currentUserId === assignedStylistId || isManager
  );
  const isAwaitingStylistReview = session.status === 'awaiting_stylist_approval';

  // Approved state
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

  // Awaiting stylist approval — show per-bowl review
  if (isAwaitingStylistReview && canApprove) {
    const reviewBowls = bowls.filter(
      (b) => isAwaitingApproval(b.status) || isPreparedBowl(b.status)
    );

    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 flex items-center gap-3">
          <Clock className="w-4 h-4 text-warning shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-sans text-sm text-foreground">
              Assistant Prep — Ready for Review
            </p>
            <p className="font-sans text-xs text-muted-foreground">
              {reviewBowls.length} bowl{reviewBowls.length !== 1 ? 's' : ''} prepared and awaiting your approval
            </p>
          </div>
          {reviewBowls.length > 1 && onApproveAll && (
            <Button
              size="sm"
              className="h-9 px-4 font-sans text-sm shrink-0"
              onClick={onApproveAll}
              disabled={isApproving}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Approve All
            </Button>
          )}
        </div>

        {reviewBowls.map((bowl) => (
          <StylistBowlReview
            key={bowl.id}
            bowl={bowl}
            lines={bowlLines[bowl.id] ?? []}
            onApprove={onApproveBowl ?? (() => {})}
            onAdjust={onAdjustBowl ?? (() => {})}
            onDiscard={onDiscardBowl ?? (() => {})}
            isApproving={isApproving}
          />
        ))}
      </div>
    );
  }

  // Default: pending prep
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
