/**
 * StylistBowlReview — Per-bowl review card for stylist approval of assistant-prepared bowls.
 * Shows formula lines, weights, assistant name, and Approve/Adjust/Discard actions.
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Pencil, Trash2, Beaker } from 'lucide-react';
import type { MixBowl } from '@/hooks/backroom/useMixBowls';
import type { MixBowlLine } from '@/hooks/backroom/useMixBowlLines';
import { isAwaitingApproval, isPreparedBowl } from '@/lib/backroom/bowl-state-machine';

interface StylistBowlReviewProps {
  bowl: MixBowl;
  lines: MixBowlLine[];
  assistantName?: string;
  onApprove: (bowlId: string) => void;
  onAdjust: (bowlId: string) => void;
  onDiscard: (bowlId: string) => void;
  isApproving?: boolean;
}

export function StylistBowlReview({
  bowl,
  lines,
  assistantName,
  onApprove,
  onAdjust,
  onDiscard,
  isApproving,
}: StylistBowlReviewProps) {
  const showReview = isAwaitingApproval(bowl.status) || isPreparedBowl(bowl.status);
  if (!showReview) return null;

  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-warning/10 rounded-lg flex items-center justify-center">
            <Beaker className="w-4 h-4 text-warning" />
          </div>
          <div>
            <p className="font-display text-sm tracking-wide">
              Bowl {bowl.bowl_number}
              {bowl.bowl_name ? ` — ${bowl.bowl_name}` : ''}
            </p>
            {assistantName && (
              <p className="font-sans text-xs text-muted-foreground">
                Prepared by {assistantName}
              </p>
            )}
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] text-warning border-warning/30">
          Awaiting Approval
        </Badge>
      </div>

      {/* Formula lines */}
      {lines.length > 0 ? (
        <div className="space-y-1.5 pl-10">
          {lines.map((line) => (
            <div key={line.id} className="flex items-center justify-between font-sans text-sm">
              <span className="text-foreground">
                {line.product_name_snapshot}
                {line.brand_snapshot ? (
                  <span className="text-muted-foreground ml-1">({line.brand_snapshot})</span>
                ) : null}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {line.dispensed_quantity} {line.dispensed_unit}
              </span>
            </div>
          ))}
          <div className="border-t border-border/40 pt-1.5 flex items-center justify-between font-sans text-sm">
            <span className="text-muted-foreground">Total dispensed</span>
            <span className="text-foreground tabular-nums">
              {bowl.total_dispensed_weight?.toFixed(1) ?? '0.0'} g
            </span>
          </div>
        </div>
      ) : (
        <p className="font-sans text-sm text-muted-foreground pl-10">No products added yet</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pl-10">
        <Button
          size="sm"
          className="h-8 px-3 font-sans text-sm"
          onClick={() => onApprove(bowl.id)}
          disabled={isApproving}
        >
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          Approve
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 font-sans text-sm"
          onClick={() => onAdjust(bowl.id)}
        >
          <Pencil className="w-3.5 h-3.5 mr-1" />
          Adjust
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 font-sans text-sm text-destructive hover:text-destructive"
          onClick={() => onDiscard(bowl.id)}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" />
          Discard
        </Button>
      </div>
    </div>
  );
}
