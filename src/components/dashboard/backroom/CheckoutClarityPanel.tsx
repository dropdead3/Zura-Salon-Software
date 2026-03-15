/**
 * CheckoutClarityPanel — Clear client-facing explanation of product usage charges.
 * Appears in AppointmentDetailSheet when overage or product cost charges exist.
 * Supports both 'overage' and 'product_cost' charge types.
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
import { Beaker, CheckCircle, XCircle, ShieldAlert, FlaskConical, TrendingUp } from 'lucide-react';

interface CheckoutClarityPanelProps {
  appointmentId: string;
  organizationId: string;
  isManagerOrAdmin?: boolean;
  productChargeLabel?: string;
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
  productChargeLabel = 'Product Usage',
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
          const chargeType = (charge as any).charge_type || 'overage';
          const isProductCost = chargeType === 'product_cost';
          const statusInfo = STATUS_BADGE[charge.status] ?? STATUS_BADGE.pending;
          const isWaived = charge.status === 'waived';

          return (
            <div
              key={charge.id}
              className={`rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2.5 ${isWaived ? 'opacity-60' : ''}`}
            >
              {/* Service name + status + charge type */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isProductCost ? (
                    <FlaskConical className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <Beaker className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <p className="font-sans text-sm font-medium">
                    {charge.service_name ?? 'Service'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    {isProductCost ? productChargeLabel : 'Overage'}
                  </Badge>
                  <Badge variant={statusInfo.variant} className="text-[10px]">
                    {statusInfo.label}
                  </Badge>
                </div>
              </div>

              {/* Usage breakdown — different for each charge type */}
              {isProductCost ? (
                <ProductCostBreakdown charge={charge} />
              ) : (
                <OverageBreakdown charge={charge} />
              )}

              {/* Charge amount */}
              <div className="flex justify-between items-center pt-1">
                <span className="font-sans text-sm text-muted-foreground">
                  {isProductCost ? 'Client Charge' : 'Additional Product Usage'}
                </span>
                <span className={`font-display text-base tabular-nums ${isWaived ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  <BlurredAmount>${charge.charge_amount.toFixed(2)}</BlurredAmount>
                </span>
              </div>

              {/* Salon profit (product cost only, manager view) */}
              {isProductCost && isManagerOrAdmin && !isWaived && (charge as any).product_wholesale_cost != null && (
                <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 rounded-md px-2 py-1.5">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                    <span>Salon profit</span>
                  </div>
                  <span className="font-medium text-emerald-600 tabular-nums">
                    ${(charge.charge_amount - ((charge as any).product_wholesale_cost ?? 0)).toFixed(2)}
                  </span>
                </div>
              )}

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

// ─── Subcomponents ───────────────────────────────────────────────

function OverageBreakdown({ charge }: { charge: CheckoutUsageCharge }) {
  return (
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
  );
}

function ProductCostBreakdown({ charge }: { charge: CheckoutUsageCharge }) {
  const wholesaleCost = (charge as any).product_wholesale_cost ?? 0;
  const markupPct = (charge as any).product_charge_markup_pct ?? 0;

  return (
    <div className="space-y-1 font-sans text-sm">
      <div className="flex justify-between text-muted-foreground">
        <span>Product used</span>
        <span className="tabular-nums">{charge.actual_usage_qty.toFixed(0)} g</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>Wholesale cost</span>
        <span className="tabular-nums">${wholesaleCost.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>Markup</span>
        <span className="tabular-nums">{markupPct.toFixed(0)}%</span>
      </div>
    </div>
  );
}
