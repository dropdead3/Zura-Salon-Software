import { useState, useEffect, useMemo, useRef } from 'react';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Copy, CreditCard, Info, Receipt, Download, Eye, DollarSign, CalendarCheck, Sparkles, CalendarPlus, XCircle, ChevronDown, MessageSquare, CheckCircle2, FlaskConical, Banknote, Wallet, Loader2, Wifi, Mail, Send, AlertTriangle, GitCompare, TrendingDown, Smartphone, Tablet } from 'lucide-react';
import { TogglePill } from '@/components/ui/toggle-pill';
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
import { useCheckoutCart, computeLineNet, computeLineDiscountAmount } from '@/hooks/useCheckoutCart';
import { CheckoutLineItems } from '@/components/dashboard/schedule/checkout/CheckoutLineItems';
import { AddServiceDialog } from '@/components/dashboard/schedule/checkout/AddServiceDialog';
import { CartDiscountSection, type ManagerOrderDiscount } from '@/components/dashboard/schedule/checkout/CartDiscountSection';
import { usePermission } from '@/hooks/usePermission';
import { useLogAuditEvent } from '@/hooks/useAppointmentAuditLog';
import { AUDIT_EVENTS } from '@/lib/audit-event-types';
import { useStylistSkipRate } from '@/hooks/useStylistSkipRate';
import { PolicyDisclosure } from '@/components/policy/PolicyDisclosure';

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

  type GatePhase = 'gate' | 'checkout' | 'confirmation';
  const [gatePhase, setGatePhase] = useState<GatePhase>('gate');
  const rebookGateRef = useRef<HTMLDivElement | null>(null);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState<string>('');
  const [declineOtherText, setDeclineOtherText] = useState<string>('');
  // Wave 21.2 — local receipt of skipped-rebook for the muted confirmation line
  const [declinedReason, setDeclinedReason] = useState<{
    code: RebookDeclineReasonCode;
    notes: string | null;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('cash');
  // Wave 23 — tip mode persisted per location (operator preference)
  const tipModeStorageKey = locationId ? `zura_tip_mode_${locationId}` : null;
  const [tipMode, setTipMode] = useState<'app' | 'reader'>(() => {
    if (!tipModeStorageKey) return 'app';
    try {
      return (localStorage.getItem(tipModeStorageKey) as 'app' | 'reader') || 'app';
    } catch {
      return 'app';
    }
  });
  // Wave 22 — post-charge confirmation state
  const [successState, setSuccessState] = useState<{
    amount: number;
    method: CheckoutPaymentMethod;
    receiptStatus: 'sent' | 'pending' | 'none';
  } | null>(null);
  const logDeclineReason = useLogRebookDeclineReason();

  // Terminal reader + checkout flow
  const { activeReader, readers, selectedReaderId, selectReader, hasReaders, isLoading: readersLoading } =
    useActiveTerminalReader(organizationId, locationId);
  const terminalFlow = useTerminalCheckoutFlow();

  // Wave 22.1 — Pre-checkout Connect status guard. Surfaces a clear advisory
  // when the location's Stripe Connect account isn't active, before the operator
  // taps Charge and hits a backend error.
  const { data: locationStripeStatus } = useQuery({
    queryKey: ['location-stripe-status', locationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('locations')
        .select('stripe_status, stripe_payments_enabled')
        .eq('id', locationId!)
        .maybeSingle();
      return data as { stripe_status: string | null; stripe_payments_enabled: boolean | null } | null;
    },
    enabled: !!locationId && open,
    staleTime: 60_000,
  });
  const stripeConnectActive =
    locationStripeStatus?.stripe_status === 'active' &&
    locationStripeStatus?.stripe_payments_enabled === true;
  const { captureDeposit } = useTerminalDeposit();
  useEffect(() => {
    if (open) {
      setGatePhase('gate');
      setDeclineDialogOpen(false);
      setDeclineReason('');
      setDeclineOtherText('');
      setDeclinedReason(null);
      setRebooked(false);
      setPaymentMethod('cash');
      setSuccessState(null);
      terminalFlow.reset();
    }
  }, [open]);

  // Persist tipMode per location
  useEffect(() => {
    if (!tipModeStorageKey) return;
    try { localStorage.setItem(tipModeStorageKey, tipMode); } catch { /* noop */ }
  }, [tipMode, tipModeStorageKey]);

  // Auto-dismiss the confirmation panel after 4s
  useEffect(() => {
    if (gatePhase !== 'confirmation') return;
    const timer = setTimeout(() => onOpenChange(false), 4000);
    return () => clearTimeout(timer);
  }, [gatePhase, onOpenChange]);

  useEffect(() => {
    if (rebookCompleted && open) {
      setRebooked(true);
      setGatePhase('checkout');
    }
  }, [rebookCompleted, open]);

  // Wave 21.3 Layer 1 — Audit-log rehydration so the "skipped" receipt
  // persists across sheet remounts (close/reopen mid-checkout).
  const { data: priorDecline } = useQuery({
    queryKey: ['rebook-decline-receipt', appointment?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('appointment_audit_log')
        .select('metadata, created_at')
        .eq('appointment_id', appointment!.id)
        .eq('event_type', AUDIT_EVENTS.REBOOK_DECLINED)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!appointment?.id && open,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (priorDecline?.metadata && !declinedReason) {
      const meta = priorDecline.metadata as { reason_code?: string; reason_notes?: string | null };
      if (meta.reason_code) {
        setDeclinedReason({
          code: meta.reason_code as RebookDeclineReasonCode,
          notes: meta.reason_notes ?? null,
        });
        // Skip the warning block on remount — operator already captured a reason
        setGatePhase('checkout');
      }
    }
  }, [priorDecline, declinedReason]);

  // Wave 21.3 Layer 3 — Inline coaching nudge when stylist's 30-day skip rate
  // breaches the elevated threshold. Honors visibility contract: returns null
  // for healthy operators or insufficient sample.
  const { data: skipRateSignal } = useStylistSkipRate(
    appointment?.stylist_user_id ?? null,
    locationId ?? null,
  );

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

  const productCostCharges = usageCharges.filter(
    (c) => c.charge_type === 'product_cost' && c.status !== 'waived'
  );
  const overageCharges = usageCharges.filter(
    (c) => c.charge_type === 'overage' && c.status !== 'waived'
  );
  const productChargeTotal = productCostCharges.reduce((s, c) => s + c.charge_amount, 0);
  const overageChargeTotal = overageCharges.reduce((s, c) => s + c.charge_amount, 0);
  const allUsageChargeTotal = productChargeTotal + overageChargeTotal;

  // ─── Wave 1: Catalog price resolver ───────────────────────────────
  // When `appointment.total_price` is missing/0, fall back to the catalog
  // (location override → org default). Phorest stamps price only at settlement;
  // this prevents $0 checkouts pre-settle.
  const needsCatalogResolve =
    !!appointment && (appointment.total_price == null || appointment.total_price === 0);

  const { data: catalogPrice } = useQuery({
    queryKey: ['catalog-price-resolver', appointment?.service_name, organizationId, locationId],
    queryFn: async () => {
      if (!appointment?.service_name || !organizationId) return null;
      const { data: services, error } = await supabase
        .from('services')
        .select('id, name, price, location_id')
        .eq('organization_id', organizationId)
        .eq('name', appointment.service_name)
        .eq('is_active', true);
      if (error || !services?.length) return null;
      if (locationId) {
        const locMatch = services.find((s) => s.location_id === locationId);
        if (locMatch) {
          const { data: spLoc } = await supabase
            .from('service_location_prices')
            .select('price')
            .eq('service_id', locMatch.id)
            .eq('location_id', locationId)
            .maybeSingle();
          if (spLoc?.price != null) {
            return { serviceId: locMatch.id, price: Number(spLoc.price), source: 'location-override' as const };
          }
          if (locMatch.price != null) {
            return { serviceId: locMatch.id, price: Number(locMatch.price), source: 'catalog' as const };
          }
        }
      }
      const orgDefault = services.find((s) => s.location_id == null) ?? services[0];
      if (orgDefault?.price != null) {
        return { serviceId: orgDefault.id, price: Number(orgDefault.price), source: 'catalog' as const };
      }
      return { serviceId: orgDefault?.id ?? null, price: 0, source: 'unset' as const };
    },
    enabled: needsCatalogResolve && open && !!organizationId,
    staleTime: 60_000,
  });

  // ─── Wave 2: Editable line-item cart ──────────────────────────────
  const seedLines = useMemo(() => {
    if (!appointment) return null;
    const posPrice = appointment.total_price;
    const hasPos = posPrice != null && posPrice > 0;
    const resolved = hasPos
      ? { price: Number(posPrice), source: 'pos' as const, serviceId: null as string | null }
      : catalogPrice
      ? { price: catalogPrice.price, source: catalogPrice.source, serviceId: catalogPrice.serviceId }
      : null;
    if (!resolved) return null;
    return [
      {
        serviceName: appointment.service_name || 'Service',
        serviceId: resolved.serviceId,
        staffId: appointment.stylist_user_id ?? null,
        unitPrice: resolved.price,
        priceSource: resolved.source,
      },
    ];
  }, [appointment, catalogPrice]);

  const cart = useCheckoutCart({
    seedLines,
    seedKey: appointment && seedLines !== null ? appointment.id : null,
  });

  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [orderDiscount, setOrderDiscount] = useState<ManagerOrderDiscount | null>(null);

  // Permissions — stylists ≤20% line discount; managers can override prices + waive
  const { can } = usePermission();
  const canOverridePrice = can('checkout.override_price') || can('checkout.manage');
  const canWaive = canOverridePrice;
  const maxDiscountPercent = canOverridePrice ? 100 : 20;

  const logAudit = useLogAuditEvent();

  if (!appointment) return null;

  const addonTotal = addonEvents.reduce((sum, e) => sum + (e.addon_price || 0), 0);

  // Totals derive from the editable cart, not from appointment.total_price
  const subtotal = cart.subtotal;
  const lineDiscountTotal = cart.lineDiscountTotal;
  const netServiceSubtotal = cart.netSubtotal;
  const promoDiscount = appliedPromo?.calculated_discount || 0;
  const orderDiscountAmount = orderDiscount
    ? orderDiscount.type === 'pct'
      ? netServiceSubtotal * (orderDiscount.value / 100)
      : orderDiscount.value
    : 0;
  const discountedServiceSubtotal = Math.max(0, netServiceSubtotal - promoDiscount - orderDiscountAmount);
  const discount = promoDiscount; // backwards-compat for receiptData

  const taxableBase = discountedServiceSubtotal + addonTotal + (productChargeTaxable ? allUsageChargeTotal : 0);
  const tax = taxableBase * taxRate;
  const checkoutTotal = discountedServiceSubtotal + addonTotal + allUsageChargeTotal + tax;

  const depositHeld = appointment.deposit_status === 'held' && appointment.deposit_amount
    ? appointment.deposit_amount
    : 0;
  const amountDueAfterDeposit = Math.max(0, checkoutTotal + tipAmount - depositHeld);
  const grandTotal = checkoutTotal + tipAmount;

  // Charge-gating: never auto-charge $0 or unresolvable price
  const chargeBlocked = cart.lines.length === 0 || cart.hasUnsetPrice || subtotal === 0;

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
        const lineItems = [
          ...cart.lines.map((l) => ({
            description: l.name,
            amount: Math.round(computeLineNet(l) * 100),
            quantity: l.quantity,
          })),
          ...addonEvents.map((e) => ({
            description: e.addon_name,
            amount: Math.round(e.addon_price * 100),
            quantity: 1,
          })),
        ];

        // Add tip as a visible line item only when in 'app' tip mode
        if (tipMode === 'app' && tipAmount > 0) {
          lineItems.push({
            description: 'Tip',
            amount: Math.round(tipAmount * 100),
            quantity: 1,
          });
        }

        const result = await terminalFlow.startCheckout({
          organizationId,
          readerId: activeReader.id,
          amount: Math.round(amountDueAfterDeposit * 100),
          tipAmount: Math.round(tipAmount * 100),
          appointmentId: appointment.id,
          lineItems,
          tax: Math.round(tax * 100),
          tipMode,
        });

        // Reflect on-reader tip back into the local total for receipts/audit
        const finalTipDollars = result.tipAmount / 100;
        if (tipMode === 'reader') setTipAmount(finalTipDollars);

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

        onConfirm(finalTipDollars, rebooked, appliedPromo, rebooked ? undefined : finalReason || undefined, {
          method: 'card_reader',
          stripe_payment_intent_id: result.paymentIntentId,
        });

        // Wave 22 — surface confirmation panel instead of immediate close
        setSuccessState({
          amount: result.amount / 100,
          method: 'card_reader',
          receiptStatus: appointment.client_email ? 'sent' : 'none',
        });
        setGatePhase('confirmation');
      } catch {
        return;
      }
    } else {
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

      setSuccessState({
        amount: grandTotal,
        method: paymentMethod,
        receiptStatus: 'none',
      });
      setGatePhase('confirmation');
    }
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
    setDeclinedReason({ code, notes });
    setRebooked(false);
    setDeclineDialogOpen(false);
    setGatePhase('checkout');
  };

  const handleScheduleNextClick = () => {
    if (onScheduleNext && appointment) {
      onScheduleNext(appointment);
    }
  };

  // Wave 21.4 — Allow free dismissal during the rebook gate.
  // The Charge button is already gated to gatePhase === 'checkout', so closing
  // the sheet cannot bypass skip-reason capture for actual settlement. Misclicks
  // (wrong appointment, accidental open) must exit cleanly without forced capture.
  const handleOpenChange = (next: boolean) => {
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

      {/* Wave 22 — Post-charge confirmation panel.
          Replaces immediate sheet close with a calm 4-second confirmation so the
          operator sees proof of settlement before the surface disappears. */}
      {gatePhase === 'confirmation' && successState && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col items-center justify-center text-center p-10 space-y-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-9 w-9 text-success" />
            </div>
            <div className="space-y-1">
              <p className="font-display text-base tracking-wide uppercase">
                Paid {formatCurrency(successState.amount)}
              </p>
              <p className="font-sans text-xs text-muted-foreground">
                {successState.method === 'card_reader'
                  ? 'Card · Terminal'
                  : successState.method === 'cash'
                    ? 'Cash'
                    : 'Other tender'}
                {appointment?.client_name ? ` · ${appointment.client_name}` : ''}
              </p>
            </div>
            <div className="font-sans text-xs">
              {successState.receiptStatus === 'sent' && appointment?.client_email && (
                <span className="inline-flex items-center gap-1.5 text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Receipt emailed to {appointment.client_email}
                </span>
              )}
              {successState.receiptStatus !== 'sent' && (
                <button
                  type="button"
                  onClick={handleEmailReceipt}
                  className="text-primary hover:underline inline-flex items-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Send receipt
                </button>
              )}
            </div>
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className={tokens.button.cardAction}
            >
              Done
            </Button>
            <p className="font-sans text-[10px] text-muted-foreground/70">
              This panel closes automatically.
            </p>
          </div>
        </div>
      )}

      {gatePhase !== 'confirmation' && (
      <div className="flex-1 overflow-y-auto">{/* checkout body wrapper */}
        <div className="space-y-6 p-5">
          {/* Rebooking Gate UI — surfaced first so the script is the entry point */}
          {gatePhase === 'gate' && (
            <div ref={rebookGateRef} className="border rounded-xl overflow-hidden bg-card shadow-sm">
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
                <NextVisitRecommendation
                  serviceName={appointment.service_name}
                  serviceCategory={appointment.service_category}
                  appointmentDate={appointment.appointment_date}
                  appointmentStartTime={appointment.start_time}
                  onBookInterval={(interval: RebookInterval) => {
                    if (onScheduleNext && appointment) {
                      supabase
                        .from('appointments')
                        .update({ rebooked_at_weeks: interval.weeks })
                        .eq('id', appointment.id)
                        .then(({ error }) => {
                          if (error) console.error('Failed to record rebooked_at_weeks:', error);
                        });
                      onScheduleNext(appointment, interval);
                      setRebooked(true);
                      setGatePhase('checkout');
                    }
                  }}
                  onScheduleManually={handleScheduleNextClick}
                  onDecline={() => setDeclineDialogOpen(true)}
                />
              </div>
            </div>
          )}

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

          {/* Editable cart — Wave 2 */}
          <CheckoutLineItems
            lines={cart.lines}
            canOverridePrice={canOverridePrice}
            canWaive={canWaive}
            maxDiscountPercent={maxDiscountPercent}
            onAddService={() => setAddServiceOpen(true)}
            onRemove={(id) => {
              const line = cart.lines.find((l) => l.id === id);
              cart.removeLine(id);
              if (line && organizationId) {
                logAudit.mutate({
                  appointmentId: appointment.id,
                  organizationId,
                  eventType: AUDIT_EVENTS.SERVICE_REMOVED_AT_CHECKOUT,
                  previousValue: { name: line.name, unitPrice: line.unitPrice },
                  newValue: null,
                });
              }
            }}
            onQuantityChange={(id, qty) => cart.updateLine(id, { quantity: qty })}
            onPriceChange={(id, unitPrice) => {
              const line = cart.lines.find((l) => l.id === id);
              cart.updateLine(id, { unitPrice });
              if (line && organizationId) {
                logAudit.mutate({
                  appointmentId: appointment.id,
                  organizationId,
                  eventType: AUDIT_EVENTS.LINE_PRICE_OVERRIDDEN,
                  previousValue: { name: line.name, unitPrice: line.unitPrice },
                  newValue: { name: line.name, unitPrice },
                });
              }
            }}
            onApplyDiscount={(id, d) => {
              const line = cart.lines.find((l) => l.id === id);
              cart.applyDiscount(id, d);
              if (line && organizationId) {
                logAudit.mutate({
                  appointmentId: appointment.id,
                  organizationId,
                  eventType: d.type === 'waive' ? AUDIT_EVENTS.LINE_WAIVED : AUDIT_EVENTS.LINE_DISCOUNTED,
                  previousValue: { name: line.name, discount: line.discount },
                  newValue: { name: line.name, discount: d },
                  metadata: { reason: d.reason ?? null },
                });
              }
            }}
            onClearDiscount={(id) => cart.clearDiscount(id)}
          />

          {/* Diff banner — appears when cart differs from original */}
          {cart.diff.total > 0 && (
            <button
              type="button"
              onClick={() => setShowDiff((v) => !v)}
              className="w-full flex items-center justify-between rounded-md border border-warning/40 bg-warning/[0.06] px-3 py-2 text-left transition-colors hover:bg-warning/[0.10]"
            >
              <span className="flex items-center gap-2 text-xs">
                <GitCompare className="h-3.5 w-3.5 text-warning" />
                <span className="font-medium">{cart.diff.total} {cart.diff.total === 1 ? 'change' : 'changes'} from original</span>
              </span>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showDiff && 'rotate-180')} />
            </button>
          )}
          {showDiff && cart.diff.total > 0 && (
            <div className="text-xs text-muted-foreground space-y-1 px-3">
              {cart.diff.added > 0 && <div>+ {cart.diff.added} service{cart.diff.added > 1 ? 's' : ''} added</div>}
              {cart.diff.removed > 0 && <div>− {cart.diff.removed} removed</div>}
              {cart.diff.repriced > 0 && <div>~ {cart.diff.repriced} repriced</div>}
              {cart.diff.discounted > 0 && <div>% {cart.diff.discounted} discounted/waived</div>}
            </div>
          )}

          {/* Add Service Dialog */}
          <AddServiceDialog
            open={addServiceOpen}
            onOpenChange={setAddServiceOpen}
            organizationId={organizationId}
            locationId={locationId}
            onAdd={({ serviceId, name, unitPrice, priceSource }) => {
              cart.addLine({
                type: 'service',
                name,
                serviceId,
                staffId: appointment.stylist_user_id ?? null,
                unitPrice,
                quantity: 1,
                discount: null,
                isOriginal: false,
                priceSource,
              });
              if (organizationId) {
                logAudit.mutate({
                  appointmentId: appointment.id,
                  organizationId,
                  eventType: AUDIT_EVENTS.SERVICE_ADDED_AT_CHECKOUT,
                  previousValue: null,
                  newValue: { name, unitPrice, priceSource },
                });
              }
            }}
          />

          {/* Static appointment metadata (date/time/stylist) */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Appointment</h3>
            <div className="space-y-2 text-sm">
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

              {/* Line-level discounts (waives + per-service discounts) */}
              {lineDiscountTotal > 0 && (
                <div className="flex justify-between text-warning">
                  <span>Service Discounts</span>
                  <span>-{formatCurrency(lineDiscountTotal)}</span>
                </div>
              )}

              {/* Order-level manager discount */}
              {organizationId && (
                <CartDiscountSection
                  baseSubtotal={netServiceSubtotal}
                  current={orderDiscount}
                  canApply={canOverridePrice}
                  onApply={setOrderDiscount}
                  onClear={() => setOrderDiscount(null)}
                />
              )}
              {orderDiscount && orderDiscountAmount > 0 && (
                <div className="flex justify-between text-warning">
                  <span className="flex items-center gap-1">
                    Manager Discount
                    {orderDiscount.reason && (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        · {orderDiscount.reason}
                      </span>
                    )}
                  </span>
                  <span>-{formatCurrency(orderDiscountAmount)}</span>
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

              <div className="flex justify-between text-lg font-medium border-t border-border/50 pt-2">
                <span className={cn(gatePhase === 'gate' && 'text-muted-foreground')}>Checkout Total</span>
                <span className={cn(gatePhase === 'gate' && 'text-muted-foreground')}>{formatCurrency(checkoutTotal)}</span>
              </div>

              {gatePhase === 'gate' && !declinedReason && (
                <div className="rounded-md border border-warning/40 bg-warning/[0.06] p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <CalendarPlus className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-display text-xs tracking-wide text-warning">
                        Rebook Required to Continue Checkout
                      </p>
                      <p className="font-sans text-xs text-muted-foreground">
                        Book the next visit above, or skip with a tracked reason.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 pl-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(tokens.button.inline, 'text-warning hover:text-warning hover:bg-warning/10')}
                      onClick={() => {
                        rebookGateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      Book Next Visit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(tokens.button.inline, 'text-muted-foreground hover:text-foreground')}
                      onClick={() => setDeclineDialogOpen(true)}
                    >
                      Skip Rebook
                    </Button>
                  </div>
                </div>
              )}

              {declinedReason && (() => {
                // Trim "Client declined — " style prefix for a quieter receipt
                const fullLabel = getReasonLabel(declinedReason.code);
                const dashIdx = fullLabel.indexOf('—');
                const shortLabel = dashIdx >= 0 ? fullLabel.slice(dashIdx + 1).trim() : fullLabel;
                const noteSuffix =
                  declinedReason.code === 'other' && declinedReason.notes
                    ? ` · "${declinedReason.notes.slice(0, 40)}${declinedReason.notes.length > 40 ? '…' : ''}"`
                    : '';
                return (
                  <div className="flex items-center gap-2 px-3 py-2 font-sans text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                    <span className="min-w-0 truncate">
                      Rebook skipped — reason: {shortLabel}
                      {noteSuffix} · logged to staff report
                    </span>
                  </div>
                );
              })()}

              {/* Wave 21.3 Layer 3 — Inline coaching nudge for elevated skip rate */}
              {declinedReason && skipRateSignal?.isElevated && (
                <div className="flex items-center gap-2 px-3 pb-2 font-sans text-xs text-warning">
                  <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 truncate">
                    Skip rate this month: {Math.round(skipRateSignal.skipRate)}% — review with stylist
                  </span>
                </div>
              )}

              {cart.hasUnsetPrice && (
                <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/[0.06] p-2 text-xs text-warning">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Price not set on one or more services — verify before charging.</span>
                </div>
              )}
            </div>
          </div>

          {/* Tip Selection - Only shown in checkout phase (gate-phase rebook card moved to top) */}
          {gatePhase === 'checkout' && (
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

                {/* Wave 23 — Tip-on-reader toggle. Only meaningful when paying via card reader.
                    Defaults to 'app' for parity with current behavior; persisted per location. */}
                {paymentMethod === 'card_reader' && hasReaders && (
                  <div className="flex items-center justify-between gap-3 pb-1">
                    <span className="font-sans text-xs text-muted-foreground">Tip captured</span>
                    <TogglePill
                      size="sm"
                      value={tipMode}
                      onChange={(v) => setTipMode(v as 'app' | 'reader')}
                      options={[
                        { value: 'app', label: 'Here', icon: <Tablet className="h-3 w-3" />, tooltip: 'Set tip in this app' },
                        { value: 'reader', label: 'On reader', icon: <Smartphone className="h-3 w-3" />, tooltip: 'Client selects tip on the terminal' },
                      ]}
                    />
                  </div>
                )}

                {/* In-app tip selector — hidden when client will tip on the reader */}
                {!(paymentMethod === 'card_reader' && tipMode === 'reader') && (
                  <>
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
                  </>
                )}

                {paymentMethod === 'card_reader' && tipMode === 'reader' && (
                  <p className="font-sans text-xs text-muted-foreground bg-muted/30 p-2.5 rounded">
                    The client will be prompted to add a tip directly on the reader after tapping or inserting their card.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {gatePhase === 'checkout' && (
        <div className="p-5 pt-0 space-y-3 border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {/* Wave 22.1 — Connect status advisory */}
          {locationId && !stripeConnectActive && (
            <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Card payments unavailable for this location
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Stripe Connect onboarding is incomplete. Cash and Other are still available; complete onboarding to accept card-present and Send-to-Pay charges.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      window.open('/dashboard/admin/settings?category=terminals', '_blank');
                    }}
                  >
                    Complete Setup
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="space-y-2 pt-2">
            <Label className="text-xs text-muted-foreground">Payment Method</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'card_reader' as const, label: 'Card', icon: CreditCard, disabled: !hasReaders || !stripeConnectActive },
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

            {/* Send Payment Link (Afterpay) — uses negotiated cart total. Requires Connect active. */}
            {organizationId && appointment && stripeConnectActive && (
              <div className="pt-1">
                <SendToPayButton
                  appointmentId={appointment.id}
                  organizationId={organizationId}
                  totalAmountCents={Math.round(checkoutTotal * 100)}
                  clientName={appointment.client_name}
                  clientEmail={appointment.client_email}
                  clientPhone={appointment.client_phone}
                  phorestClientId={appointment.phorest_client_id}
                  afterpayEnabled={orgAfterpayEnabled}
                  afterpaySurchargeEnabled={orgSurchargeEnabled}
                  afterpaySurchargeRate={orgSurchargeRate}
                  disabled={isUpdating || chargeBlocked}
                  onPaymentLinkSent={() => {
                    queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
                  }}
                />
                {/* Surcharge preview — only when both afterpay + surcharge enabled */}
                {orgAfterpayEnabled && orgSurchargeEnabled && (
                  <div className="mt-2">
                    <AfterpaySurchargePreview
                      amountCents={Math.round(checkoutTotal * 100)}
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

          {/* Wave 28.11.2 — Surface-mapped policy disclosures (checkout). */}
          {organizationId && (
            <PolicyDisclosure
              surface="checkout"
              organizationId={organizationId}
              maxItems={3}
            />
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
                disabled={isUpdating || chargeBlocked || (paymentMethod === 'card_reader' && !activeReader) || ['creating_intent', 'displaying_cart', 'awaiting_tap', 'processing'].includes(terminalFlow.flowState)}
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
