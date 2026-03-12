/**
 * CheckoutClarityPanel — Clear client-facing explanation of product usage charges.
 * Appears in AppointmentDetailSheet when overage charges exist.
 * Makes billing conversations effortless for front desk staff.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import {
  useCheckoutUsageCharges,
  useApproveOverageCharge,
  useWaiveOverageCharge,
  type CheckoutUsageCharge,
} from '@/hooks/billing/useCheckoutUsageCharges';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { tokens } from '@/lib/design-tokens';
import { Beaker, CheckCircle, XCircle, ShieldAlert } from 'lucide-react';

interface CheckoutClarityPanelProps {
  appointmentId: string;
  organizationId: string;
  isManagerOrAdmin?: boolean;
}

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'Pending', variant: 'default' },
  approved: { label: 'Approved', variant: 'secondary' },
  waived: { label: 'Waived', variant: 'outline' },
};

export function CheckoutClarityPanel({
  appointmentId,
  organizationId,
  isManagerOrAdmin = false,
}: CheckoutClarityPanelProps) {
  const { data: charges, isLoading } = useCheckoutUsageCharges(appointmentId);
  const approveCharge = useApproveOverageCharge();
  const waiveCharge = useWaiveOverageCharge();

  const [waiveTarget, setWaiveTarget] = useState<CheckoutUsageCharge | null>(null);
  const [waiveReason, setWaiveReason] = useState('');

  if (isLoading || !charges || charges.length === 0) return null;

  const handleWaive = () => {
    if (!waiveTarget || !waiveReason.trim()) return;
    waiveCharge.mutate(
      { chargeId: waiveTarget.id, organizationId, reason: waiveReason.trim() },
      {
        onSuccess: () => {
          setWaiveTarget(null);
          setWaiveReason('');
        },
      }
    );
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-xl border border-border bg-card/80 backdrop-blur-xl p-4 space-y-3"
      >
        <div className="flex items-center gap-2">
          <div className={tokens.card.iconBox}>
            <Beaker className={tokens.card.icon} />
          </div>
          <h4 className={tokens.heading.subsection}>Product Usage Summary</h4>
        </div>

        {charges.map((charge) => {
          const statusInfo = STATUS_BADGE[charge.status] ?? STATUS_BADGE.pending;
          const isWaived = charge.status === 'waived';

          return (
            <div
              key={charge.id}
              className={`rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2.5 ${isWaived ? 'opacity-60' : ''}`}
            >
              {/* Service name + status */}
              <div className="flex items-center justify-between">
                <p className="font-sans text-sm font-medium">
                  {charge.service_name ?? 'Service'}
                </p>
                <Badge variant={statusInfo.variant} className="text-[10px]">
                  {statusInfo.label}
                </Badge>
              </div>

              {/* Usage breakdown */}
              <div className="space-y-1 font-sans text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Included allowance</span>
                  <span className="tabular-nums">{charge.included_allowance_qty.toFixed(0)} g</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Actual usage</span>
                  <span className="tabular-nums">{charge.actual_usage_qty.toFixed(0)} g</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between font-medium text-foreground">
                  <span>Additional usage</span>
                  <span className="tabular-nums">{charge.overage_qty.toFixed(0)} g</span>
                </div>
              </div>

              {/* Charge amount */}
              <div className="flex justify-between items-center pt-1">
                <span className="font-sans text-sm text-muted-foreground">
                  Additional Product Usage
                </span>
                <span className={`font-display text-base tabular-nums ${isWaived ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  <BlurredAmount>${charge.charge_amount.toFixed(2)}</BlurredAmount>
                </span>
              </div>

              {/* Manager actions */}
              {isManagerOrAdmin && charge.status === 'pending' && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 h-10 font-sans text-xs"
                    onClick={() =>
                      approveCharge.mutate({ chargeId: charge.id, organizationId })
                    }
                    disabled={approveCharge.isPending}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-10 font-sans text-xs"
                    onClick={() => setWaiveTarget(charge)}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Waive
                  </Button>
                </div>
              )}

              {/* Waived reason */}
              {isWaived && charge.waived_reason && (
                <p className="font-sans text-xs text-muted-foreground italic">
                  Waived: {charge.waived_reason}
                </p>
              )}
            </div>
          );
        })}
      </motion.div>

      {/* Waive reason dialog */}
      <Dialog open={!!waiveTarget} onOpenChange={() => setWaiveTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base tracking-wide">
              Waive Usage Charge
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldAlert className="w-4 h-4 text-warning" />
              <span>This action will be logged for audit purposes.</span>
            </div>
            <div className="space-y-1.5">
              <Label className="font-sans text-sm">Reason for waiving</Label>
              <Textarea
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
                placeholder="e.g., Client loyalty credit, first-time service adjustment"
                className="min-h-[80px] font-sans text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWaiveTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleWaive}
              disabled={!waiveReason.trim() || waiveCharge.isPending}
            >
              Waive Charge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
