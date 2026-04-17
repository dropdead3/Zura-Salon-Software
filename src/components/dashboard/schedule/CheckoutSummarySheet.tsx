import { useState, useEffect } from 'react';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Copy, CreditCard, Info, Receipt, Download, Eye, DollarSign, CalendarCheck, Sparkles, CalendarPlus, XCircle, ChevronDown, MessageSquare, CheckCircle2, FlaskConical, Banknote, Wallet, Loader2, Wifi, Mail, Send } from 'lucide-react';
import { SendToPayButton } from '@/components/dashboard/appointments/SendToPayButton';
import { AfterpaySurchargePreview } from '@/components/dashboard/payments/AfterpaySurchargePreview';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Switch removed - rebook toggle replaced by rebooking gate
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { toast } from 'sonner';
import type { PhorestAppointment } from '@/hooks/usePhorestCalendar';
import type { BusinessSettings } from '@/hooks/useBusinessSettings';
import { PromoCodeInput } from '@/components/dashboard/checkout/PromoCodeInput';
import type { PromoValidationResult } from '@/hooks/usePromoCodeValidation';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { NextVisitRecommendation } from '@/components/dashboard/schedule/NextVisitRecommendation';
import { RebookDeclineReasonDialog } from '@/components/dashboard/schedule/RebookDeclineReasonDialog';
import { useLogRebookDeclineReason, getReasonLabel, type RebookDeclineReasonCode } from '@/hooks/useRebookDeclineReasons';
import type { RebookInterval } from '@/lib/scheduling/rebook-recommender';
import { useCheckoutUsageCharges } from '@/hooks/billing/useCheckoutUsageCharges';
import { useColorBarBillingSettings } from '@/hooks/billing/useColorBarBillingSettings';
import { useActiveTerminalReader } from '@/hooks/useActiveTerminalReader';
import { useTerminalCheckoutFlow, type TerminalFlowState } from '@/hooks/useTerminalCheckoutFlow';
import { useTerminalDeposit } from '@/hooks/useTerminalDeposit';
import { useReceiptConfig } from '@/hooks/useReceiptConfig';
import { useSocialLinks } from '@/hooks/useSocialLinks';
import { useReviewThresholdSettings } from '@/hooks/useReviewThreshold';
import { useBusinessName } from '@/hooks/useBusinessSettings';
import { printReceiptFromData, buildReceiptHtml } from '@/components/dashboard/transactions/ReceiptPrintView';
import type { ReceiptBusinessInfo } from '@/components/dashboard/transactions/ReceiptPrintView';
import { checkoutToReceiptData } from '@/components/dashboard/transactions/receiptData';

type CheckoutPaymentMethod = 'card_reader' | 'cash' | 'other';

