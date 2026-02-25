import { useState, useEffect } from 'react';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Copy, CreditCard, Info, Receipt, Download, Eye, DollarSign, CalendarCheck, Sparkles, CalendarPlus, XCircle, ChevronDown, MessageSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
// Switch removed - rebook toggle replaced by rebooking gate
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import type { PhorestAppointment } from '@/hooks/usePhorestCalendar';
import type { BusinessSettings } from '@/hooks/useBusinessSettings';
import { PromoCodeInput } from '@/components/dashboard/checkout/PromoCodeInput';
import type { PromoValidationResult } from '@/hooks/usePromoCodeValidation';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

/** Default reasons a client may decline rebooking */
const DECLINE_REASONS = [
  'Wants to check their schedule first',
  'Prefers to book online later',
  'Budget concerns',
  'Trying a different salon',
  'Other',
] as const;

interface CheckoutSummarySheetProps {
  appointment: PhorestAppointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (tipAmount: number, rebooked: boolean, promoResult?: PromoValidationResult | null, declineReason?: string) => void;
  isUpdating?: boolean;
  taxRate: number;
  businessSettings: BusinessSettings | null;
  locationName: string;
  locationAddress?: string;
  locationPhone?: string;
  organizationId?: string;
  /** Called when user wants to schedule next appointment (opens booking popover) */
  onScheduleNext?: (apt: PhorestAppointment) => void;
  /** Externally set when rebook completes via QuickBookingPopover callback */
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
  onScheduleNext,
  rebookCompleted = false,
}: CheckoutSummarySheetProps) {
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>('');
  const [rebooked, setRebooked] = useState<boolean>(false);
  const [appliedPromo, setAppliedPromo] = useState<PromoValidationResult | null>(null);
  const { formatCurrency, currency } = useFormatCurrency();
  const { formatDate: formatDateLocale } = useFormatDate();

  // Rebooking gate state
  type GatePhase = 'gate' | 'declining' | 'checkout';
  const [gatePhase, setGatePhase] = useState<GatePhase>('gate');
  const [declineReason, setDeclineReason] = useState<string>('');
  const [declineOtherText, setDeclineOtherText] = useState<string>('');

  // Reset gate when sheet opens/closes
  useEffect(() => {
    if (open) {
      setGatePhase('gate');
      setDeclineReason('');
      setDeclineOtherText('');
      setRebooked(false);
    }
  }, [open]);

  // When rebook completes externally, advance past the gate
  useEffect(() => {
    if (rebookCompleted && open) {
      setRebooked(true);
      setGatePhase('checkout');
    }
  }, [rebookCompleted, open]);

  // Fetch add-on events for this appointment
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

  if (!appointment) return null;

  const addonTotal = addonEvents.reduce((sum, e) => sum + (e.addon_price || 0), 0);
  const subtotal = (appointment.total_price || 0);
  const discount = appliedPromo?.calculated_discount || 0;
  const discountedSubtotal = subtotal - discount;
  const tax = discountedSubtotal * taxRate;
  const checkoutTotal = discountedSubtotal + tax;
  const grandTotal = checkoutTotal + tipAmount;

  // Calculate duration
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

  const generateReceiptPDF = (preview: boolean = false) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200], // Receipt paper width
    });

    const pageWidth = 80;
    const margin = 5;
    let y = 10;

    // Business name
    const businessName = businessSettings?.business_name || 'Salon';
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(businessName, pageWidth / 2, y, { align: 'center' });
    y += 6;

    // Location info
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    if (locationName) {
      doc.text(locationName, pageWidth / 2, y, { align: 'center' });
      y += 4;
    }
    if (locationAddress) {
      doc.text(locationAddress, pageWidth / 2, y, { align: 'center' });
      y += 4;
    }
    if (locationPhone) {
      doc.text(locationPhone, pageWidth / 2, y, { align: 'center' });
      y += 4;
    }
    y += 2;

    // Dashed line using small dots
    doc.setDrawColor(150);
    for (let x = margin; x < pageWidth - margin; x += 2) {
      doc.line(x, y, x + 1, y);
    }
    doc.setDrawColor(0);
    y += 6;

    // Date and time
    doc.setFontSize(8);
    doc.text(`Date: ${formatDate()}`, margin, y);
    y += 4;
    doc.text(`Time: ${formatTime()}`, margin, y);
    y += 4;
    doc.text(`Receipt #: ${appointment.id.slice(-8).toUpperCase()}`, margin, y);
    y += 6;

    // Dashed line
    doc.setDrawColor(150);
    for (let x = margin; x < pageWidth - margin; x += 2) {
      doc.line(x, y, x + 1, y);
    }
    doc.setDrawColor(0);
    y += 6;

    // Client and stylist
    doc.text(`Client: ${appointment.client_name || 'Walk-in'}`, margin, y);
    y += 4;
    doc.text(`Stylist: ${stylistName}`, margin, y);
    y += 6;

    // Dashed line
    doc.setDrawColor(150);
    for (let x = margin; x < pageWidth - margin; x += 2) {
      doc.line(x, y, x + 1, y);
    }
    doc.setDrawColor(0);
    y += 6;

    // Service
    doc.setFont('helvetica', 'bold');
    doc.text('Service', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    
    const serviceName = appointment.service_name || 'Service';
    const serviceLines = doc.splitTextToSize(serviceName, pageWidth - margin * 2 - 20);
    doc.text(serviceLines, margin, y);
    doc.text(`$${subtotal.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
    y += 4 * serviceLines.length + 4;

    // Dashed line
    doc.setDrawColor(150);
    for (let x = margin; x < pageWidth - margin; x += 2) {
      doc.line(x, y, x + 1, y);
    }
    doc.setDrawColor(0);
    y += 6;

    // Totals
    doc.text('Subtotal', margin, y);
    doc.text(`$${subtotal.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
    y += 4;

    doc.text(`Tax (${(taxRate * 100).toFixed(1)}%)`, margin, y);
    doc.text(`$${tax.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
    y += 4;

    // Solid line before total
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    doc.setFont('helvetica', 'bold');
    doc.text('Checkout Total', margin, y);
    doc.text(`$${checkoutTotal.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
    y += 5;

    if (tipAmount > 0) {
      doc.setFont('helvetica', 'normal');
      doc.text('Tip', margin, y);
      doc.text(`$${tipAmount.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
      y += 4;

      doc.line(margin, y, pageWidth - margin, y);
      y += 4;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('GRAND TOTAL', margin, y);
      doc.text(`$${grandTotal.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
      y += 6;
    }

    // Footer
    y += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for visiting!', pageWidth / 2, y, { align: 'center' });
    y += 4;
    if (businessSettings?.website) {
      doc.text(businessSettings.website, pageWidth / 2, y, { align: 'center' });
    }

    if (preview) {
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
    } else {
      doc.save(`receipt-${appointment.id.slice(-8)}.pdf`);
      toast.success('Receipt downloaded');
    }
  };

  const handleConfirm = () => {
    const finalReason = declineReason === 'Other' ? declineOtherText.trim() : declineReason;
    onConfirm(tipAmount, rebooked, appliedPromo, rebooked ? undefined : finalReason || undefined);
    // Reset state for next use
    setTipAmount(0);
    setCustomTip('');
    setRebooked(false);
    setAppliedPromo(null);
    setGatePhase('gate');
    setDeclineReason('');
    setDeclineOtherText('');
  };

  const handleDeclineConfirm = () => {
    setRebooked(false);
    setGatePhase('checkout');
  };

  const handleScheduleNextClick = () => {
    if (onScheduleNext && appointment) {
      onScheduleNext(appointment);
    }
  };

  const isDeclineValid = declineReason !== '' && (declineReason !== 'Other' || declineOtherText.trim().length >= 3);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Checkout Summary
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
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

              {/* Show discount if applied */}
              {discount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Discount</span>
                  <span className="font-medium">-{formatCurrency(discount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({(taxRate * 100).toFixed(1)}%)</span>
                <span className="font-medium">{formatCurrency(tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Checkout Total</span>
                <span className="font-medium">{formatCurrency(checkoutTotal)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Tip Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Record Tip
            </h3>
            <p className="text-xs text-muted-foreground">
              Enter the tip amount from the PhorestPay terminal receipt
            </p>
            
            {/* Quick select buttons */}
            <div className="flex gap-2">
              {TIP_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant={tipAmount === Math.round(subtotal * preset.multiplier * 100) / 100 ? 'default' : 'outline'}
                  size={tokens.button.inline}
                  className="flex-1"
                  onClick={() => handleTipPreset(preset.multiplier)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Custom tip input */}
            <div className="flex items-center gap-2">
              <Label htmlFor="custom-tip" className="text-sm whitespace-nowrap">
                Custom:
              </Label>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currency}</span>
                <Input
                  id="custom-tip"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={customTip}
                  onChange={(e) => handleCustomTipChange(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>

            {tipAmount > 0 && (
              <div className="flex justify-between text-sm bg-muted/50 p-3 rounded-lg">
                <span>Tip Amount</span>
                <span className="font-medium">{formatCurrency(tipAmount)}</span>
              </div>
            )}
          </div>

          {/* Grand Total with Tip */}
          {tipAmount > 0 && (
            <>
              <Separator />
              <div className="flex justify-between text-lg bg-primary/5 p-4 rounded-lg border border-primary/20">
                <span className="font-medium">Grand Total</span>
                <span className="font-medium text-primary">{formatCurrency(grandTotal)}</span>
              </div>
            </>
          )}

          <Separator />

          {/* Rebooking Gate or Rebook Status */}
          {gatePhase === 'gate' && (
            <div className="space-y-4 p-5 bg-primary/5 rounded-xl border border-primary/20">
              <div className="text-center space-y-1">
                <CalendarPlus className="h-8 w-8 text-primary mx-auto" />
                <h3 className="font-medium text-base">Schedule Next Appointment</h3>
                <p className="text-xs text-muted-foreground">
                  Before completing checkout, let's get {appointment.client_name || 'the client'} booked for next time.
                </p>
              </div>

              <Button
                className="w-full gap-2"
                variant="default"
                size="lg"
                onClick={handleScheduleNextClick}
                disabled={!onScheduleNext}
              >
                <CalendarPlus className="h-4 w-4" />
                Schedule Next Appointment
              </Button>

              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5 pt-1"
                onClick={() => setGatePhase('declining')}
              >
                <XCircle className="h-3.5 w-3.5" />
                Client doesn't want to rebook
              </button>
            </div>
          )}

          {gatePhase === 'declining' && (
            <div className="space-y-4 p-5 bg-muted/50 rounded-xl border">
              <div className="space-y-1">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Why isn't the client rebooking?
                </h3>
                <p className="text-xs text-muted-foreground">
                  Select a reason to continue to payment.
                </p>
              </div>

              <RadioGroup
                value={declineReason}
                onValueChange={(val) => {
                  setDeclineReason(val);
                  if (val !== 'Other') setDeclineOtherText('');
                }}
                className="space-y-2"
              >
                {DECLINE_REASONS.map((reason) => (
                  <div key={reason} className="flex items-center space-x-3 p-3 rounded-lg border bg-background hover:bg-accent/50 transition-colors cursor-pointer">
                    <RadioGroupItem value={reason} id={`decline-${reason}`} />
                    <Label htmlFor={`decline-${reason}`} className="cursor-pointer flex-1 text-sm">
                      {reason}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {declineReason === 'Other' && (
                <Textarea
                  placeholder="Please specify the reason..."
                  value={declineOtherText}
                  onChange={(e) => setDeclineOtherText(e.target.value)}
                  className="min-h-[60px]"
                />
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setGatePhase('gate');
                    setDeclineReason('');
                    setDeclineOtherText('');
                  }}
                >
                  Back
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  disabled={!isDeclineValid}
                  onClick={handleDeclineConfirm}
                >
                  Continue to Payment
                </Button>
              </div>
            </div>
          )}

          {gatePhase === 'checkout' && (
            <>
              {/* Rebook Status Indicator (read-only) */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-3">
                  <CalendarCheck className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {rebooked ? 'Next appointment scheduled' : 'Client declined rebooking'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {rebooked
                        ? 'Great work! Next visit is on the books.'
                        : declineReason === 'Other'
                          ? declineOtherText
                          : declineReason}
                    </p>
                  </div>
                </div>
                <div className={cn(
                  'h-3 w-3 rounded-full',
                  rebooked ? 'bg-emerald-500' : 'bg-amber-500'
                )} />
              </div>

              <Separator />

              {/* Info Banner */}
              <div className="flex items-start gap-3 p-4 bg-muted rounded-lg border">
                <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Process payment on PhorestPay terminal, then confirm below.
                </p>
              </div>

              {/* Receipt Buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size={tokens.button.inline}
                  className="flex-1 gap-2"
                  onClick={() => generateReceiptPDF(true)}
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size={tokens.button.inline}
                  className="flex-1 gap-2"
                  onClick={() => generateReceiptPDF(false)}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>

              {/* Confirm Button */}
              <Button
                className="w-full gap-2"
                variant="default"
                size="lg"
                onClick={handleConfirm}
                disabled={isUpdating}
              >
                <Receipt className="h-4 w-4" />
                {isUpdating ? 'Processing...' : 'Mark as Paid'}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}