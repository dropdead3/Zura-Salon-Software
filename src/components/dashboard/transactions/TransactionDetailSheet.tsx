import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  RotateCcw,
  Ban,
  Printer,
  Mail,
  ChevronDown,
  Copy,
  Scissors,
  Package,
  MapPin,
  Calendar,
  User,
  Loader2,
} from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatDate } from '@/hooks/useFormatDate';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { PaymentMethodBadge } from './PaymentMethodBadge';
import { VoidConfirmDialog } from './VoidConfirmDialog';
import { printReceipt, buildReceiptHtml } from './ReceiptPrintView';
import type { ReceiptBusinessInfo } from './ReceiptPrintView';
import { groupedTransactionToReceiptData } from './receiptData';
import { RefundDialog } from './RefundDialog';
import { useLeadershipCheck } from '@/hooks/useLeadershipCheck';
import { useReceiptConfig } from '@/hooks/useReceiptConfig';
import { useBusinessSettings, useBusinessName } from '@/hooks/useBusinessSettings';
import { useSocialLinks } from '@/hooks/useSocialLinks';
import { useReviewThresholdSettings } from '@/hooks/useReviewThreshold';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { GroupedTransaction } from '@/hooks/useGroupedTransactions';
import type { TransactionItem } from '@/hooks/useTransactions';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TransactionDetailSheetProps {
  transaction: GroupedTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Build a summary item_name for multi-item transactions */
function buildItemSummary(txn: GroupedTransaction): string {
  if (txn.items.length === 1) return txn.items[0].itemName;
  const names = txn.items.slice(0, 3).map(i => i.itemName);
  const suffix = txn.items.length > 3 ? ` +${txn.items.length - 3} more` : '';
  return `${txn.items.length} items — ${names.join(', ')}${suffix}`;
}

export function TransactionDetailSheet({ transaction, open, onOpenChange }: TransactionDetailSheetProps) {
  const { formatCurrency } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const { isLeadership } = useLeadershipCheck();
  const [voidOpen, setVoidOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Receipt branding data
  const { data: receiptConfig } = useReceiptConfig();
  const { data: business } = useBusinessSettings();
  const socialLinks = useSocialLinks();
  const { data: reviewSettings } = useReviewThresholdSettings();
  const orgName = useBusinessName();

  if (!transaction) return null;

  const truncatedId = transaction.transactionId.length > 12
    ? transaction.transactionId.slice(0, 12) + '…'
    : transaction.transactionId;

  const handleCopyId = () => {
    navigator.clipboard.writeText(transaction.transactionId);
    toast.success('Transaction ID copied');
  };

  const statusLabel = transaction.isVoided
    ? 'Voided'
    : transaction.refundStatus === 'completed'
    ? 'Refunded'
    : transaction.refundStatus === 'pending'
    ? 'Refund Pending'
    : 'Paid';

  const statusStyle = transaction.isVoided
    ? 'border-red-300 text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-400'
    : transaction.refundStatus === 'completed'
    ? 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950 dark:text-amber-400'
    : 'border-green-300 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-400';

  // Build refund adapter with summary label
  const refundItem: TransactionItem | null = transaction.items.length > 0
    ? {
        id: transaction.items[0].id,
        transaction_id: transaction.transactionId,
        transaction_date: transaction.transactionDate,
        phorest_client_id: transaction.phorestClientId,
        client_name: transaction.clientName,
        item_type: transaction.items[0].itemType,
        item_name: buildItemSummary(transaction),
        item_category: transaction.items[0].itemCategory,
        quantity: 1,
        unit_price: transaction.totalAmount,
        total_amount: transaction.totalAmount,
        tax_amount: transaction.taxAmount,
        discount: transaction.discountAmount,
        phorest_staff_id: null,
        location_id: transaction.locationId,
        branch_name: transaction.branchName,
        promotion_id: null,
      }
    : null;

  const handleVoidComplete = (isOpen: boolean) => {
    setVoidOpen(isOpen);
    if (!isOpen) onOpenChange(false);
  };

  const handleRefundComplete = (isOpen: boolean) => {
    setRefundOpen(isOpen);
    if (!isOpen) onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className={cn(tokens.drawer.content, 'w-full sm:max-w-md flex flex-col p-0')}
          style={{ left: 'unset' }}
        >
          {/* Header */}
          <SheetHeader className={tokens.drawer.header}>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <SheetTitle className={tokens.drawer.title}>
                  Transaction Details
                </SheetTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleCopyId}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        <span className="font-mono">{truncatedId}</span>
                        <Copy className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Copy full transaction ID</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5', statusStyle)}>
                {statusLabel}
              </Badge>
            </div>
          </SheetHeader>

          {/* Body */}
          <div className={tokens.drawer.body}>
            {/* Client & meta info */}
            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className={tokens.body.emphasis}>
                  {transaction.clientName || 'Walk-in'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(new Date(transaction.transactionDate + 'T12:00:00'), 'MMM d, yyyy')}
                </span>
                {transaction.branchName && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {transaction.branchName}
                  </span>
                )}
              </div>
              {transaction.stylistName && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Scissors className="w-3.5 h-3.5" />
                  <span>{transaction.stylistName}</span>
                </div>
              )}
            </div>

            {/* Items table */}
            <div className="rounded-lg border border-border/50 overflow-hidden mb-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-xs')}>Item</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-xs text-center w-12')}>Qty</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-xs text-right w-20')}>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transaction.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2">
                          {item.itemType.toLowerCase() === 'service' ? (
                            <Scissors className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="text-sm truncate block">{item.itemName}</span>
                            {item.discount > 0 && (
                              <span className="text-[10px] text-amber-600">
                                -{formatCurrency(item.discount)} discount
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm py-2.5">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums py-2.5">
                        <BlurredAmount>{formatCurrency(item.totalAmount)}</BlurredAmount>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Color Room Charges */}
            {transaction.usageCharges && transaction.usageCharges.length > 0 && (
              <div className="rounded-lg border border-border/50 overflow-hidden mb-5">
                <div className="px-3 py-2 bg-muted/30 border-b border-border/50">
                  <span className="text-xs font-display uppercase tracking-wide text-muted-foreground">Color Room Charges</span>
                </div>
                <Table>
                  <TableBody>
                    {transaction.usageCharges.map((charge) => (
                      <TableRow key={charge.id}>
                        <TableCell className="py-2.5">
                          <div className="min-w-0">
                            <span className="text-sm truncate block">
                              {charge.serviceName || (charge.chargeType === 'product_cost' ? 'Product Cost' : 'Overage')}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {charge.chargeType === 'product_cost' ? 'Product' : 'Overage'} × {charge.overageQty}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums py-2.5">
                          <BlurredAmount>{formatCurrency(charge.chargeAmount)}</BlurredAmount>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Payment summary */}
            <div className="rounded-lg bg-muted/30 border border-border/50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">
                  <BlurredAmount>{formatCurrency(transaction.subtotal)}</BlurredAmount>
                </span>
              </div>
              {transaction.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-600">Discount</span>
                  <span className="tabular-nums text-amber-600">
                    -<BlurredAmount>{formatCurrency(transaction.discountAmount)}</BlurredAmount>
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="tabular-nums">
                  <BlurredAmount>{formatCurrency(transaction.taxAmount)}</BlurredAmount>
                </span>
              </div>
              {transaction.tipAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tip</span>
                  <span className="tabular-nums">
                    <BlurredAmount>{formatCurrency(transaction.tipAmount)}</BlurredAmount>
                  </span>
                </div>
              )}
              {transaction.usageCharges && transaction.usageCharges.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Color Room</span>
                  <span className="tabular-nums">
                    <BlurredAmount>{formatCurrency(transaction.usageChargeTotal)}</BlurredAmount>
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-medium pt-2 border-t border-border/50">
                <span>Total</span>
                <span className="tabular-nums">
                  <BlurredAmount>{formatCurrency(transaction.grandTotal)}</BlurredAmount>
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">Payment Method</span>
                <PaymentMethodBadge method={transaction.paymentMethod} />
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className={cn(tokens.drawer.footer, 'flex items-center gap-2 flex-wrap')}>
          {!transaction.isVoided && transaction.refundStatus !== 'completed' && (
              <>
                {isLeadership && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full gap-1.5"
                    onClick={() => setRefundOpen(true)}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Refund
                  </Button>
                )}
                {isLeadership && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full gap-1.5 text-destructive hover:text-destructive"
                    onClick={() => setVoidOpen(true)}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Void
                  </Button>
                )}
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full gap-1.5 ml-auto">
                  <Printer className="w-3.5 h-3.5" />
                  Receipt
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  const logoUrl = business?.logo_light_url || business?.logo_dark_url || null;
                  const iconUrl = business?.icon_light_url || business?.icon_dark_url || null;
                  const addressParts = [business?.mailing_address, business?.city, business?.state, business?.zip].filter(Boolean);
                  const businessInfo = {
                    logoUrl,
                    iconUrl,
                    address: addressParts.join(', '),
                    phone: business?.phone || null,
                    website: business?.website || null,
                    socials: {
                      instagram: socialLinks?.instagram || '',
                      facebook: socialLinks?.facebook || '',
                      tiktok: socialLinks?.tiktok || '',
                    },
                    reviewUrls: {
                      google: reviewSettings?.googleReviewUrl || '',
                      yelp: reviewSettings?.yelpReviewUrl || '',
                      facebook: reviewSettings?.facebookReviewUrl || '',
                    },
                  };
                  printReceipt(transaction, formatCurrency, orgName, receiptConfig, businessInfo);
                }}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print Receipt
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={sendingEmail}
                  onClick={async () => {
                    setSendingEmail(true);
                    try {
                      // Prompt for email address
                      const email = window.prompt('Enter client email address:');
                      if (!email) { setSendingEmail(false); return; }
                      const logoUrl = business?.logo_light_url || business?.logo_dark_url || null;
                      const iconUrl = business?.icon_light_url || business?.icon_dark_url || null;
                      const addressParts = [business?.mailing_address, business?.city, business?.state, business?.zip].filter(Boolean);
                      const bInfo: ReceiptBusinessInfo = {
                        logoUrl,
                        iconUrl,
                        address: addressParts.join(', '),
                        phone: business?.phone || null,
                        website: business?.website || null,
                        socials: {
                          instagram: socialLinks?.instagram || '',
                          facebook: socialLinks?.facebook || '',
                          tiktok: socialLinks?.tiktok || '',
                        },
                        reviewUrls: {
                          google: reviewSettings?.googleReviewUrl || '',
                          yelp: reviewSettings?.yelpReviewUrl || '',
                          facebook: reviewSettings?.facebookReviewUrl || '',
                        },
                      };
                      const data = groupedTransactionToReceiptData(transaction);
                      const html = buildReceiptHtml(data, formatCurrency, orgName, receiptConfig, bInfo);
                      const { error } = await supabase.functions.invoke('send-receipt', {
                        body: {
                          method: 'email',
                          recipient: email,
                          receiptHtml: html,
                          orgName,
                        },
                      });
                      if (error) throw error;
                      toast.success(`Receipt emailed to ${email}`);
                    } catch (err) {
                      console.error('Failed to email receipt:', err);
                      toast.error('Failed to send receipt email');
                    } finally {
                      setSendingEmail(false);
                    }
                  }}
                >
                  {sendingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                  Email Receipt
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SheetContent>
      </Sheet>

      <VoidConfirmDialog
        transaction={transaction}
        open={voidOpen}
        onOpenChange={handleVoidComplete}
      />

      {refundItem && (
        <RefundDialog
          transaction={refundItem}
          open={refundOpen}
          onOpenChange={handleRefundComplete}
        />
      )}
    </>
  );
}