const formatAddress = (address: any) => {
  if (!address) return '';
  return `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
};

// Legacy free-text reasons retained only for backward compat with downstream
// onConfirm signature; new captures use RebookDeclineReasonCode via the dialog.

interface CheckoutSummarySheetProps {
  appointment: PhorestAppointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (tipAmount: number, rebooked: boolean, promoResult?: PromoValidationResult | null, declineReason?: string, paymentMetadata?: { method: CheckoutPaymentMethod; stripe_payment_intent_id?: string }) => void;
  isUpdating?: boolean;
  taxRate: number;
  businessSettings: BusinessSettings | null;
  locationName: string;
  locationAddress?: string;
  locationPhone?: string;
  organizationId?: string;
  locationId?: string;
  onScheduleNext?: (apt: PhorestAppointment, interval?: RebookInterval) => void;
  rebookCompleted?: boolean;
}

const TIP_PRESETS = [
  { label: '15%', multiplier: 0.15 },
  { label: '18%', multiplier: 0.18 },
  { label: '20%', multiplier: 0.20 },
  { label: '25%', multiplier: 0.25 },
];

export function CheckoutSummarySheet({
  appointment,
  open,
  onOpenChange,
  onConfirm,
  isUpdating = false,
  taxRate,
  businessSettings,
  locationName,
  locationAddress,
  locationPhone,
  organizationId,
  locationId,
  onScheduleNext,
  rebookCompleted = false,
}: CheckoutSummarySheetProps) {
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>('');
  const [rebooked, setRebooked] = useState<boolean>(false);
  const [appliedPromo, setAppliedPromo] = useState<PromoValidationResult | null>(null);
  const { formatCurrency, currency } = useFormatCurrency();
  const { formatDate: formatDateLocale } = useFormatDate();
  const queryClient = useQueryClient();

  // B3: Query org's real afterpay + surcharge settings
  const { data: orgAfterpaySettings } = useQuery({
    queryKey: ['org-afterpay-enabled', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('afterpay_enabled, afterpay_surcharge_enabled, afterpay_surcharge_rate')
        .eq('id', organizationId!)
        .maybeSingle();
      if (error) throw error;
      return {
        enabled: data?.afterpay_enabled ?? false,
        surchargeEnabled: data?.afterpay_surcharge_enabled ?? false,
        surchargeRate: Number(data?.afterpay_surcharge_rate ?? 0.06),
      };
    },
    enabled: !!organizationId,
  });
  const orgAfterpayEnabled = orgAfterpaySettings?.enabled ?? false;
  const orgSurchargeEnabled = orgAfterpaySettings?.surchargeEnabled ?? false;
  const orgSurchargeRate = orgAfterpaySettings?.surchargeRate ?? 0.06;

  // Receipt branding hooks
  const { data: receiptConfig } = useReceiptConfig();
  const socialLinks = useSocialLinks();
  const { data: reviewSettings } = useReviewThresholdSettings();
  const orgName = useBusinessName();

  type GatePhase = 'gate' | 'checkout';
  const [gatePhase, setGatePhase] = useState<GatePhase>('gate');
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState<string>('');
  const [declineOtherText, setDeclineOtherText] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('cash');
  const logDeclineReason = useLogRebookDeclineReason();

  // Terminal reader + checkout flow
  const { activeReader, readers, selectedReaderId, selectReader, hasReaders, isLoading: readersLoading } =
    useActiveTerminalReader(organizationId, locationId);
  const terminalFlow = useTerminalCheckoutFlow();
  const { captureDeposit } = useTerminalDeposit();
  useEffect(() => {
    if (open) {
      setGatePhase('gate');
      setDeclineDialogOpen(false);
      setDeclineReason('');
      setDeclineOtherText('');
      setRebooked(false);
      setPaymentMethod('cash');
      terminalFlow.reset();
    }
  }, [open]);

  useEffect(() => {
    if (rebookCompleted && open) {
      setRebooked(true);
      setGatePhase('checkout');
    }
  }, [rebookCompleted, open]);

  const { data: addonEvents = [] } = useQuery({
    queryKey: ['checkout-addon-events', appointment?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_addon_events' as any)
        .select('addon_name, addon_price, addon_cost, status')
        .eq('appointment_id', appointment!.id)
        .eq('status', 'accepted');
      if (error) return [];
      return (data || []) as unknown as { addon_name: string; addon_price: number; addon_cost: number | null; status: string }[];
    },
    enabled: !!appointment?.id && open,
  });

  // Product cost charges (parts_and_labor)
  const { data: usageCharges = [] } = useCheckoutUsageCharges(appointment?.id ?? null);
  const { data: billingSettings } = useColorBarBillingSettings(organizationId);

  const productChargeLabel = billingSettings?.product_charge_label || 'Product Usage';
  const productChargeTaxable = billingSettings?.product_charge_taxable ?? true;

  // Filter to approved/pending charges — both product_cost and overage
  const productCostCharges = usageCharges.filter(
    (c) => c.charge_type === 'product_cost' && c.status !== 'waived'
  );
  const overageCharges = usageCharges.filter(
    (c) => c.charge_type === 'overage' && c.status !== 'waived'
  );
  const productChargeTotal = productCostCharges.reduce((s, c) => s + c.charge_amount, 0);
  const overageChargeTotal = overageCharges.reduce((s, c) => s + c.charge_amount, 0);
  const allUsageChargeTotal = productChargeTotal + overageChargeTotal;

  if (!appointment) return null;

  const addonTotal = addonEvents.reduce((sum, e) => sum + (e.addon_price || 0), 0);
  const subtotal = (appointment.total_price || 0);
  const discount = appliedPromo?.calculated_discount || 0;
  // Product charges and add-ons are NOT discountable — kept separate from promo subtotal
  const discountedSubtotal = subtotal - discount;
  // Tax base: discounted service subtotal + add-ons + usage charges (if taxable)
  // Note: productChargeTaxable controls tax on ALL usage charges (both product_cost and overage).
  // If separate tax treatment is needed per charge type, add an overage_charge_taxable setting.
  const taxableBase = discountedSubtotal + addonTotal + (productChargeTaxable ? allUsageChargeTotal : 0);
  const tax = taxableBase * taxRate;
  const checkoutTotal = discountedSubtotal + addonTotal + allUsageChargeTotal + tax;
  
  // E2: Deposit deduction — if a deposit was collected and held, deduct from amount due
  const depositHeld = appointment.deposit_status === 'held' && appointment.deposit_amount
    ? appointment.deposit_amount
    : 0;
  const amountDueAfterDeposit = Math.max(0, checkoutTotal + tipAmount - depositHeld);
  const grandTotal = checkoutTotal + tipAmount;

  const getDuration = () => {
    try {
      const start = parseISO(`${appointment.appointment_date}T${appointment.start_time}`);
      const end = parseISO(`${appointment.appointment_date}T${appointment.end_time}`);
      const mins = differenceInMinutes(end, start);
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      if (hours > 0 && remainingMins > 0) {
        return `${hours}h ${remainingMins}min`;
      } else if (hours > 0) {
        return `${hours}h`;
      }
      return `${mins} min`;
    } catch {
      return '';
    }
  };

  const copyPhone = () => {
    if (appointment.client_phone) {
      navigator.clipboard.writeText(appointment.client_phone);
      toast.success('Phone copied');
    }
  };

  const formatDate = () => {
    try {
      return formatDateLocale(parseISO(appointment.appointment_date), 'EEEE, MMMM d, yyyy');
    } catch {
      return appointment.appointment_date;
    }
  };

  const formatTime = () => {
    try {
      const start = parseISO(`${appointment.appointment_date}T${appointment.start_time}`);
      return formatDateLocale(start, 'h:mm a');
    } catch {
      return appointment.start_time;
    }
  };

  const stylistName = appointment.stylist_profile?.display_name || 
                      appointment.stylist_profile?.full_name || 
                      'Staff';

  const handleTipPreset = (multiplier: number) => {
    const calculatedTip = Math.round(subtotal * multiplier * 100) / 100;
    setTipAmount(calculatedTip);
    setCustomTip('');
  };

  const handleCustomTipChange = (value: string) => {
    setCustomTip(value);
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed >= 0) {
      setTipAmount(Math.round(parsed * 100) / 100);
    } else if (value === '') {
      setTipAmount(0);
    }
  };

  const buildBusinessInfo = (): ReceiptBusinessInfo => {
    const logoUrl = businessSettings?.logo_light_url || businessSettings?.logo_dark_url || null;
    const iconUrl = businessSettings?.icon_light_url || businessSettings?.icon_dark_url || null;
    const addressParts = [businessSettings?.mailing_address, businessSettings?.city, businessSettings?.state, businessSettings?.zip].filter(Boolean);
    return {
      logoUrl,
      iconUrl,
      address: addressParts.join(', '),
      phone: businessSettings?.phone || null,
      website: businessSettings?.website || null,
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
  };

  const buildCheckoutReceiptData = () => {
    return checkoutToReceiptData({
      appointment,
      stylistName,
      addonEvents,
      productCostCharges,
      overageCharges,
      subtotal,
      discount,
      discountLabel: appliedPromo?.promotion?.name,
      taxAmount: tax,
      tipAmount,
      grandTotal,
      paymentMethod,
    });
  };

  const handlePrintReceipt = () => {
    const data = buildCheckoutReceiptData();
    printReceiptFromData(data, formatCurrency, orgName, receiptConfig, buildBusinessInfo());
  };

  const handleEmailReceipt = async () => {
    const clientEmail = (appointment as any).client_email;
    if (!clientEmail) {
      toast.error('No email on file for this client');
      return;
    }
    try {
      const data = buildCheckoutReceiptData();
      const html = buildReceiptHtml(data, formatCurrency, orgName, receiptConfig, buildBusinessInfo());
      const { error } = await supabase.functions.invoke('send-receipt', {
        body: {
          method: 'email',
          recipient: clientEmail,
          receiptHtml: html,
          orgName,
        },
      });
      if (error) throw error;
      toast.success(`Receipt emailed to ${clientEmail}`);
    } catch (err) {
      console.error('Failed to email receipt:', err);
      toast.error('Failed to send receipt email');
    }
  };


  const handleConfirm = async () => {
    const finalReason = declineReason === 'Other' ? declineOtherText.trim() : declineReason;

    // If card reader selected, run terminal checkout flow
    if (paymentMethod === 'card_reader' && activeReader && organizationId && appointment) {
      try {
        // G5: Include tip as a line item so reader display total matches grandTotal
        const lineItems = [
          {
            description: appointment.service_name || 'Service',
            amount: Math.round((appointment.total_price || 0) * 100),
            quantity: 1,
          },
          ...addonEvents.map((e) => ({
            description: e.addon_name,
            amount: Math.round(e.addon_price * 100),
            quantity: 1,
          })),
        ];

        // Add tip as a visible line item on the reader if present
        if (tipAmount > 0) {
          lineItems.push({
            description: 'Tip',
            amount: Math.round(tipAmount * 100),
            quantity: 1,
          });
        }

        const result = await terminalFlow.startCheckout({
          organizationId,
          readerId: activeReader.id,
          amount: Math.round(amountDueAfterDeposit * 100), // Charge only remaining after deposit
          tipAmount: Math.round(tipAmount * 100),
          appointmentId: appointment.id,
          lineItems,
          tax: Math.round(tax * 100),
        });

        // E2: Auto-capture held deposit after successful card payment
        // G2: Wrap in try/catch with expired-hold fallback
        if (depositHeld > 0 && appointment.deposit_stripe_payment_id && organizationId) {
          try {
            await captureDeposit(organizationId, appointment.deposit_stripe_payment_id);
          } catch (e) {
            console.error('Failed to capture deposit (payment still succeeded):', e);
            toast.warning('Deposit hold may have expired', {
              description: 'The pre-authorized deposit could not be captured. The full service amount was charged instead.',
            });
          }
        }

        onConfirm(tipAmount, rebooked, appliedPromo, rebooked ? undefined : finalReason || undefined, {
          method: 'card_reader',
          stripe_payment_intent_id: result.paymentIntentId,
        });
      } catch {
        // Error handled in hook — don't close sheet
        return;
      }
    } else {
      // Cash or Other — behave as before
      // E2: Auto-capture deposit for non-card payments too
      // G2: Wrap in try/catch with expired-hold fallback
      if (depositHeld > 0 && appointment.deposit_stripe_payment_id && organizationId) {
        try {
          await captureDeposit(organizationId, appointment.deposit_stripe_payment_id);
        } catch (e) {
          console.error('Failed to capture deposit:', e);
          toast.warning('Deposit hold may have expired', {
            description: 'The pre-authorized deposit could not be captured. Please collect the deposit separately if needed.',
          });
        }
      }
      onConfirm(tipAmount, rebooked, appliedPromo, rebooked ? undefined : finalReason || undefined, {
        method: paymentMethod,
      });
    }

  // Reset state for next use
    setTipAmount(0);
    setCustomTip('');
    setRebooked(false);
    setAppliedPromo(null);
    setGatePhase('gate');
    setDeclineReason('');
    setDeclineOtherText('');
    setDeclineDialogOpen(false);
    setPaymentMethod('cash');
    terminalFlow.reset();
  };

  const handleDeclineDialogConfirm = async (
    code: RebookDeclineReasonCode,
    notes: string | null,
  ) => {
    if (!appointment || !organizationId) return;
    try {
      await logDeclineReason.mutateAsync({
        organizationId,
        appointmentId: appointment.id,
        reasonCode: code,
        reasonNotes: notes,
        locationId: locationId ?? null,
        clientId: (appointment as any).client_id ?? appointment.phorest_client_id ?? null,
        // Wave 21.1 — resolve staff via the canonical PhorestAppointment field
        // (stylist_user_id), with stylist_profile fallback for safety.
        staffId:
          appointment.stylist_user_id ??
          (appointment.stylist_profile as any)?.id ??
          null,
      });
    } catch (e) {
      console.error('Failed to log decline reason', e);
      toast.error('Could not save reason — please try again');
      return;
    }
    // Persist label for the legacy onConfirm path (writes to phorest appointment)
    const label = notes ? `${getReasonLabel(code)}: ${notes}` : getReasonLabel(code);
    setDeclineReason(label);
    setDeclineOtherText('');
    setRebooked(false);
    setDeclineDialogOpen(false);
    setGatePhase('checkout');
  };

  const handleScheduleNextClick = () => {
    if (onScheduleNext && appointment) {
      onScheduleNext(appointment);
    }
  };

  // Wave 21.1 — Intercept close attempts during the rebook gate.
  // Force decline-reason capture before allowing dismissal (structural enforcement).
  const handleOpenChange = (next: boolean) => {
    if (!next && open && gatePhase === 'gate' && !rebooked && appointment) {
      setDeclineDialogOpen(true);
      return;
    }
    onOpenChange(next);
  };

  return (
    <PremiumFloatingPanel open={open} onOpenChange={handleOpenChange} maxWidth="560px">
      <div className="p-5 pb-3 border-b border-border/40">
        <h2 className="font-display text-sm tracking-wide uppercase flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Checkout Summary
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-5">
          {/* Client Info */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Client</h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="font-medium text-lg">
                {appointment.client_name || 'Walk-in'}
              </p>
              {appointment.client_phone && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {appointment.client_phone}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={copyPhone}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Service Details */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Service Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium text-right max-w-[60%]">
                  {appointment.service_name || 'Service'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stylist</span>
                <span className="font-medium">{stylistName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{formatDate()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">{formatTime()}</span>
              </div>
              {getDuration() && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{getDuration()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Add-On Breakdown */}
          {addonEvents.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Add-Ons
                </h3>
                <div className="space-y-1.5">
                  {addonEvents.map((event, idx) => {
                    const margin = event.addon_cost != null && event.addon_price > 0
                      ? Math.round(((event.addon_price - event.addon_cost) / event.addon_price) * 100)
                      : null;
                    return (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span>{event.addon_name}</span>
                          {margin != null && (
                            <span className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                              margin >= 50 ? 'text-emerald-600 bg-emerald-500/10' :
                              margin >= 30 ? 'text-amber-600 bg-amber-500/10' :
                              'text-red-600 bg-red-500/10'
                            )}>
                              {margin}%
                            </span>
                          )}
                        </div>
                        <span className="font-medium">{formatCurrency(event.addon_price)}</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between text-sm pt-1 border-t border-border/50">
                    <span className="text-muted-foreground">Add-On Subtotal</span>
                    <span className="font-medium">{formatCurrency(addonTotal)}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Product Usage Charges (parts_and_labor) */}
          {productCostCharges.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <FlaskConical className="h-3.5 w-3.5" />
                  {productChargeLabel}
                </h3>
                <div className="space-y-1.5">
                  {productCostCharges.map((charge, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span>{charge.service_name ?? 'Product'}</span>
                      <span className="font-medium tabular-nums">{formatCurrency(charge.charge_amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm pt-1 border-t border-border/50">
                    <span className="text-muted-foreground">{productChargeLabel} Total</span>
                    <span className="font-medium">{formatCurrency(productChargeTotal)}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Pricing Summary */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Payment Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              
              {/* Promo Code Section */}
              {organizationId && (
                <div className="py-2">
                  <PromoCodeInput
                    organizationId={organizationId}
                    subtotal={subtotal}
                    clientId={appointment.phorest_client_id}
                    onPromoApplied={setAppliedPromo}
                    appliedPromo={appliedPromo}
                  />
                </div>
              )}

              {/* Discount Display */}
              {appliedPromo && (
                <div className="flex justify-between text-emerald-600">
                  <span className="flex items-center gap-1">
                    Discount 
                    <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                      {appliedPromo.promotion?.name}
                    </span>
                  </span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}

              {/* Product charges (non-discountable, shown after promo) */}
              {productChargeTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{productChargeLabel}</span>
                  <span className="font-medium">{formatCurrency(productChargeTotal)}</span>
                </div>
              )}

              {/* Overage charges (allowance-mode, non-discountable) */}
              {overageChargeTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Additional Product Usage</span>
                  <span className="font-medium">{formatCurrency(overageChargeTotal)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({(taxRate * 100).toFixed(1)}%)</span>
                <span className="font-medium">{formatCurrency(tax)}</span>
              </div>
              
              <div className="flex justify-between text-lg font-bold border-t border-border/50 pt-2">
                <span>Checkout Total</span>
                <span>{formatCurrency(checkoutTotal)}</span>
              </div>
            </div>
          </div>

          {/* Rebooking Gate UI */}
          {gatePhase !== 'checkout' ? (
            <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
              <div className="bg-primary/5 p-4 border-b border-border/50">
                <h3 className="font-medium flex items-center gap-2 text-primary">
                  <CalendarPlus className="h-4 w-4" />
                  Next Visit Recommendation
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Book the next appointment in seconds
                </p>
              </div>
              
              <div className="p-4 space-y-4">
                {gatePhase === 'gate' && (
                  <NextVisitRecommendation
                    serviceName={appointment.service_name}
                    serviceCategory={appointment.service_category}
                    appointmentDate={appointment.appointment_date}
                    appointmentStartTime={appointment.start_time}
                    onBookInterval={(interval: RebookInterval) => {
                      // Wave 21.1 — pass chosen interval upward so the booking
                      // popover can pre-select the date. Optimistically advance
                      // gate → checkout so staff aren't stuck if the parent
                      // schedule flow is cancelled (rebookCompleted prop will
                      // confirm the boolean asynchronously when booking lands).
                      if (onScheduleNext && appointment) {
                        onScheduleNext(appointment, interval);
                        setRebooked(true);
                        setGatePhase('checkout');
                      }
                    }}
                    onScheduleManually={handleScheduleNextClick}
                    onDecline={() => setDeclineDialogOpen(true)}
                  />
                )}
              </div>
            </div>
          ) : (
            /* Tip Selection - Only shown in checkout phase */
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    Add Tip
                  </h3>
                  {rebooked && (
                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200 gap-1">
                      <CalendarCheck className="h-3 w-3" />
                      Rebooked
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  {TIP_PRESETS.map((preset) => (
                    <Button
                      key={preset.label}
                      variant={Math.abs(tipAmount - Number((subtotal * preset.multiplier).toFixed(2))) < 0.01 ? "default" : "outline"}
                      className="text-xs h-9"
                      onClick={() => handleTipPreset(preset.multiplier)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={customTip}
                    onChange={(e) => handleCustomTipChange(e.target.value)}
                    placeholder="Custom tip amount"
                    className="pl-6"
                  />
                </div>

                {tipAmount > 0 && (
                  <div className="flex justify-between text-sm bg-muted/30 p-2 rounded">
                    <span>Tip Amount:</span>
                    <span className="font-medium">{formatCurrency(tipAmount)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {gatePhase === 'checkout' && (
        <div className="p-5 pt-0 space-y-3 border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {/* Payment Method Selector */}
          <div className="space-y-2 pt-2">
            <Label className="text-xs text-muted-foreground">Payment Method</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'card_reader' as const, label: 'Card', icon: CreditCard, disabled: !hasReaders },
                { value: 'cash' as const, label: 'Cash', icon: Banknote, disabled: false },
                { value: 'other' as const, label: 'Other', icon: Wallet, disabled: false },
              ].map((m) => (
                <button
                  key={m.value}
                  type="button"
                  disabled={m.disabled}
                  onClick={() => setPaymentMethod(m.value)}
                  className={cn(
                    'flex items-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-colors',
                    paymentMethod === m.value
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted/50',
                    m.disabled && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <m.icon className="h-4 w-4" />
                  {m.label}
                </button>
              ))}
            </div>

            {/* Send Payment Link (Afterpay) — B3: use org's real afterpay_enabled, G3: wire onPaymentLinkSent */}
            {organizationId && appointment && (
              <div className="pt-1">
                <SendToPayButton
                  appointmentId={appointment.id}
                  organizationId={organizationId}
                  totalAmountCents={Math.round((appointment.total_price || 0) * 100)}
                  clientName={appointment.client_name}
                  clientEmail={appointment.client_email}
                  clientPhone={appointment.client_phone}
                  phorestClientId={appointment.phorest_client_id}
                  afterpayEnabled={orgAfterpayEnabled}
                  afterpaySurchargeEnabled={orgSurchargeEnabled}
                  afterpaySurchargeRate={orgSurchargeRate}
                  disabled={isUpdating}
                  onPaymentLinkSent={() => {
                    queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
                  }}
                />
                {/* Surcharge preview — only when both afterpay + surcharge enabled */}
                {orgAfterpayEnabled && orgSurchargeEnabled && (
                  <div className="mt-2">
                    <AfterpaySurchargePreview
                      amountCents={Math.round((appointment.total_price || 0) * 100)}
                      surchargeRate={orgSurchargeRate}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Reader selector (only when Card is selected and multiple readers) */}
            {paymentMethod === 'card_reader' && hasReaders && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Wifi className="h-3 w-3 text-emerald-500" />
                {readers.length > 1 ? (
                  <Select value={selectedReaderId || ''} onValueChange={selectReader}>
                    <SelectTrigger className="h-7 text-xs w-auto">
                      <SelectValue placeholder="Select reader" />
                    </SelectTrigger>
                    <SelectContent>
                      {readers.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.label || r.id.slice(-8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span>{activeReader?.label || 'Reader connected'}</span>
                )}
              </div>
            )}
          </div>

          {/* Terminal flow status */}
          {paymentMethod === 'card_reader' && terminalFlow.flowState !== 'idle' && (
            <div className={cn(
              'flex items-center gap-2 p-3 rounded-lg text-sm',
              terminalFlow.flowState === 'succeeded' && 'bg-emerald-500/10 text-emerald-700',
              terminalFlow.flowState === 'failed' && 'bg-destructive/10 text-destructive',
              !['succeeded', 'failed'].includes(terminalFlow.flowState) && 'bg-primary/5 text-primary',
            )}>
              {!['succeeded', 'failed', 'cancelled'].includes(terminalFlow.flowState) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {terminalFlow.flowState === 'succeeded' && <CheckCircle2 className="h-4 w-4" />}
              {terminalFlow.flowState === 'failed' && <XCircle className="h-4 w-4" />}
              <span>{terminalFlow.stateLabel}</span>
              {terminalFlow.error && terminalFlow.flowState === 'failed' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 text-xs"
                  onClick={() => terminalFlow.reset()}
                >
                  Retry
                </Button>
              )}
            </div>
          )}

          <div className="flex justify-between items-center py-2">
            <span className="font-medium text-muted-foreground">Total Charge</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(grandTotal)}</span>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={handlePrintReceipt}
              className="w-full"
            >
              <Receipt className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              onClick={handleEmailReceipt}
              className="w-full"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
            {paymentMethod === 'card_reader' && ['awaiting_tap', 'processing', 'displaying_cart'].includes(terminalFlow.flowState) ? (
              <Button
                variant="destructive"
                onClick={() => activeReader && organizationId && terminalFlow.cancelCheckout(activeReader.id, organizationId)}
                className="w-full"
                size="lg"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            ) : (
              <Button 
                onClick={handleConfirm} 
                disabled={isUpdating || (paymentMethod === 'card_reader' && !activeReader) || ['creating_intent', 'displaying_cart', 'awaiting_tap', 'processing'].includes(terminalFlow.flowState)}
                className="w-full font-medium shadow-lg shadow-primary/20"
                size="lg"
              >
                {isUpdating || ['creating_intent', 'displaying_cart', 'awaiting_tap', 'processing'].includes(terminalFlow.flowState) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing…
                  </>
                ) : paymentMethod === 'card_reader' ? (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Charge {formatCurrency(grandTotal)}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Complete
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
      <RebookDeclineReasonDialog
        open={declineDialogOpen}
        isSubmitting={logDeclineReason.isPending}
        onConfirm={handleDeclineDialogConfirm}
        onBack={() => setDeclineDialogOpen(false)}
      />
    </PremiumFloatingPanel>
  );
}
