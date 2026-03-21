import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { cn } from '@/lib/utils';
import { RefundWizard } from './RefundWizard';
import {
  type TransactionBreakdown,
  type TransactionLineItem,
} from '@/hooks/useAppointmentTransactionBreakdown';
import { ShoppingBag, Scissors, Receipt, CreditCard, Undo2, Copy, DollarSign, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TransactionBreakdownPanelProps {
  breakdown: TransactionBreakdown | undefined;
  isLoading: boolean;
  organizationId: string | null;
  clientId: string | null;
  appointmentDate: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  services: { label: 'Services', icon: Scissors },
  products: { label: 'Products', icon: ShoppingBag },
  fees: { label: 'Fees & Charges', icon: Receipt },
  deposits: { label: 'Deposits & Payments', icon: DollarSign },
  other: { label: 'Other', icon: Receipt },
};

const REFUND_STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-600', label: 'Pending' },
  approved: { bg: 'bg-blue-500/10', text: 'text-blue-600', label: 'Approved' },
  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', label: 'Completed' },
  rejected: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Rejected' },
};

function ItemRow({ item }: { item: TransactionLineItem }) {
  const hasDiscount = item.discount > 0;
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 px-1 border-b border-border/40 last:border-0">
      <div className="min-w-0 flex-1">
        <span className="text-sm text-foreground">{item.itemName}</span>
        {item.quantity > 1 && (
          <span className="text-muted-foreground text-xs ml-1">×{item.quantity}</span>
        )}
        {item.stylistName && (
          <span className="ml-2 inline-flex items-center rounded-full bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {item.stylistName}
          </span>
        )}
      </div>
      <div className="text-right shrink-0 flex items-center gap-2">
        {hasDiscount && (
          <span className="text-muted-foreground/70 line-through text-xs">
            <BlurredAmount>${(item.unitPrice * item.quantity).toFixed(2)}</BlurredAmount>
          </span>
        )}
        <span className="text-sm text-foreground">
          <BlurredAmount>${item.totalAmount.toFixed(2)}</BlurredAmount>
        </span>
      </div>
    </div>
  );
}

