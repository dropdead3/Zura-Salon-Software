import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { cn } from '@/lib/utils';
import { RefundWizard } from './RefundWizard';
import {
  type TransactionBreakdown,
  type TransactionLineItem,
} from '@/hooks/useAppointmentTransactionBreakdown';
import { ShoppingBag, Scissors, Receipt, CreditCard, Undo2, Copy, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface TransactionBreakdownPanelProps {
  breakdown: TransactionBreakdown | undefined;
  isLoading: boolean;
  organizationId: string | null;
  clientId: string | null; // phorest_clients.id (UUID)
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
    <div className="flex items-center justify-between gap-2 py-1.5 text-sm">
      <div className="min-w-0 flex-1">
        <span className="text-foreground">{item.itemName}</span>
        {item.quantity > 1 && (
          <span className="text-muted-foreground ml-1">×{item.quantity}</span>
        )}
        {item.stylistName && (
          <span className="text-muted-foreground text-xs ml-2">({item.stylistName})</span>
        )}
      </div>
      <div className="text-right shrink-0 flex items-center gap-2">
        {hasDiscount && (
          <span className="text-muted-foreground line-through text-xs">
            <BlurredAmount>${(item.unitPrice * item.quantity).toFixed(2)}</BlurredAmount>
          </span>
        )}
        <span className="text-foreground">
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
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className={cn(tokens.label.default, 'text-xs uppercase tracking-wide text-muted-foreground')}>
          {config.label}
        </span>
      </div>
      {items.map((item) => (
        <ItemRow key={item.id} item={item} />
      ))}
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
        <Receipt className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>No Transaction Data</h3>
        <p className={tokens.empty.description}>
          No POS transaction was found for this appointment.
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
    <div className="space-y-4">
      {/* Line items by category */}
      <CategorySection categoryKey="services" items={breakdown.services} />
      <CategorySection categoryKey="products" items={breakdown.products} />
      <CategorySection categoryKey="fees" items={breakdown.fees} />
      <CategorySection categoryKey="deposits" items={breakdown.deposits} />
      <CategorySection categoryKey="other" items={breakdown.other} />

      <Separator />

      {/* Summary totals */}
      <div className="space-y-1.5 text-sm">
        {summary.discountTotal > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discounts</span>
            <span className="text-amber-600">
              <BlurredAmount>-${summary.discountTotal.toFixed(2)}</BlurredAmount>
            </span>
          </div>
        )}
        {summary.taxTotal > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span><BlurredAmount>${summary.taxTotal.toFixed(2)}</BlurredAmount></span>
          </div>
        )}
        {summary.tip > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tip</span>
            <span><BlurredAmount>${summary.tip.toFixed(2)}</BlurredAmount></span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-medium">
          <span>Total Paid</span>
          <span><BlurredAmount>${summary.grandTotal.toFixed(2)}</BlurredAmount></span>
        </div>
        {summary.paymentMethods.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CreditCard className="w-3.5 h-3.5" />
            Paid via: {summary.paymentMethods.join(', ')}
          </div>
        )}
      </div>

      {/* Existing refunds */}
      {refunds.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <span className={cn(tokens.label.default, 'text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5')}>
              <Undo2 className="w-3.5 h-3.5" />
              Refund History
            </span>
            {refunds.map((r) => {
              const badge = REFUND_STATUS_BADGE[r.status] || REFUND_STATUS_BADGE.pending;
              return (
                <div key={r.id} className="flex items-center justify-between text-sm py-1 rounded-lg">
                  <div className="min-w-0">
                    <span className="text-foreground">{r.originalItemName || 'Refund'}</span>
                    <Badge variant="outline" className={cn('ml-2 text-[10px]', badge.bg, badge.text)}>
                      {badge.label}
                    </Badge>
                  </div>
                  <span className="text-destructive shrink-0">
                    <BlurredAmount>-${r.refundAmount.toFixed(2)}</BlurredAmount>
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Separator />

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => setRefundOpen(true)}
        >
          <Undo2 className="w-3.5 h-3.5" />
          Issue Refund
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={handleCopyReceipt}
        >
          <Copy className="w-3.5 h-3.5" />
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