function CategorySection({ categoryKey, items }: { categoryKey: string; items: TransactionLineItem[] }) {
  if (items.length === 0) return null;
  const config = CATEGORY_CONFIG[categoryKey] || CATEGORY_CONFIG.other;
  const Icon = config.icon;

  return (
    <div className="rounded-lg bg-muted/30 px-3 py-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-primary" />
        <span className="font-display text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          {config.label}
        </span>
      </div>
      <div>
        {items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

export function TransactionBreakdownPanel({
  breakdown,
  isLoading,
  organizationId,
  clientId,
  appointmentDate,
}: TransactionBreakdownPanelProps) {
  const [refundOpen, setRefundOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className={tokens.loading.skeleton} />
        ))}
      </div>
    );
  }

  if (!breakdown?.hasTransaction) {
    return (
      <div className={tokens.empty.container}>
        <Receipt className={cn(tokens.empty.icon, 'text-primary')} />
        <h3 className={tokens.empty.heading}>No Transaction Data</h3>
        <p className={tokens.empty.description}>
          Transaction data will appear after POS sync
        </p>
      </div>
    );
  }

  const { summary, refunds } = breakdown;

  const handleCopyReceipt = () => {
    const lines: string[] = ['--- RECEIPT ---', ''];
    const addCategory = (label: string, items: TransactionLineItem[]) => {
      if (items.length === 0) return;
      lines.push(label.toUpperCase());
      items.forEach((i) => {
        const qty = i.quantity > 1 ? ` ×${i.quantity}` : '';
        const disc = i.discount > 0 ? ` (was $${(i.unitPrice * i.quantity).toFixed(2)})` : '';
        lines.push(`  ${i.itemName}${qty}: $${i.totalAmount.toFixed(2)}${disc}`);
      });
      lines.push('');
    };
    addCategory('Services', breakdown.services);
    addCategory('Products', breakdown.products);
    addCategory('Fees', breakdown.fees);
    addCategory('Deposits', breakdown.deposits);
    addCategory('Other', breakdown.other);
    lines.push('---');
    if (summary.discountTotal > 0) lines.push(`Discounts: -$${summary.discountTotal.toFixed(2)}`);
    if (summary.taxTotal > 0) lines.push(`Tax: $${summary.taxTotal.toFixed(2)}`);
    if (summary.tip > 0) lines.push(`Tip: $${summary.tip.toFixed(2)}`);
    lines.push(`Total: $${summary.grandTotal.toFixed(2)}`);
    lines.push(`Paid via: ${summary.paymentMethods.join(', ') || 'Unknown'}`);
    navigator.clipboard.writeText(lines.join('\n'));
    toast.success('Receipt copied to clipboard');
  };

  return (
    <div className="space-y-3">
      {/* Line items by category */}
      <CategorySection categoryKey="services" items={breakdown.services} />
      {breakdown.services.length > 0 && breakdown.products.length === 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground/60">
          <ShoppingBag className="w-3 h-3" />
          No retail items purchased
        </div>
      )}
      <CategorySection categoryKey="products" items={breakdown.products} />
      <CategorySection categoryKey="fees" items={breakdown.fees} />
      <CategorySection categoryKey="deposits" items={breakdown.deposits} />
      <CategorySection categoryKey="other" items={breakdown.other} />

      {/* Summary totals */}
      <div className="rounded-lg bg-muted/20 px-3 py-3 space-y-0">
        {summary.discountTotal > 0 && (
          <div className="flex justify-between py-1 text-sm">
            <span className="text-muted-foreground">Discounts</span>
            <span className="text-amber-600">
              <BlurredAmount>-${summary.discountTotal.toFixed(2)}</BlurredAmount>
            </span>
          </div>
        )}
        {summary.taxTotal > 0 && (
          <div className="flex justify-between py-1 text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span className="text-foreground"><BlurredAmount>${summary.taxTotal.toFixed(2)}</BlurredAmount></span>
          </div>
        )}
        {summary.tip > 0 && (
          <div className="flex justify-between py-1 text-sm">
            <span className="text-muted-foreground">Tip</span>
            <span className="text-foreground"><BlurredAmount>${summary.tip.toFixed(2)}</BlurredAmount></span>
          </div>
        )}

        {/* Total line */}
        <div className="border-t-2 border-border mt-1.5 pt-2 flex justify-between items-center">
          <span className="font-display text-base tracking-[0.08em] uppercase text-foreground">Total Paid</span>
          <span className="font-display text-base tracking-[0.08em] text-foreground">
            <BlurredAmount>${summary.grandTotal.toFixed(2)}</BlurredAmount>
          </span>
        </div>

        {/* Paid in full indicator */}
        <div className="flex items-center gap-1.5 pt-1.5 text-xs text-emerald-600">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Paid in full · No outstanding balance
        </div>

        {/* Payment method pill */}
        {summary.paymentMethods.length > 0 && (
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
              <CreditCard className="w-3 h-3" />
              {summary.paymentMethods.join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Existing refunds */}
      {refunds.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Undo2 className="w-3.5 h-3.5 text-primary" />
            <span className="font-display text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              Refund History
            </span>
          </div>
          {refunds.map((r) => {
            const badge = REFUND_STATUS_BADGE[r.status] || REFUND_STATUS_BADGE.pending;
            return (
              <div key={r.id} className="rounded-lg bg-muted/20 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="text-sm text-foreground">{r.originalItemName || 'Refund'}</span>
                    <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5', badge.bg, badge.text)}>
                      {badge.label}
                    </Badge>
                  </div>
                  <span className="text-sm text-destructive shrink-0">
                    <BlurredAmount>-${r.refundAmount.toFixed(2)}</BlurredAmount>
                  </span>
                </div>
                {(r.reason || r.createdAt) && (
                  <div className="flex items-center gap-2 mt-1">
                    {r.reason && (
                      <span className="text-xs text-muted-foreground">{r.reason}</span>
                    )}
                    {r.createdAt && (
                      <span className="text-xs text-muted-foreground/60">
                        {format(new Date(r.createdAt), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          size="default"
          className="flex-[2] gap-1.5 rounded-xl h-10"
          onClick={() => setRefundOpen(true)}
        >
          <Undo2 className="w-4 h-4" />
          Issue Refund
        </Button>
        <Button
          variant="ghost"
          size="default"
          className="flex-1 gap-1.5 rounded-xl h-10"
          onClick={handleCopyReceipt}
        >
          <Copy className="w-4 h-4" />
          Copy Receipt
        </Button>
      </div>

      {/* Refund Wizard */}
      {refundOpen && organizationId && (
        <RefundWizard
          open={refundOpen}
          onOpenChange={setRefundOpen}
          breakdown={breakdown}
          organizationId={organizationId}
          clientId={clientId}
          appointmentDate={appointmentDate}
        />
      )}
    </div>
  );
}
