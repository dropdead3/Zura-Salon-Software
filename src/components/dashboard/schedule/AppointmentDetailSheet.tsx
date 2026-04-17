import { useState, useEffect, useMemo, useCallback } from 'react';
import { formatMinutesToDuration } from '@/lib/formatDuration';
import { useNavigate, Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { parseISO, differenceInDays } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuditLog } from '@/hooks/useAppointmentAuditLog';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAppointmentNotes } from '@/hooks/useAppointmentNotes';
import { useClientNotes, useAddClientNote, useDeleteClientNote } from '@/hooks/useClientNotes';
import { useClientVisitHistory } from '@/hooks/useClientVisitHistory';
import { useClientAppointmentNotes } from '@/hooks/useClientAppointmentNotes';
import { useHouseholdByPhorestClientId } from '@/hooks/useHouseholds';
import { useAppointmentAssistants } from '@/hooks/useAppointmentAssistants';
import { useAssistantConflictCheck } from '@/hooks/useAssistantConflictCheck';
import { usePreferredStylist, getStylistDisplayName } from '@/hooks/usePreferredStylist';
import { useTeamDirectory } from '@/hooks/useEmployeeProfile';
import { useServiceLookup } from '@/hooks/useServiceLookup';
import { useServiceAssignments } from '@/hooks/useServiceAssignments';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useIsPrimaryOwner } from '@/hooks/useIsPrimaryOwner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger, SubTabsList, SubTabsTrigger } from '@/components/ui/tabs';
import { ColorBarTab } from '@/components/dashboard/color-bar/ColorBarTab';
import { ClientFormulaHistoryTab } from '@/components/dashboard/clients/ClientFormulaHistoryTab';
import { CheckoutClarityPanel } from '@/components/dashboard/color-bar/CheckoutClarityPanel';
import { ClientMemoryPanel } from '@/components/dashboard/schedule/ClientMemoryPanel';
import { HospitalityBlock } from '@/components/dashboard/clients/HospitalityBlock';
import { getHospitalityClientKey } from '@/lib/hospitality-keys';
import { ContactActionDialog } from '@/components/dashboard/schedule/ContactActionDialog';
import { TransformationTimeline } from '@/components/dashboard/clients/TransformationTimeline';
import { InspirationPhotosSection } from '@/components/dashboard/clients/InspirationPhotosSection';
import { useUnviewedInspirationPhotos } from '@/hooks/useUnviewedInspirationPhotos';
import { useUnviewedAppointmentNotes } from '@/hooks/useUnviewedAppointmentNotes';
import { useMarkAppointmentTabViewed } from '@/hooks/useMarkAppointmentTabViewed';
import { NavBadge } from '@/components/dashboard/NavBadge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
// Globe removed — no longer used for confirmation methods
import {
  Phone, Mail, Calendar, Clock, User, MapPin, DollarSign,
  ChevronDown, ChevronRight, Copy, Check, CheckCircle, UserCheck, XCircle, AlertTriangle,
  MessageSquare, Lock, Trash2, Loader2, UserPlus, X, Repeat, RotateCcw,
  CreditCard, CalendarClock, RefreshCw, Star, TrendingUp, ExternalLink,
  UserX, ArrowRightLeft, Receipt, MoreHorizontal, Sparkles, Camera, Beaker,
  MessageCircle, Info,
} from 'lucide-react';
import { cn, formatPhoneDisplay } from '@/lib/utils';
import { toast } from 'sonner';
import { isCardExpired } from '@/lib/card-utils';
import { tokens, APPOINTMENT_STATUS_BADGE } from '@/lib/design-tokens';
import { getClientInitials, getAvatarColor } from '@/lib/appointment-card-utils';
import type { PhorestAppointment, AppointmentStatus } from '@/hooks/usePhorestCalendar';
import { formatRelativeTime } from '@/lib/format';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useAssistantTimeBlocks } from '@/hooks/useAssistantTimeBlocks';
import { useLogAuditEvent } from '@/hooks/useAppointmentAuditLog';
import { formatDisplayName, formatName } from '@/lib/utils';
import { Users as UsersIcon, Home } from 'lucide-react';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { EditServicesDialog } from '@/components/shared/EditServicesDialog';
import { useUpdateAppointmentServices, type ServiceEntry } from '@/hooks/useUpdateAppointmentServices';
import { Pencil, Send } from 'lucide-react';
import { PaymentLinkStatusBadge } from '@/components/dashboard/appointments/PaymentLinkStatusBadge';
import { PaymentLinkStatusCard } from '@/components/dashboard/appointments/PaymentLinkStatusCard';
import { SendToPayButton } from '@/components/dashboard/appointments/SendToPayButton';
import { useColorBarEntitlement } from '@/hooks/color-bar/useColorBarEntitlement';
import { ColorBarUpsellInline } from '@/components/color-bar/ColorBarUpsellInline';


// ─── Cancellation Fee Section sub-component ─────────────────────
function CancellationFeeSection({
  appointment,
  organizationId,
  isManagerOrAdmin,
  formatCurrency,
}: {
  appointment: PhorestAppointment;
  organizationId: string;
  isManagerOrAdmin: boolean;
  formatCurrency: (n: number) => string;
}) {
  const [isCharging, setIsCharging] = useState(false);
  const [isWaiving, setIsWaiving] = useState(false);
  const [showChargeConfirm, setShowChargeConfirm] = useState(false);
  const [showManualCharge, setShowManualCharge] = useState(false);
  const [manualAmount, setManualAmount] = useState('');
  const queryClient = useQueryClient();

  const feeStatus = appointment.cancellation_fee_status;
  const feeCharged = appointment.cancellation_fee_charged;

  // Look up card on file for the client (use phorest_client_id)
  const { data: clientCards = [] } = useQuery({
    queryKey: ['client-cards-for-fee', organizationId, appointment.phorest_client_id],
    queryFn: async () => {
      if (!appointment.phorest_client_id) return [];
      const { data, error } = await supabase
        .from('client_cards_on_file')
        .select('id, card_brand, card_last4, is_default, card_exp_month, card_exp_year')
        .eq('organization_id', organizationId)
        .eq('client_id', appointment.phorest_client_id)
        .order('is_default', { ascending: false });
      if (error) return [];
      return data ?? [];
    },
    enabled: !!appointment.phorest_client_id,
  });

  // Look up cancellation fee policies
  const { data: feePolicies = [] } = useQuery({
    queryKey: ['cancel-fee-policies', organizationId],
    queryFn: async () => {
      const policyType = appointment.status === 'no_show' ? 'no_show' : 'cancellation';
      const { data, error } = await supabase
        .from('cancellation_fee_policies')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('policy_type', policyType)
        .eq('is_active', true)
        .limit(1);
      if (error) return [];
      return data ?? [];
    },
    enabled: !!organizationId,
  });

  const policy = feePolicies[0];
  const defaultCard = clientCards[0];
  const hasCard = clientCards.length > 0;

  const calculatedFee = policy
    ? policy.fee_type === 'flat'
      ? policy.fee_amount
      : policy.fee_type === 'percentage' && appointment.total_price
        ? Math.round((appointment.total_price * policy.fee_amount / 100) * 100) / 100
        : policy.fee_amount
    : null;

  const handleChargeFee = async () => {
    if (!defaultCard || calculatedFee == null) return;
    if (isCardExpired(defaultCard.card_exp_month, defaultCard.card_exp_year)) {
      toast.error('Card expired', { description: `The ${defaultCard.card_brand || 'card'} ending in ${defaultCard.card_last4} has expired. Please update the card on file before charging.` });
      return;
    }
    setIsCharging(true);
    try {
      const { error } = await supabase.functions.invoke('charge-card-on-file', {
        body: {
          organization_id: organizationId,
          appointment_id: appointment.id,
          card_on_file_id: defaultCard.id,
          amount: calculatedFee,
          description: `${appointment.status === 'no_show' ? 'No-show' : 'Cancellation'} fee for ${appointment.client_name || 'client'}`,
          fee_type: appointment.status === 'no_show' ? 'no_show' : 'cancellation',
        },
      });
      if (error) throw error;
      toast.success('Fee charged successfully');
      queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
    } catch (e) {
      toast.error('Failed to charge fee', { description: (e as Error).message });
    } finally {
      setIsCharging(false);
      setShowChargeConfirm(false);
    }
  };

  const handleWaiveFee = async () => {
    setIsWaiving(true);
    try {
      const table = appointment._source === 'local' ? 'appointments' : 'phorest_appointments';
      const { error } = await supabase
        .from(table)
        .update({ cancellation_fee_status: 'waived' } as any)
        .eq('id', appointment.id);
      if (error) throw error;
      toast.success('Fee waived');
      queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
    } catch (e) {
      toast.error('Failed to waive fee', { description: (e as Error).message });
    } finally {
      setIsWaiving(false);
    }
  };

  const handleManualCharge = async () => {
    const amt = parseFloat(manualAmount);
    if (!defaultCard || isNaN(amt) || amt <= 0) return;
    if (isCardExpired(defaultCard.card_exp_month, defaultCard.card_exp_year)) {
      toast.error('Card expired', { description: `The ${defaultCard.card_brand || 'card'} ending in ${defaultCard.card_last4} has expired. Please update the card on file before charging.` });
      return;
    }
    setIsCharging(true);
    try {
      const { error } = await supabase.functions.invoke('charge-card-on-file', {
        body: {
          organization_id: organizationId,
          appointment_id: appointment.id,
          card_on_file_id: defaultCard.id,
          amount: amt,
          description: `Manual charge for ${appointment.client_name || 'client'}`,
          fee_type: 'manual',
        },
      });
      if (error) throw error;
      toast.success(`Charged $${amt.toFixed(2)} to card on file`);
      queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
      setShowManualCharge(false);
      setManualAmount('');
    } catch (e) {
      toast.error('Charge failed', { description: (e as Error).message });
    } finally {
      setIsCharging(false);
    }
  };

  // Already charged or waived
  if (feeStatus === 'charged' || feeStatus === 'waived') {
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-muted-foreground">
          {appointment.status === 'no_show' ? 'No-Show' : 'Cancellation'} Fee
        </span>
        <div className="flex items-center gap-2">
          {feeCharged != null && (
            <span className="text-xs">
              <BlurredAmount>{formatCurrency(feeCharged)}</BlurredAmount>
            </span>
          )}
          <Badge
            variant="outline"
            className={cn('text-[10px]', {
              'text-green-600 border-green-300': feeStatus === 'charged',
              'text-muted-foreground border-border': feeStatus === 'waived',
            })}
          >
            {feeStatus === 'charged' ? 'Charged' : 'Waived'}
          </Badge>
        </div>
      </div>
    );
  }

  if (feeStatus === 'failed') {
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-muted-foreground">Fee Charge</span>
        <Badge variant="outline" className="text-[10px] text-red-600 border-red-300">Failed</Badge>
      </div>
    );
  }

  return (
    <div className="space-y-2 py-2 border-t border-dashed">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {appointment.status === 'no_show' ? 'No-Show' : 'Cancellation'} Fee
        </span>
        {calculatedFee != null && (
          <span className="text-sm font-medium">{formatCurrency(calculatedFee)}</span>
        )}
      </div>

      {hasCard && calculatedFee != null && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="default"
            className="flex-1 text-xs"
            onClick={() => setShowChargeConfirm(true)}
            disabled={isCharging}
          >
            <CreditCard className="w-3.5 h-3.5 mr-1" />
            Charge {defaultCard.card_brand} •••• {defaultCard.card_last4}
          </Button>
          {isManagerOrAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={handleWaiveFee}
              disabled={isWaiving}
            >
              Waive
            </Button>
          )}
        </div>
      )}

      {hasCard && (
        <Button
          size="sm"
          variant="ghost"
          className="w-full text-xs text-muted-foreground"
          onClick={() => setShowManualCharge(!showManualCharge)}
        >
          Custom Amount
        </Button>
      )}

      {showManualCharge && (
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Amount"
            value={manualAmount}
            onChange={e => setManualAmount(e.target.value)}
            className="flex-1 h-8 px-2 text-sm border rounded-md bg-background"
          />
          <Button size="sm" onClick={handleManualCharge} disabled={isCharging || !manualAmount}>
            Charge
          </Button>
        </div>
      )}

      {!hasCard && (
        <p className="text-xs text-muted-foreground italic">
          No card on file — fee must be collected manually.
        </p>
      )}

      {/* Charge Confirmation Dialog */}
      <AlertDialog open={showChargeConfirm} onOpenChange={setShowChargeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Charge {appointment.status === 'no_show' ? 'No-Show' : 'Cancellation'} Fee?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will charge {formatCurrency(calculatedFee ?? 0)} to {defaultCard?.card_brand} •••• {defaultCard?.card_last4} for {appointment.client_name || 'this client'}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleChargeFee}
              disabled={isCharging}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCharging && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Charge Fee
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Scheduled Coverage sub-component ───────────────────────────
function ScheduledCoverageSection({
  appointmentDate,
  startTime,
  endTime,
  locationId,
}: {
  appointmentDate: string;
  startTime: string;
  endTime: string;
  locationId: string | null;
}) {
  const { effectiveOrganization } = useOrganizationContext();
  const { timeBlocks } = useAssistantTimeBlocks(
    appointmentDate ? new Date(appointmentDate + 'T12:00:00') : null,
    locationId,
    effectiveOrganization?.id || null,
  );

  const overlapping = useMemo(() => {
    if (!timeBlocks.length) return [];
    const parseT = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const aptStart = parseT(startTime);
    const aptEnd = parseT(endTime);
    return timeBlocks.filter(b => {
      const bStart = parseT(b.start_time);
      const bEnd = parseT(b.end_time);
      return bStart < aptEnd && bEnd > aptStart;
    });
  }, [timeBlocks, startTime, endTime]);

  if (overlapping.length === 0) return null;

  return (
    <div className="mt-3">
      <span className="text-xs text-muted-foreground">Scheduled Coverage</span>
      <div className="space-y-1.5 mt-1">
        {overlapping.map(block => {
          const name = block.assistant_profile
            ? formatDisplayName(block.assistant_profile.full_name, block.assistant_profile.display_name)
            : null;
          return (
            <div key={block.id} className="flex items-center gap-2 text-sm">
              <UsersIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">
                {name || 'Unassigned'}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatTime12h(block.start_time)}–{formatTime12h(block.end_time)}
              </span>
              <Badge variant="outline" className={cn(
                'text-[10px]',
                block.status === 'confirmed' ? 'text-green-700 dark:text-green-300 border-green-300' : 'text-amber-700 dark:text-amber-300 border-amber-300'
              )}>
                {block.status === 'confirmed' ? 'Confirmed' : 'Requested'}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Household Section sub-component ────────────────────────────
function HouseholdSection({ phorestClientId, formatDate }: { phorestClientId: string | null; formatDate: (d: Date, f: string) => string }) {
  const { data: householdData } = useHouseholdByPhorestClientId(phorestClientId);

  if (!householdData || householdData.members.length === 0) return null;

  return (
    <>
      <Separator />
      <motion.div variants={staggerItem} className="space-y-2">
        <h4 className={tokens.heading.subsection}>
          <Home className="h-3.5 w-3.5 inline mr-1.5" />
          {householdData.household_name || 'Household'}
        </h4>
        <div className="space-y-2">
          {householdData.members.map((member: any) => {
            const client = member.client;
            if (!client) return null;
            const initials = client.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';
            return (
              <div key={member.id} className="flex items-center gap-2.5 text-sm">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px] font-display bg-primary/10">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate block">{client.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {client.last_visit
                      ? `Last visit: ${formatDate(new Date(client.last_visit), 'MMM d')}`
                      : 'No visits yet'}
                    {client.visit_count > 0 && ` · ${client.visit_count} visits`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}

// ─── Stagger Animation Variants ─────────────────────────────────
const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
};

// ─── Status Config ──────────────────────────────────────────────
const STATUS_CONFIG: Record<AppointmentStatus, {
  bg: string; text: string; label: string; icon: React.ElementType;
}> = {
  pending:      { bg: 'bg-amber-100 dark:bg-amber-900/50',  text: 'text-amber-800 dark:text-amber-300',  label: 'Pending',      icon: Clock },
  booked:       { bg: 'bg-amber-100 dark:bg-amber-900/50',  text: 'text-amber-800 dark:text-amber-300',  label: 'Unconfirmed',  icon: Clock },
  unconfirmed:  { bg: 'bg-amber-100 dark:bg-amber-900/50',  text: 'text-amber-800 dark:text-amber-300',  label: 'Unconfirmed',  icon: Clock },
  confirmed:    { bg: 'bg-green-100 dark:bg-green-900/50',   text: 'text-green-800 dark:text-green-300',  label: 'Confirmed',    icon: CheckCircle },
  walk_in:      { bg: 'bg-teal-100 dark:bg-teal-900/50',    text: 'text-teal-800 dark:text-teal-300',    label: 'Walk-In',      icon: UserCheck },
  checked_in:   { bg: 'bg-blue-100 dark:bg-blue-900/50',     text: 'text-blue-800 dark:text-blue-300',    label: 'Checked In',   icon: UserCheck },
  completed:    { bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-800 dark:text-purple-300',label: 'Completed',    icon: CheckCircle },
  cancelled:    { bg: 'bg-gray-100 dark:bg-gray-800',        text: 'text-gray-600 dark:text-gray-400',    label: 'Cancelled',    icon: XCircle },
  no_show:      { bg: 'bg-red-100 dark:bg-red-900/50',       text: 'text-red-800 dark:text-red-300',      label: 'No Show',      icon: AlertTriangle },
};

const STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  booked: ['confirmed', 'cancelled'],
  unconfirmed: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  walk_in: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

const LIFECYCLE_STEPS: AppointmentStatus[] = ['unconfirmed', 'confirmed', 'checked_in', 'completed'];

import { formatTime12h } from '@/lib/schedule-utils';

function getDurationMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

// ─── Copy button with check feedback ────────────────────────────
function CopyButton({ onCopy }: { onCopy: () => void }) {
  const [copied, setCopied] = useState(false);
  const handleClick = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClick}>
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

// ─── Props ──────────────────────────────────────────────────────
interface AppointmentDetailSheetProps {
  appointment: PhorestAppointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (appointmentId: string, status: AppointmentStatus) => void;
  isUpdating?: boolean;
  onRebook?: (appointment: PhorestAppointment) => void;
  onReschedule?: (appointment: PhorestAppointment) => void;
  onPay?: (appointment: PhorestAppointment) => void;
  onOpenClientProfile?: (clientId: string) => void;
  initialTab?: string;
}

export function AppointmentDetailSheet({
  appointment,
  open,
  onOpenChange,
  onStatusChange,
  isUpdating = false,
  onRebook,
  onReschedule,
  onPay,
  onOpenClientProfile,
  initialTab,
}: AppointmentDetailSheetProps) {
  const { dashPath } = useOrgDashboardPath();
  const { isEntitled: colorBarEntitled, isPendingActivation: isColorBarPendingActivation } =
    useColorBarEntitlement(appointment?.location_id ?? undefined);
  const { user, hasPermission, roles } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const { formatCurrency } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const logAuditEvent = useLogAuditEvent();

  // Org afterpay settings — drives Quick Actions label and composer behavior
  const { data: orgAfterpaySettings } = useQuery({
    queryKey: ['org-afterpay-enabled', effectiveOrganization?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('organizations')
        .select('afterpay_enabled, afterpay_surcharge_enabled, afterpay_surcharge_rate')
        .eq('id', effectiveOrganization!.id)
        .maybeSingle();
      return {
        enabled: data?.afterpay_enabled ?? false,
        surchargeEnabled: data?.afterpay_surcharge_enabled ?? false,
        surchargeRate: Number(data?.afterpay_surcharge_rate ?? 0.06),
      };
    },
    enabled: !!effectiveOrganization?.id && open,
    staleTime: 60_000,
  });
  const orgAfterpayEnabled = orgAfterpaySettings?.enabled ?? false;
  const orgSurchargeEnabled = orgAfterpaySettings?.surchargeEnabled ?? false;
  const orgSurchargeRate = orgAfterpaySettings?.surchargeRate ?? 0.06;

  // Realtime subscription for payment link status auto-updates (B1: listen on `appointments` table where payment columns live)
  useEffect(() => {
    if (!appointment?.id || !open) return;
    const channel = supabase
      .channel(`appt-pay-${appointment.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'appointments',
        filter: `id=eq.${appointment.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [appointment?.id, open, queryClient]);

  // Resend / create new payment link handler (B4/E1)
  const [isResendingLink, setIsResendingLink] = useState(false);
  const handleResendPaymentLink = useCallback(async () => {
    if (!appointment || !effectiveOrganization?.id) return;
    setIsResendingLink(true);
    try {
      const { data: linkData, error: linkError } = await supabase.functions.invoke(
        'create-checkout-payment-link',
        {
          body: {
            organization_id: effectiveOrganization.id,
            appointment_id: appointment.id,
            amount_cents: Math.round((appointment.total_price || 0) * 100),
            client_email: appointment.client_email,
            client_phone: appointment.client_phone,
            client_name: appointment.client_name,
          },
        }
      );
      if (linkError) throw new Error(linkError.message);
      if (!linkData?.checkout_url) throw new Error('Failed to create payment link');

      await supabase.functions.invoke('send-payment-link', {
        body: {
          organization_id: effectiveOrganization.id,
          appointment_id: appointment.id,
          checkout_url: linkData.checkout_url,
          client_name: appointment.client_name,
          client_email: appointment.client_email,
          client_phone: appointment.client_phone,
          amount_display: `$${((appointment.total_price || 0)).toFixed(2)}`,
        },
      });

      toast.success('New payment link sent');
      queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend payment link');
    } finally {
      setIsResendingLink(false);
    }
  }, [appointment, effectiveOrganization?.id, queryClient]);

  const [newNote, setNewNote] = useState('');
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [confirmAction, setConfirmAction] = useState<AppointmentStatus | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showAssistantPicker, setShowAssistantPicker] = useState(false);
  const [cancellingFuture, setCancellingFuture] = useState(false);
  const [cancelFutureReason, setCancelFutureReason] = useState('');
  const [showCancelFutureConfirm, setShowCancelFutureConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newClientNote, setNewClientNote] = useState('');
  const [isPrivateClientNote, setIsPrivateClientNote] = useState(false);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [selectedNewStylist, setSelectedNewStylist] = useState<string | null>(null);
  const [reassignMode, setReassignMode] = useState<'entire' | 'individual'>('entire');
  const [perServiceSelections, setPerServiceSelections] = useState<Record<string, string>>({});
  // Confirmation gate state
  const [showConfirmGate, setShowConfirmGate] = useState(false);
  const [confirmMethod, setConfirmMethod] = useState('');
  const [confirmNote, setConfirmNote] = useState('');
  const [confirmAcknowledged, setConfirmAcknowledged] = useState(false);
  // Client notes collapsible state
  const [clientNotesExpanded, setClientNotesExpanded] = useState(false);
  // Tab state -- resets to "details" when appointment changes (#10)
  const [activeTab, setActiveTab] = useState('details');
  // Wave 22.5 — Zura-native call/text dialogs
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [textDialogOpen, setTextDialogOpen] = useState(false);

  const { data: isPrimaryOwner } = useIsPrimaryOwner();
  const isManagerOrAdmin = roles.some(r => ['admin', 'super_admin', 'manager'].includes(r)) || isPrimaryOwner;
  const isStylistOnly = roles.includes('stylist') && !isManagerOrAdmin;
  const canAddNotes = hasPermission('add_appointment_notes');
  const canManageAssistants = hasPermission('create_appointments') || hasPermission('view_team_appointments');

  // Reset states when appointment changes (#10, #E)
  useEffect(() => {
    setActiveTab(initialTab || 'details');
    setNewNote('');
    setNewClientNote('');
    setIsPrivateNote(false);
    setIsPrivateClientNote(false);
    setShowAssistantPicker(false);
    setShowReassignDialog(false);
    setSelectedNewStylist(null);
    setReassignMode('entire');
    setPerServiceSelections({});
    setClientNotesExpanded(false);
    setShowConfirmGate(false);
    setConfirmMethod('');
    setConfirmNote('');
    setConfirmAcknowledged(false);
  }, [appointment?.id]);

  // Handle initialTab changes while panel is open (#F)
  useEffect(() => {
    if (initialTab && open) {
      setActiveTab(initialTab);
    }
  }, [initialTab, open]);

  // ─── Inspiration Photos: unread badge + auto-clear on tab open ───
  const { unviewedCount: unviewedPhotosCount } = useUnviewedInspirationPhotos(
    appointment?.id ?? null,
    appointment?.phorest_client_id ?? null,
  );
  const markTabViewed = useMarkAppointmentTabViewed();
  useEffect(() => {
    if (
      open &&
      activeTab === 'photos' &&
      appointment?.id &&
      unviewedPhotosCount > 0
    ) {
      markTabViewed.mutate({ appointmentId: appointment.id, tabKey: 'photos' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeTab, appointment?.id, unviewedPhotosCount]);

  // ─── Escape Key Handler ─────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  // ─── Data Hooks (Wave 18: lazy-gated by activeTab) ────────────
  const notesEnabled = activeTab === 'notes' || activeTab === 'details';
  const historyEnabled = activeTab === 'history' || activeTab === 'details';
  const auditEnabled = activeTab === 'history' || activeTab === 'details';

  const notesAppointmentId = appointment?.phorest_id || appointment?.id || null;

  const { notes, addNote, deleteNote, isAdding } = useAppointmentNotes(
    notesAppointmentId,
    { enabled: notesEnabled },
  );
  const { assistants, assignAssistant, removeAssistant, updateAssistDuration, isAssigning } = useAppointmentAssistants(appointment?.id || null);

  // ─── Notes: unread badge + auto-clear on tab open ───
  const { unviewedCount: unviewedNotesCount } = useUnviewedAppointmentNotes(
    notesAppointmentId,
    notes,
  );
  const isAssignedStylist = !!user?.id && appointment?.stylist_user_id === user.id;
  const isAssistant = !!user?.id && assistants.some((a) => a.assistant_user_id === user.id);
  const isWorkingThisAppointment = isAssignedStylist || isAssistant;
  useEffect(() => {
    if (
      open &&
      activeTab === 'notes' &&
      notesAppointmentId &&
      unviewedNotesCount > 0
    ) {
      markTabViewed.mutate({ appointmentId: notesAppointmentId, tabKey: 'notes' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeTab, notesAppointmentId, unviewedNotesCount]);
  const { data: clientNotes = [], isLoading: clientNotesLoading } = useClientNotes(appointment?.phorest_client_id || undefined);
  const addClientNote = useAddClientNote();
  const deleteClientNote = useDeleteClientNote();
  const { data: visitHistory = [], isLoading: historyLoading } = useClientVisitHistory(
    appointment?.phorest_client_id,
    { enabled: historyEnabled },
  );
  const { data: clientAptNotes = [], isLoading: clientAptNotesLoading } = useClientAppointmentNotes(
    appointment?.phorest_client_id,
    { enabled: notesEnabled },
  );
  const [notesScope, setNotesScope] = useState<'this' | 'all'>('this');
  const { data: serviceLookup } = useServiceLookup();
  const { assignmentMap, upsertAssignments } = useServiceAssignments(appointment?.id || null);
  const updateServicesMutation = useUpdateAppointmentServices();
  const [editServicesOpen, setEditServicesOpen] = useState(false);

  // Location name + org lookup
  const { data: locationData } = useQuery({
    queryKey: ['location-data', appointment?.location_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('name, organization_id')
        .eq('id', appointment!.location_id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!appointment?.location_id,
    staleTime: 10 * 60 * 1000,
  });
  const locationName = locationData?.name || null;

  // Resolved org ID: prefer effectiveOrganization, fall back to appointment's location org
  const resolvedOrgId = effectiveOrganization?.id || locationData?.organization_id || null;

  // Fetch client email + preferred_stylist_id from phorest_clients
  const { data: clientRecord, isLoading: clientRecordLoading } = useQuery({
    queryKey: ['client-record-for-panel', appointment?.phorest_client_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_all_clients' as any)
        .select('email, preferred_stylist_id, client_since')
        .eq('phorest_client_id', appointment!.phorest_client_id!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!appointment?.phorest_client_id,
    staleTime: 2 * 60 * 1000,
  });

  const { data: preferredStylist } = usePreferredStylist(clientRecord?.preferred_stylist_id);

  // Linked redos
  const { data: linkedRedos = [] } = useQuery({
    queryKey: ['linked-redos', appointment?.id],
    queryFn: async () => {
      if (!appointment?.id) return [];
      const { data: phorestRedos } = await supabase
        .from('v_all_appointments' as any)
        .select('id, appointment_date, stylist_user_id, service_name, status')
        .eq('original_appointment_id', appointment.id)
        .not('status', 'in', '("cancelled")');
      const results = ((phorestRedos || []) as any[]).map((r: any) => ({
        id: r.id, appointment_date: r.appointment_date,
        staff_name: null as string | null, service_name: r.service_name,
        status: r.status, _stylist_user_id: r.stylist_user_id,
      }));
      if (results.length > 0) {
        const ids = [...new Set(results.map(r => r._stylist_user_id).filter(Boolean))] as string[];
        if (ids.length > 0) {
          const { data: profiles } = await supabase.from('employee_profiles').select('user_id, display_name, full_name').in('user_id', ids);
          const map: Record<string, string> = {};
          for (const p of profiles || []) map[p.user_id] = p.display_name || p.full_name || 'Unknown';
          for (const r of results) if (r._stylist_user_id) r.staff_name = map[r._stylist_user_id] || null;
        }
      }
      return results;
    },
    enabled: !!appointment?.id && open,
    staleTime: 60_000,
  });

  // Redo mutations
  const approveRedo = useMutation({
    mutationFn: async () => {
      if (!appointment?.id || !user?.id) throw new Error('Missing data');
      const table = appointment._source === 'local' ? 'appointments' : 'phorest_appointments';
      const { error } = await supabase.from(table).update({ redo_approved_by: user.id, status: 'confirmed' } as any).eq('id', appointment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      fireAuditLog('redo_approved', { status: 'pending' }, { status: 'confirmed' });
      queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
      toast.success('Redo approved');
    },
    onError: (e: Error) => toast.error('Failed to approve redo', { description: e.message }),
  });

  const declineRedo = useMutation({
    mutationFn: async () => {
      if (!appointment?.id) throw new Error('Missing data');
      const rdTable = appointment._source === 'local' ? 'appointments' : 'phorest_appointments';
      const { error } = await supabase.from(rdTable).update({ status: 'cancelled', notes: (appointment.notes || '') + '\n[Redo declined]' } as any).eq('id', appointment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      fireAuditLog('redo_declined', { status: 'pending' }, { status: 'cancelled' });
      queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
      toast.success('Redo declined');
      handleClose();
    },
    onError: (e: Error) => toast.error('Failed to decline redo', { description: e.message }),
  });

  // Team for assistant picker
  const { data: teamMembers = [] } = useTeamDirectory(undefined, { organizationId: resolvedOrgId || undefined });
  const conflictMap = useAssistantConflictCheck(
    appointment?.appointment_date || null,
    appointment?.start_time || null,
    appointment?.end_time || null,
    appointment?.id || null,
    showAssistantPicker || showReassignDialog,
  );

  // Reassign stylist mutation
  const reassignStylist = useMutation({
    mutationFn: async ({ newStylistUserId }: { newStylistUserId: string }) => {
      if (!appointment?.id || !resolvedOrgId) throw new Error('Missing data');
      const member = teamMembers.find(m => m.user_id === newStylistUserId);
      const newName = member?.display_name || member?.full_name || 'Unknown';

      // Look up phorest_staff_id for phorest appointments
      let phorestStaffId: string | null = null;
      if (appointment._source !== 'local') {
        const { data: mapping } = await supabase
          .from('v_all_staff' as any)
          .select('phorest_staff_id')
          .eq('user_id', newStylistUserId)
          .maybeSingle();
        phorestStaffId = (mapping as any)?.phorest_staff_id || null;
      }

      const table = appointment._source === 'local' ? 'appointments' : 'phorest_appointments';
      const updatePayload: Record<string, any> = {
        stylist_user_id: newStylistUserId,
        staff_name: newName,
      };
      if (table === 'phorest_appointments' && phorestStaffId) {
        updatePayload.phorest_staff_id = phorestStaffId;
      }

      const { error } = await supabase.from(table).update(updatePayload as any).eq('id', appointment.id);
      if (error) throw error;

      return { oldName: appointment.stylist_profile?.display_name || appointment.stylist_profile?.full_name || 'Unknown', newName };
    },
    onSuccess: (result) => {
      fireAuditLog('stylist_reassigned', { stylist: result.oldName }, { stylist: result.newName });
      queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments-hub'] });
      toast.success(`Reassigned to ${result.newName}`);
      setShowReassignDialog(false);
      setSelectedNewStylist(null);
    },
    onError: (e: Error) => toast.error('Failed to reassign', { description: e.message }),
  });

  // ─── Derived Data ─────────────────────────────────────────────
  const services = useMemo(() => {
    if (!appointment?.service_name) return [];
    return appointment.service_name.split(',').map(s => s.trim()).filter(Boolean).map(name => {
      const info = serviceLookup?.get(name);
      return { name, duration: info?.duration_minutes || null, category: info?.category || null, price: info?.price ?? null };
    });
  }, [appointment?.service_name, serviceLookup]);

  const durationMinutes = appointment ? getDurationMinutes(appointment.start_time, appointment.end_time) : 0;

  const visitStats = useMemo(() => {
    const completed = visitHistory.filter(v => v.status === 'completed');
    const totalSpend = completed.reduce((sum, v) => sum + (v.total_price || 0), 0);
    const tenure = clientRecord?.client_since
      ? differenceInDays(new Date(), parseISO(clientRecord.client_since))
      : null;
    // Average visit frequency (#6)
    let avgFrequencyWeeks: number | null = null;
    if (completed.length >= 2 && tenure != null && tenure > 0) {
      avgFrequencyWeeks = Math.round((tenure / 7) / (completed.length - 1) * 10) / 10;
    }
    return { visitCount: completed.length, totalSpend, tenure, avgFrequencyWeeks };
  }, [visitHistory, clientRecord]);

  // Last visit date for header (#4)
  const lastVisitDate = useMemo(() => {
    if (visitHistory.length === 0) return null;
    // Find the most recent completed visit that isn't the current appointment
    const past = visitHistory.find(v => v.id !== appointment?.id && v.status === 'completed');
    return past?.appointment_date || null;
  }, [visitHistory, appointment?.id]);

  // ─── Service Frequency (for History tab) ─────────────────────
  const topServices = useMemo(() => {
    if (visitHistory.length === 0) return [];
    const counts: Record<string, number> = {};
    for (const visit of visitHistory) {
      if (!visit.service_name) continue;
      const names = visit.service_name.split(',').map(s => s.trim()).filter(Boolean);
      for (const name of names) {
        counts[name] = (counts[name] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
  }, [visitHistory]);

  const preferredStylistMismatch = useMemo(() => {
    if (!clientRecord?.preferred_stylist_id || !appointment?.stylist_user_id) return false;
    return clientRecord.preferred_stylist_id !== appointment.stylist_user_id;
  }, [clientRecord, appointment]);

  // Walk-in detection (#7)
  const isWalkIn = appointment ? (!appointment.phorest_client_id && !appointment.client_name) : false;

  // Fuzzy client match for walk-ins without phorest_client_id
  const { data: matchedClient } = useQuery({
    queryKey: ['walk-in-client-match', appointment?.client_phone, appointment?.client_name],
    queryFn: async () => {
      const phone = appointment?.client_phone;
      if (!phone) return null;
      // Normalize: strip non-digits, add +1 if 10 digits
      let normalized = phone.replace(/[^0-9+]/g, '');
      if (normalized.length === 10 && !normalized.startsWith('+')) normalized = '+1' + normalized;
      else if (normalized.length === 11 && normalized.startsWith('1')) normalized = '+' + normalized;
      const { data } = await supabase
        .from('v_all_clients' as any)
        .select('phorest_client_id')
        .eq('phone_normalized', normalized)
        .limit(1)
        .maybeSingle();
      return (data as any)?.phorest_client_id || null;
    },
    enabled: !!appointment && !appointment.phorest_client_id && !!appointment.client_phone && open,
    staleTime: 5 * 60 * 1000,
  });

  const resolvedClientId = appointment?.phorest_client_id || matchedClient;

  // ─── Confirmation source from audit log (gated) ──────────────
  const { data: auditEntries = [] } = useAuditLog(appointment?.id || null, { enabled: auditEnabled });
  const confirmationSource = useMemo(() => {
    const event = auditEntries.find(
      e => e.event_type === 'status_changed' && (e.new_value as any)?.status === 'confirmed'
    );
    if (!event) return null;
    const method = (event.metadata as any)?.confirmation_method || null;
    return { method, actorName: event.actor_name, createdAt: event.created_at };
  }, [auditEntries]);

  const CONFIRM_METHOD_DISPLAY: Record<string, { icon: React.ElementType; label: string }> = {
    called: { icon: Phone, label: 'Phone Call' },
    texted: { icon: MessageSquare, label: 'Text Message' },
    emailed: { icon: Mail, label: 'Email' },
    in_person: { icon: User, label: 'In Person' },
    other: { icon: MoreHorizontal, label: 'Other' },
  };

  // ─── Cancel & Delete Access Control (must be before early return) ─────
  const isOwnAppointment = appointment ? appointment.stylist_user_id === user?.id : false;
  const canCancel = isManagerOrAdmin || isOwnAppointment;

  // Delete: admins can delete booked/pending anytime; stylists can delete own creations within 10 min
  const canDelete = useMemo(() => {
    if (!appointment || ['completed', 'checked_in'].includes(appointment.status)) return false;
    if (isManagerOrAdmin) return true;
    if (isStylistOnly && ['booked', 'pending'].includes(appointment.status) && appointment.created_by === user?.id) {
      const createdAt = new Date(appointment.created_at);
      const minutesSinceCreation = (Date.now() - createdAt.getTime()) / 60000;
      return minutesSinceCreation <= 10;
    }
    return false;
  }, [appointment, isManagerOrAdmin, isStylistOnly, user?.id]);

  if (!appointment) return null;

  const statusConfig = STATUS_CONFIG[appointment.status];
  const StatusIcon = statusConfig.icon;
  const availableTransitions = STATUS_TRANSITIONS[appointment.status];
  const initials = getClientInitials(appointment.client_name);
  const avatarColor = getAvatarColor(appointment.client_name);

  // Recurrence
  const recurrenceLabel = appointment.recurrence_group_id && appointment.recurrence_rule
    ? `Recurring (${(appointment.recurrence_index ?? 0) + 1} of ${(appointment.recurrence_rule as any)?.occurrences ?? '?'})`
    : null;

  // ─── Handlers ─────────────────────────────────────────────────
  const handleClose = () => onOpenChange(false);

  const handleCopyPhone = () => {
    if (appointment.client_phone) {
      navigator.clipboard.writeText(appointment.client_phone);
      toast.success('Phone number copied');
    }
  };

  const handleCopyEmail = () => {
    if (clientRecord?.email) {
      navigator.clipboard.writeText(clientRecord.email);
      toast.success('Email copied');
    }
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNote({ note: newNote.trim(), isPrivate: isPrivateNote });
    setNewNote('');
    setIsPrivateNote(false);
  };

  const handleAddClientNote = () => {
    if (!newClientNote.trim() || !appointment.phorest_client_id) return;
    addClientNote.mutate({ clientId: appointment.phorest_client_id, note: newClientNote.trim(), isPrivate: isPrivateClientNote });
    setNewClientNote('');
    setIsPrivateClientNote(false);
  };

  // Audit helper
  const fireAuditLog = (eventType: string, previousValue?: Record<string, any> | null, newValue?: Record<string, any> | null, metadata?: Record<string, any> | null) => {
    if (!appointment?.id || !resolvedOrgId) return;
    logAuditEvent.mutate({
      appointmentId: appointment.id,
      organizationId: resolvedOrgId,
      eventType,
      previousValue,
      newValue,
      metadata,
    });
  };

  // FIX #2: Use appointment.id (not phorest_id) to align with Schedule.tsx contract
  const handleStatusChange = (status: AppointmentStatus) => {
    if (status === 'cancelled' || status === 'no_show') {
      setConfirmAction(status);
      setCancelReason('');
    } else if (status === 'confirmed') {
      // Open confirmation gate dialog
      if (isWalkIn) {
        setConfirmMethod('in_person');
        setConfirmAcknowledged(true);
      } else {
        setConfirmMethod('');
        setConfirmAcknowledged(false);
      }
      setConfirmNote('');
      setShowConfirmGate(true);
    } else {
      fireAuditLog('status_changed', { status: appointment.status }, { status });
      onStatusChange(appointment.id, status);
    }
  };

  const handleConfirmGateSubmit = () => {
    fireAuditLog(
      'status_changed',
      { status: appointment.status },
      { status: 'confirmed' },
      {
        confirmation_method: confirmMethod,
        ...(confirmNote.trim() ? { confirmation_note: confirmNote.trim() } : {}),
      },
    );
    onStatusChange(appointment.id, 'confirmed');
    setShowConfirmGate(false);
    setConfirmMethod('');
    setConfirmNote('');
    setConfirmAcknowledged(false);
  };

  const handleRevertToBooked = () => {
    fireAuditLog('status_changed', { status: 'confirmed' }, { status: 'booked' }, { reverted: true });
    onStatusChange(appointment.id, 'booked' as AppointmentStatus);
    toast.success('Appointment reverted to Booked');
  };

  const confirmStatusChange = () => {
    if (confirmAction) {
      // Append reason as a note before changing status
      if (cancelReason.trim()) {
        const prefix = confirmAction === 'cancelled' ? '[Cancelled]' : '[No Show]';
        addNote({ note: `${prefix} ${cancelReason.trim()}`, isPrivate: false });
      }
      fireAuditLog(
        confirmAction === 'cancelled' ? 'cancelled' : 'no_show',
        { status: appointment.status },
        { status: confirmAction },
        cancelReason.trim() ? { reason: cancelReason.trim() } : null,
      );
      onStatusChange(appointment.id, confirmAction);
      setConfirmAction(null);
      setCancelReason('');
    }
  };

  const handleCancelAllFuture = () => {
    if (!appointment.recurrence_group_id) return;
    setCancelFutureReason('');
    setShowCancelFutureConfirm(true);
  };

  const confirmCancelAllFuture = async () => {
    if (!appointment.recurrence_group_id) return;
    setCancellingFuture(true);
    try {
      // Add reason as a note if provided
      if (cancelFutureReason.trim()) {
        addNote({ note: `[Recurring Cancelled] ${cancelFutureReason.trim()}`, isPrivate: false });
      }
      const cancelTable = appointment._source === 'local' ? 'appointments' : 'phorest_appointments';
      const { error } = await supabase
        .from(cancelTable)
        .update({ status: 'cancelled' } as any)
        .eq('recurrence_group_id', appointment.recurrence_group_id)
        .gte('appointment_date', appointment.appointment_date)
        .neq('status', 'cancelled');
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
      toast.success('All future recurring appointments cancelled');
      setShowCancelFutureConfirm(false);
      handleClose();
    } catch (err: any) {
      toast.error('Failed to cancel future appointments', { description: err.message });
    } finally {
      setCancellingFuture(false);
    }
  };

  const handleOpenClientProfile = () => {
    if (onOpenClientProfile && appointment.phorest_client_id) {
      handleClose();
      onOpenClientProfile(appointment.phorest_client_id);
    }
  };

  // (canCancel and canDelete moved above early return)

  // Soft-delete handler
  const handleDeleteAppointment = async () => {
    if (!appointment || !user?.id) return;

    // Stylist time-window toast warnings
    if (isStylistOnly && appointment.created_by === user.id) {
      const createdAt = new Date(appointment.created_at);
      const minutesSinceCreation = (Date.now() - createdAt.getTime()) / 60000;
      if (minutesSinceCreation > 10) {
        toast.error('The 10-minute deletion window has expired. Contact a manager to remove this appointment.');
        setShowDeleteConfirm(false);
        return;
      }
      if (minutesSinceCreation >= 7) {
        toast.warning('You have less than 3 minutes remaining to delete this appointment');
      }
    }

    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!appointment || !user?.id) return;
    setIsDeleting(true);
    try {
      const table = appointment._source === 'local' ? 'appointments' : 'phorest_appointments';
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: new Date().toISOString(), deleted_by: user.id } as any)
        .eq('id', appointment.id);
      if (error) throw error;

      fireAuditLog('deleted', { status: appointment.status }, null, { deleted_by: user.id });
      queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments-hub'] });
      queryClient.invalidateQueries({ queryKey: ['live-session-snapshot'] });
      toast.success('Appointment deleted. This was removed as a data entry correction.');
      setShowDeleteConfirm(false);
      handleClose();
    } catch (err: any) {
      toast.error('Failed to delete appointment', { description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Lifecycle Step Indicator ────────────────────────────────
  const currentStepIndex = LIFECYCLE_STEPS.indexOf(appointment.status);
  const isTerminal = ['cancelled', 'no_show'].includes(appointment.status);

  // ─── Render ───────────────────────────────────────────────────
  return (
    <>
      <PremiumFloatingPanel open={open} onOpenChange={(v) => { if (!v) handleClose(); }} maxWidth="520px">

              {/* ─── Header ────────────────────────────────────── */}
              <div className="p-6 pb-4">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={cn('w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-base font-medium', avatarColor)}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                  {/* Overflow menu (Delete + Revert) */}
                  <div className="absolute top-4 right-12 z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        {/* ── Actions ── */}
                        <DropdownMenuLabel className="font-display text-[10px] text-muted-foreground uppercase tracking-wide">Actions</DropdownMenuLabel>
                        {onReschedule && !['completed', 'cancelled', 'no_show'].includes(appointment.status) && (
                          <DropdownMenuItem onClick={() => onReschedule(appointment)}>
                            <CalendarClock className="h-3.5 w-3.5 mr-2" />
                            Reschedule
                          </DropdownMenuItem>
                        )}
                        {onRebook && (
                          <DropdownMenuItem onClick={() => onRebook(appointment)}>
                            <RefreshCw className="h-3.5 w-3.5 mr-2" />
                            Rebook
                          </DropdownMenuItem>
                        )}
                        {isManagerOrAdmin && !['completed', 'cancelled', 'no_show'].includes(appointment.status) && (
                          <DropdownMenuItem onClick={() => setShowReassignDialog(true)}>
                            <ArrowRightLeft className="h-3.5 w-3.5 mr-2" />
                            Reassign Stylist
                          </DropdownMenuItem>
                        )}

                        {/* ── Navigate ── */}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="font-display text-[10px] text-muted-foreground uppercase tracking-wide">Navigate</DropdownMenuLabel>
                        {resolvedClientId && (
                          <DropdownMenuItem onClick={() => {
                            handleClose();
                            navigate(`/dashboard/clients?clientId=${resolvedClientId}`);
                          }}>
                            <ExternalLink className="h-3.5 w-3.5 mr-2" />
                            View in Client Directory
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                          <Link to={dashPath('/appointments-hub')}>
                            <Receipt className="h-3.5 w-3.5 mr-2" />
                            Transactions
                          </Link>
                        </DropdownMenuItem>

                        {/* ── Status Override ── */}
                        {(availableTransitions.includes('no_show') || (availableTransitions.includes('cancelled') && canCancel) || (isManagerOrAdmin && appointment.status === 'confirmed')) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="font-display text-[10px] text-muted-foreground uppercase tracking-wide">Status Override</DropdownMenuLabel>
                            {availableTransitions.includes('no_show') && (
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleStatusChange('no_show')} disabled={isUpdating}>
                                <AlertTriangle className="h-3.5 w-3.5 mr-2" />
                                No Show
                              </DropdownMenuItem>
                            )}
                            {availableTransitions.includes('cancelled') && canCancel && (
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleStatusChange('cancelled')} disabled={isUpdating}>
                                <XCircle className="h-3.5 w-3.5 mr-2" />
                                Cancel
                              </DropdownMenuItem>
                            )}
                            {isManagerOrAdmin && appointment.status === 'confirmed' && (
                              <DropdownMenuItem onClick={handleRevertToBooked}>
                                <RotateCcw className="h-3.5 w-3.5 mr-2" />
                                Revert to Booked
                              </DropdownMenuItem>
                            )}
                          </>
                        )}

                        {/* ── Admin ── */}
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="font-display text-[10px] text-muted-foreground uppercase tracking-wide">Admin</DropdownMenuLabel>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={handleDeleteAppointment}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete Appointment
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-lg font-medium tracking-wide truncate">{appointment.client_name}</h2>
                      {/* Walk-in badge (#7) */}
                      {isWalkIn && (
                        <Badge variant="outline" className="text-[10px] shrink-0 border-amber-300 text-amber-700 dark:text-amber-300">
                          <UserX className="h-2.5 w-2.5 mr-0.5" /> Walk-In
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {services.length > 1 ? `${services.length} services` : appointment.service_name}
                    </p>
                    {/* Last visit date (#4) */}
                    {historyLoading && !lastVisitDate && (
                      <Skeleton className="h-3 w-24 mt-1" />
                    )}
                    {lastVisitDate && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Last visit: {formatDate(parseISO(lastVisitDate), 'MMM d')}
                      </p>
                    )}
                    {/* View Client Profile */}
                    {onOpenClientProfile && appointment.phorest_client_id && (
                      <button
                        onClick={handleOpenClientProfile}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors mt-1"
                      >
                        <User className="h-3 w-3" />
                        View Profile
                        <ExternalLink className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Status + Dropdown */}
                <div className="flex items-center gap-2 mt-3">
                  <Badge className={cn(statusConfig.bg, statusConfig.text)}>
                    <StatusIcon className="h-3.5 w-3.5 mr-1" /> {statusConfig.label}
                  </Badge>
                  {appointment.status === 'confirmed' && (
                    <span className="text-xs text-muted-foreground">
                      {confirmationSource?.method && CONFIRM_METHOD_DISPLAY[confirmationSource.method]
                        ? `via ${CONFIRM_METHOD_DISPLAY[confirmationSource.method].label}`
                        : '(method unknown)'}
                    </span>
                  )}

                  {appointment.is_redo && (
                    <Badge variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                      <RotateCcw className="h-3 w-3 mr-1" /> Redo
                    </Badge>
                  )}
                  {recurrenceLabel && (
                    <Badge variant="outline" className="text-muted-foreground">
                      <Repeat className="h-3 w-3 mr-1" /> {recurrenceLabel}
                    </Badge>
                  )}
                  {appointment.is_new_client && (
                    <Badge variant="outline" className="text-emerald-700 dark:text-emerald-300 border-emerald-300">
                      <Star className="h-3 w-3 mr-1" /> New
                    </Badge>
                  )}
                  {appointment._source === 'local' ? (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                      Source: Native
                    </Badge>
                  ) : appointment._source === 'phorest' ? (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                      Source: Synced (legacy)
                    </Badge>
                  ) : null}
                </div>

                {/* Status Lifecycle Timeline */}
                {!isTerminal && (
                  <div className="flex items-center gap-1 mt-4">
                    {LIFECYCLE_STEPS.map((step, i) => {
                      const isActive = i <= currentStepIndex;
                      const isCurrent = step === appointment.status;
                      return (
                        <div key={step} className="flex-1 flex items-center gap-1">
                          <div className={cn(
                            'h-1.5 flex-1 rounded-full transition-colors',
                            isActive ? 'bg-primary' : 'bg-muted'
                          )} />
                          {isCurrent && (
                            <span className="text-[9px] font-medium text-primary font-display uppercase tracking-wider whitespace-nowrap">
                              {STATUS_CONFIG[step].label}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {isTerminal && (
                  <div className="mt-4 h-1.5 rounded-full bg-destructive/30" />
                )}
              </div>

              {/* ─── Active Payment Link Status (Wave 19) ───────── */}
              {appointment.payment_link_sent_at && resolvedOrgId && (
                <div className="px-6 pb-3">
                  <PaymentLinkStatusCard
                    appointmentId={appointment.id}
                    organizationId={resolvedOrgId}
                    totalAmountCents={Math.round((appointment.total_price || 0) * 100)}
                    paymentLinkSentAt={appointment.payment_link_sent_at}
                    paymentLinkUrl={appointment.payment_link_url}
                    paymentLinkExpiresAt={appointment.payment_link_expires_at}
                    paymentStatus={appointment.payment_status}
                    paidAt={appointment.paid_at}
                    splitPaymentTerminalIntentId={appointment.split_payment_terminal_intent_id}
                    splitPaymentLinkIntentId={appointment.split_payment_link_intent_id}
                    clientName={appointment.client_name}
                    clientEmail={appointment.client_email}
                    clientPhone={appointment.client_phone}
                    afterpaySurchargeEnabled={orgSurchargeEnabled}
                    afterpaySurchargeRate={orgSurchargeRate}
                    onChanged={() => queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] })}
                  />
                </div>
              )}

              {/* ─── Quick Actions Row (SendPay only — Rebook moved to overflow menu, Call/Text in Client Contact row) ──────────────── */}
              {(() => {
                const phone = appointment.client_phone?.trim();
                const rawEmail = clientRecord?.email?.trim();
                const isPlaceholderEmail = rawEmail
                  ? /^(na|none|noemail|test|n\/a)@/i.test(rawEmail) || !/@.+\..+/.test(rawEmail)
                  : true;
                const email = rawEmail && !isPlaceholderEmail ? rawEmail : null;
                const showSendPay =
                  !!appointment.id &&
                  !!resolvedOrgId &&
                  appointment.total_price != null &&
                  appointment.total_price > 0;

                if (!showSendPay) {
                  return null;
                }

                return (
                  <div className="px-6 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <SendToPayButton
                        appointmentId={appointment.id}
                        organizationId={resolvedOrgId!}
                        totalAmountCents={Math.round((appointment.total_price || 0) * 100)}
                        serviceName={appointment.service_name}
                        clientName={appointment.client_name}
                        clientEmail={email}
                        clientPhone={phone}
                        afterpayEnabled={orgAfterpayEnabled}
                        afterpaySurchargeEnabled={orgSurchargeEnabled}
                        afterpaySurchargeRate={orgSurchargeRate}
                        onPaymentLinkSent={() => queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] })}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* ─── Tabbed Content ───────────────────────────── */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <div className="mx-6">
                  <TabsList className="mb-0 shrink-0 w-full grid grid-cols-5 gap-1">
                    <TabsTrigger value="details" className="font-sans w-full">Details</TabsTrigger>
                    <TabsTrigger value="history" className="font-sans w-full">History</TabsTrigger>
                    <TabsTrigger value="photos" className="font-sans w-full relative gap-1.5">
                      <span>Photos</span>
                      {unviewedPhotosCount > 0 && activeTab !== 'photos' && (
                        <NavBadge count={unviewedPhotosCount} />
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="font-sans w-full relative gap-1.5">
                      <span>Notes</span>
                      {unviewedNotesCount > 0 && activeTab !== 'notes' && isWorkingThisAppointment && (
                        <NavBadge count={unviewedNotesCount} />
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="color-bar" className="font-sans gap-1.5 w-full">
                      <Beaker className="w-3.5 h-3.5" />
                      Color Bar
                    </TabsTrigger>
                  </TabsList>
                </div>

                <ScrollArea className="flex-1">
                  {/* ─── TAB: Details ──────────────────────────── */}
                  <TabsContent value="details" className="p-6 pt-4 mt-0">
                    {/* Hospitality Memory Layer — collapses to single CTA when empty (alert-fatigue safe) */}
                    <HospitalityBlock
                      organizationId={effectiveOrganization?.id}
                      clientKey={getHospitalityClientKey(appointment)}
                      firstName={appointment.client_name?.split(' ')[0]}
                    />

                    {/* Client Memory Panel */}
                    <ClientMemoryPanel
                      clientId={appointment.phorest_client_id}
                      serviceName={appointment.service_name}
                      orgId={resolvedOrgId}
                      className="-mx-4 mt-4 mb-4 border-y border-border/40 py-4"
                    />
                    <motion.div variants={staggerContainer} initial={false} animate="show" className="space-y-5">
                    {/* Notes From Booking Assistant — surfaced from Notes tab for at-a-glance client intent */}
                    {appointment.notes && (
                      <motion.div variants={staggerItem} className="mt-3 space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          <h4 className={tokens.heading.subsection}>Notes From Booking Assistant</h4>
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">{appointment.notes}</p>
                      </motion.div>
                    )}
                    {/* Redo approval actions */}
                    {appointment.is_redo && appointment.status === 'pending' && isManagerOrAdmin && (
                      <motion.div variants={staggerItem} className="flex items-center gap-2">
                        <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => approveRedo.mutate()} disabled={approveRedo.isPending || declineRedo.isPending}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve Redo
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs text-destructive hover:text-destructive" onClick={() => declineRedo.mutate()} disabled={approveRedo.isPending || declineRedo.isPending}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Decline
                        </Button>
                      </motion.div>
                    )}
                    {appointment.is_redo && appointment.status === 'pending' && !isManagerOrAdmin && (
                      <motion.div variants={staggerItem}>
                        <p className="text-xs text-amber-600 dark:text-amber-400">Awaiting manager approval</p>
                      </motion.div>
                    )}

                    {/* Linked Redos */}
                    {linkedRedos.length > 0 && (
                      <motion.div variants={staggerItem} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 border border-blue-200 dark:border-blue-800">
                        <RotateCcw className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="text-sm text-blue-700 dark:text-blue-300">
                          Redo scheduled: {linkedRedos[0].service_name || 'Service'} on {linkedRedos[0].appointment_date}
                          {linkedRedos[0].staff_name && ` with ${linkedRedos[0].staff_name}`}
                        </span>
                      </motion.div>
                    )}

                    {/* Appointment Info */}
                    <motion.div variants={staggerItem} className="space-y-2">
                      <h4 className={tokens.heading.subsection}>Appointment</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{formatDate(parseISO(appointment.appointment_date), 'EEEE, MMMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{formatTime12h(appointment.start_time)} – {formatTime12h(appointment.end_time)} ({formatMinutesToDuration(durationMinutes)})</span>
                        </div>
                        {locationName && (
                          <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{locationName}</span>
                          </div>
                        )}
                        {(appointment as any).rescheduled_at && (appointment as any).rescheduled_from_time && (
                          <div className="flex items-center gap-3">
                            <ArrowRightLeft className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" />
                            <span className="text-blue-600 dark:text-blue-400">
                              Moved from {(appointment as any).rescheduled_from_date !== appointment.appointment_date ? `${formatDate(parseISO((appointment as any).rescheduled_from_date), 'MMM d')} at ` : ''}{formatTime12h((appointment as any).rescheduled_from_time)} · {formatRelativeTime((appointment as any).rescheduled_at)}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>

                    <Separator />

                    {/* Services Breakdown -- with per-service price (#5) */}
                    <motion.div variants={staggerItem} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className={tokens.heading.subsection}>Services</h4>
                        {!['completed', 'cancelled', 'no_show'].includes((appointment.status || '').toLowerCase()) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setEditServicesOpen(true)}
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {services.map((svc, i) => {
                          const override = assignmentMap.get(svc.name);
                          return (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="truncate">{svc.name}</span>
                                {svc.category && (
                                  <Badge variant="outline" className="text-[10px] shrink-0">{svc.category}</Badge>
                                )}
                                {override && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Avatar className="h-4 w-4">
                                      <AvatarFallback className="text-[7px]">
                                        {override.assigned_staff_name.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-[11px] text-muted-foreground">{override.assigned_staff_name}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                {svc.duration && (
                                  <span className="text-muted-foreground text-xs">{formatMinutesToDuration(svc.duration)}</span>
                                )}
                                {svc.price != null && (
                                  <span className="text-xs"><BlurredAmount>{formatCurrency(svc.price)}</BlurredAmount></span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {appointment.total_price != null && (() => {
                        const subtotal = services.reduce((sum, s) => sum + (s.price ?? 0), 0);
                        const total = appointment.total_price ?? 0;
                        const discount = (appointment as any).discount_amount ?? null;
                        const tip = (appointment as any).tip_amount ?? null;
                        const original = (appointment as any).original_price ?? null;
                        const delta = subtotal > 0 ? Math.abs(subtotal - total) : 0;
                        const hasBreakdown = (discount && discount > 0) || (tip && tip > 0) || (original && original !== total);
                        const showBreakdown = subtotal > 0 && (delta > 0.01 || hasBreakdown);

                        return (
                          <div className="pt-2 border-t border-dashed space-y-1">
                            {showBreakdown && (
                              <>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>Subtotal</span>
                                  <span><BlurredAmount>{formatCurrency(subtotal)}</BlurredAmount></span>
                                </div>
                                {discount && discount > 0 && (
                                  <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                                    <span>Discount</span>
                                    <span>−<BlurredAmount>{formatCurrency(discount)}</BlurredAmount></span>
                                  </div>
                                )}
                                {tip && tip > 0 && (
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Tip</span>
                                    <span>+<BlurredAmount>{formatCurrency(tip)}</BlurredAmount></span>
                                  </div>
                                )}
                              </>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm text-muted-foreground">Total</span>
                                {!showBreakdown && subtotal > 0 && delta > 0.01 && (
                                  <TooltipProvider delayDuration={150}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="h-3 w-3 text-muted-foreground/70 cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs">
                                        Total reflects POS-applied discounts or tax. Open in POS for full breakdown.
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                              <span className="font-display text-sm font-medium">
                                <BlurredAmount>{formatCurrency(total)}</BlurredAmount>
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                      {/* Deposit Status */}
                      {appointment.deposit_required && (
                        <div className="flex items-center justify-between pt-2 border-t border-dashed">
                          <span className="text-sm text-muted-foreground">Deposit</span>
                          <div className="flex items-center gap-2">
                            {appointment.deposit_amount != null && (
                              <span className="text-xs">
                                <BlurredAmount>{formatCurrency(appointment.deposit_amount)}</BlurredAmount>
                              </span>
                            )}
                            <Badge
                              variant="outline"
                              className={cn('text-[10px]', {
                                'text-amber-600 border-amber-300': appointment.deposit_status === 'pending',
                                'text-green-600 border-green-300': appointment.deposit_status === 'collected' || appointment.deposit_status === 'held',
                                'text-blue-600 border-blue-300': appointment.deposit_status === 'applied',
                                'text-red-600 border-red-300': appointment.deposit_status === 'refunded' || appointment.deposit_status === 'forfeited',
                              })}
                            >
                              {(appointment.deposit_status || 'pending').replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      )}
                      {/* G1: Collect Deposit button — shown when deposit required but not yet held */}
                      {appointment.deposit_required && (!appointment.deposit_status || appointment.deposit_status === 'pending') && effectiveOrganization?.id && (
                        <div className="pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs"
                            onClick={async () => {
                              if (!effectiveOrganization?.id) return;
                              try {
                                const { data, error } = await supabase.functions.invoke('reconcile-till', {
                                  body: {
                                    action: 'collect_deposit',
                                    organization_id: effectiveOrganization.id,
                                    appointment_id: appointment.id,
                                    amount: Math.round((appointment.deposit_amount || 0) * 100),
                                    currency: 'usd',
                                    description: `Deposit for ${appointment.client_name || 'appointment'}`,
                                  },
                                });
                                if (error) throw error;
                                if (data?.error) throw new Error(data.error);
                                toast.success('Deposit hold placed', {
                                  description: `$${(appointment.deposit_amount || 0).toFixed(2)} held on card`,
                                });
                              } catch (e) {
                                console.error('Failed to collect deposit:', e);
                                toast.error('Failed to collect deposit', {
                                  description: (e as Error).message,
                                });
                              }
                            }}
                          >
                            <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                            Collect Deposit via Terminal
                          </Button>
                        </div>
                      )}
                    </motion.div>

                    {/* Cancellation / No-Show Fee Section */}
                    {['cancelled', 'no_show'].includes(appointment.status) && effectiveOrganization?.id && (
                      <motion.div variants={staggerItem}>
                        <CancellationFeeSection
                          appointment={appointment}
                          organizationId={effectiveOrganization.id}
                          isManagerOrAdmin={isManagerOrAdmin}
                          formatCurrency={formatCurrency}
                        />
                      </motion.div>
                    )}

                    {/* Checkout Clarity Panel — Product usage charges */}
                    {appointment.id && effectiveOrganization?.id && (
                      <motion.div variants={staggerItem}>
                        <CheckoutClarityPanel
                          appointmentId={appointment.id}
                          organizationId={effectiveOrganization.id}
                          isManagerOrAdmin={isManagerOrAdmin}
                        />
                      </motion.div>
                    )}

                    <Separator />

                    {/* Stylist + Preferred Comparison (Wave 18: identity-collapse) */}
                    <motion.div variants={staggerItem} className="space-y-2">
                      <h4 className={tokens.heading.subsection}>Stylist</h4>
                      {(() => {
                        const hasPreferred = !!(clientRecord?.preferred_stylist_id && preferredStylist);
                        const bookedName = appointment.stylist_profile?.display_name || appointment.stylist_profile?.full_name || '';
                        const preferredName = preferredStylist
                          ? (preferredStylist.display_name || preferredStylist.full_name || '')
                          : '';
                        const isSameAsPreferred = hasPreferred && (
                          preferredStylist?.user_id === appointment.stylist_user_id ||
                          (bookedName && preferredName && bookedName.trim().toLowerCase() === preferredName.trim().toLowerCase())
                        );

                        if (!appointment.stylist_profile) return null;

                        return (
                          <>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={appointment.stylist_profile.photo_url || undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {(appointment.stylist_profile.display_name || appointment.stylist_profile.full_name).slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{bookedName}</span>
                              {isSameAsPreferred && (
                                <Badge variant="outline" className="text-[10px] text-green-700 dark:text-green-300 border-green-300 gap-0.5">
                                  <Star className="h-2.5 w-2.5" /> Preferred
                                </Badge>
                              )}
                            </div>
                            {hasPreferred && !isSameAsPreferred && (
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                                  <Star className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>
                                <span className="text-sm text-muted-foreground">{getStylistDisplayName(preferredStylist)}</span>
                                <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-300 border-amber-300">
                                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Preferred — Mismatch
                                </Badge>
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {/* Assistants */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Assistants</span>
                          {canManageAssistants && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAssistantPicker(!showAssistantPicker)}>
                              <UserPlus className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                        {assistants.length > 0 ? (
                          <div className="space-y-1.5">
                            {assistants.map(a => (
                              <div key={a.id} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Avatar className="h-5 w-5 shrink-0">
                                    <AvatarImage src={a.assistant_profile?.photo_url || undefined} />
                                    <AvatarFallback className="text-[8px]">
                                      {(a.assistant_profile?.display_name || a.assistant_profile?.full_name || '?').slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm truncate">{a.assistant_profile?.display_name || a.assistant_profile?.full_name}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {canManageAssistants && (
                                    <input
                                      type="number" min={0} max={480} placeholder="min"
                                      defaultValue={a.assist_duration_minutes ?? ''}
                                      className="w-14 h-6 text-xs text-center border rounded bg-background px-1"
                                      onBlur={e => {
                                        const val = e.target.value ? parseInt(e.target.value) : null;
                                        if (val !== (a.assist_duration_minutes ?? null)) updateAssistDuration({ assignmentId: a.id, minutes: val });
                                      }}
                                    />
                                  )}
                                  {canManageAssistants && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAssistant(a.id)}>
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No assistants assigned</p>
                        )}

                        {/* Assistant picker */}
                        {showAssistantPicker && (
                          <div className="border rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto mt-2">
                            {teamMembers
                              .filter(m =>
                                m.user_id !== appointment.stylist_user_id &&
                                !assistants.some(a => a.assistant_user_id === m.user_id) &&
                                (m.roles?.includes('stylist_assistant') || m.roles?.includes('stylist') || m.roles?.includes('admin'))
                              )
                              .map(member => {
                                const conflicts = conflictMap.get(member.user_id) || [];
                                return (
                                  <button
                                    key={member.user_id}
                                    className="flex flex-col w-full p-1.5 rounded hover:bg-muted text-left text-sm"
                                    disabled={isAssigning}
                                    onClick={() => {
                                      const orgId = resolvedOrgId;
                                      if (orgId) {
                                        assignAssistant({ assistantUserId: member.user_id, organizationId: orgId });
                                        setShowAssistantPicker(false);
                                      } else {
                                        console.error('[AssistantPicker] No organization context available (effectiveOrganization and location org both null)');
                                        toast.error('Organization context not available. Please refresh the page.');
                                      }
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-5 w-5">
                                        <AvatarImage src={member.photo_url || undefined} />
                                        <AvatarFallback className="text-[8px]">{(formatName(member) || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                                      </Avatar>
                                      <span>{formatName(member)}</span>
                                      {conflicts.length > 0 && <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0 ml-auto" />}
                                    </div>
                                    {conflicts.map((c, i) => (
                                      <span key={i} className="text-[11px] text-orange-600 dark:text-orange-400 pl-7 leading-tight">
                                        {c.role === 'assistant' ? 'Assisting' : 'Busy'} {formatTime12h(c.startTime)}–{formatTime12h(c.endTime)} ({c.serviceName} for {c.clientName})
                                      </span>
                                    ))}
                                  </button>
                                );
                              })}
                          </div>
                        )}
                      </div>

                      {/* Scheduled Coverage (from assistant_time_blocks) */}
                      <ScheduledCoverageSection
                        appointmentDate={appointment.appointment_date}
                        startTime={appointment.start_time}
                        endTime={appointment.end_time}
                        locationId={appointment.location_id}
                      />
                    </motion.div>

                    <Separator />

                    {/* Client Contact (Wave 18: completeness) */}
                    <motion.div variants={staggerItem} className="space-y-2">
                      <h4 className={tokens.heading.subsection}>Client Contact</h4>
                      <div className="space-y-1.5">
                        {appointment.client_phone ? (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{formatPhoneDisplay(appointment.client_phone)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-3 rounded-full font-sans text-xs"
                                onClick={() => setCallDialogOpen(true)}
                              >
                                <Phone className="h-3 w-3 mr-1" /> Call
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-3 rounded-full font-sans text-xs"
                                onClick={() => setTextDialogOpen(true)}
                              >
                                <MessageCircle className="h-3 w-3 mr-1" /> Text
                              </Button>
                              <CopyButton onCopy={handleCopyPhone} />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            <span>No phone on file</span>
                          </div>
                        )}
                        {clientRecordLoading && (
                          <Skeleton className="h-4 w-40" />
                        )}
                        {!clientRecordLoading && clientRecord?.email && (() => {
                          const isPlaceholder = /^(na|none|noemail|test|n\/a)@/i.test(clientRecord.email) || !clientRecord.email.includes('@');
                          return (
                            <div className="flex items-center justify-between">
                              <a href={`mailto:${clientRecord.email}`} className={cn('flex items-center gap-2 text-sm hover:text-primary transition-colors', isPlaceholder && 'text-muted-foreground italic')}>
                                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                {clientRecord.email}
                                {isPlaceholder && (
                                  <Badge variant="outline" className="text-[9px] text-amber-700 dark:text-amber-300 border-amber-300 ml-1">Placeholder</Badge>
                                )}
                              </a>
                              <CopyButton onCopy={handleCopyEmail} />
                            </div>
                          );
                        })()}
                        {!clientRecordLoading && !clientRecord?.email && !isWalkIn && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            <span>No email on file</span>
                          </div>
                        )}
                        {!isWalkIn && (lastVisitDate || visitStats.visitCount > 0) && (
                          <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
                            {lastVisitDate && (
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3" />
                                Last visit {formatDate(parseISO(lastVisitDate), 'MMM d, yyyy')}
                              </span>
                            )}
                            {visitStats.visitCount > 0 && (
                              <span className="flex items-center gap-1.5">
                                <TrendingUp className="h-3 w-3" />
                                {visitStats.visitCount} visit{visitStats.visitCount === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>
                        )}
                        {!clientRecordLoading && !appointment.client_phone && !clientRecord?.email && (
                          <p className="text-xs text-muted-foreground pt-1">
                            No contact info — Add details in client profile
                          </p>
                        )}
                      </div>
                    </motion.div>

                    {/* Household Members */}
                    <HouseholdSection phorestClientId={appointment.phorest_client_id} formatDate={formatDate} />

                    {/* Client Notes Preview (read-only, collapsible) */}
                    {!isWalkIn && appointment.phorest_client_id && (
                      <>
                        <Separator />
                        <motion.div variants={staggerItem} className="space-y-2">
                          <h4 className={tokens.heading.subsection}>
                            <MessageSquare className="h-3.5 w-3.5 inline mr-1.5" />
                            Client Notes
                            {clientNotes.length > 0 && (
                              <span className="text-xs text-muted-foreground ml-1.5">({clientNotes.length})</span>
                            )}
                          </h4>
                          {clientNotesLoading ? (
                            <Skeleton className="h-12 w-full" />
                          ) : clientNotes.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No client notes</p>
                          ) : (
                            <Collapsible open={clientNotesExpanded} onOpenChange={setClientNotesExpanded}>
                              <div className="space-y-1.5">
                                {clientNotes.slice(0, 3).map(note => (
                                  <div key={note.id} className={cn('p-2 rounded-lg border text-sm', note.is_private && 'bg-muted/50 border-dashed')}>
                                    <div className="flex items-center gap-1.5">
                                      <Avatar className="h-4 w-4">
                                        <AvatarImage src={note.author?.photo_url || undefined} />
                                        <AvatarFallback className="text-[7px]">{(note.author?.display_name || note.author?.full_name || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs font-medium truncate">{note.author?.display_name || note.author?.full_name}</span>
                                      {note.is_private && <Lock className="h-2.5 w-2.5 text-muted-foreground" />}
                                      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{formatDate(new Date(note.created_at), 'MMM d')}</span>
                                    </div>
                                    <p className="mt-1 text-xs line-clamp-2 text-muted-foreground">{note.note}</p>
                                  </div>
                                ))}
                              </div>
                              {clientNotes.length > 3 && (
                                <>
                                  <CollapsibleContent>
                                    <ScrollArea className="max-h-48 mt-1.5">
                                      <div className="space-y-1.5">
                                        {clientNotes.slice(3).map(note => (
                                          <div key={note.id} className={cn('p-2 rounded-lg border text-sm', note.is_private && 'bg-muted/50 border-dashed')}>
                                            <div className="flex items-center gap-1.5">
                                              <Avatar className="h-4 w-4">
                                                <AvatarImage src={note.author?.photo_url || undefined} />
                                                <AvatarFallback className="text-[7px]">{(note.author?.display_name || note.author?.full_name || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                                              </Avatar>
                                              <span className="text-xs font-medium truncate">{note.author?.display_name || note.author?.full_name}</span>
                                              {note.is_private && <Lock className="h-2.5 w-2.5 text-muted-foreground" />}
                                              <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{formatDate(new Date(note.created_at), 'MMM d')}</span>
                                            </div>
                                            <p className="mt-1 text-xs line-clamp-2 text-muted-foreground">{note.note}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </ScrollArea>
                                  </CollapsibleContent>
                                  <CollapsibleTrigger asChild>
                                    <button className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-1.5 transition-colors">
                                      {clientNotesExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                      {clientNotesExpanded ? 'Show less' : `Show all ${clientNotes.length} notes`}
                                    </button>
                                  </CollapsibleTrigger>
                                </>
                              )}
                            </Collapsible>
                          )}
                        </motion.div>
                      </>
                    )}

                    {/* Appointment Notes Preview (2 most recent, read-only) */}
                    {notes.length > 0 && (
                      <>
                        <Separator />
                        <motion.div variants={staggerItem} className="space-y-2">
                          <h4 className={tokens.heading.subsection}>
                            <MessageSquare className="h-3.5 w-3.5 inline mr-1.5" />
                            Appointment Notes
                            <span className="text-xs text-muted-foreground ml-1.5">({notes.length})</span>
                          </h4>
                          <div className="space-y-1.5">
                            {notes.slice(0, 2).map(note => (
                              <div key={note.id} className={cn('p-2 rounded-lg border text-sm', note.is_private && 'bg-muted/50 border-dashed')}>
                                <div className="flex items-center gap-1.5">
                                  <Avatar className="h-4 w-4">
                                    <AvatarImage src={note.author?.photo_url || undefined} />
                                    <AvatarFallback className="text-[7px]">{(note.author?.display_name || note.author?.full_name || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs font-medium truncate">{note.author?.display_name || note.author?.full_name}</span>
                                  {note.is_private && <Lock className="h-2.5 w-2.5 text-muted-foreground" />}
                                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{formatDate(new Date(note.created_at), 'MMM d')}</span>
                                </div>
                                <p className="mt-1 text-xs line-clamp-2 text-muted-foreground">{note.note}</p>
                              </div>
                            ))}
                          </div>
                          {notes.length > 2 && (
                            <button
                              onClick={() => setActiveTab('notes')}
                              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                            >
                              View all {notes.length} notes in Notes tab
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          )}
                        </motion.div>
                      </>
                    )}

                    {/* Removed duplicate Booking Notes from Details tab (#11) -- kept only in Notes tab */}

                    {/* Recurrence cancel */}
                    {recurrenceLabel && (
                      <motion.div variants={staggerItem}>
                        <Separator className="mb-5" />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{recurrenceLabel}</span>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={handleCancelAllFuture} disabled={cancellingFuture}>
                            {cancellingFuture ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                            Cancel all future
                          </Button>
                        </div>
                      </motion.div>
                    )}
                    </motion.div>
                  </TabsContent>

                  {/* ─── TAB: History ─────────────────────────── */}
                  <TabsContent value="history" className="p-6 pt-4 mt-0">
                    <motion.div variants={staggerContainer} initial={false} animate="show" className="space-y-5">
                    {/* Walk-in: collapse history for non-clients (#7) */}
                    {isWalkIn ? (
                      <motion.div variants={staggerItem} className="text-center py-8">
                        <UserX className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Walk-in client — no history available</p>
                      </motion.div>
                    ) : (
                    <>
                    {/* Stats -- now 4 tiles with visit frequency (#6) */}
                    <motion.div variants={staggerItem} className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-border bg-card p-3 text-center">
                        <p className={tokens.kpi.label}>{visitStats.visitCount}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Visits</p>
                      </div>
                      <div className="rounded-xl border border-border bg-card p-3 text-center">
                        <p className={tokens.kpi.label}><BlurredAmount>{formatCurrency(visitStats.totalSpend)}</BlurredAmount></p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Total Spend</p>
                      </div>
                      <div className="rounded-xl border border-border bg-card p-3 text-center">
                        <p className={tokens.kpi.label}>
                          {visitStats.tenure != null
                            ? visitStats.tenure < 30 ? 'New' : `${Math.floor(visitStats.tenure / 30)}mo`
                            : '—'}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Tenure</p>
                      </div>
                      <div className="rounded-xl border border-border bg-card p-3 text-center">
                        <p className={tokens.kpi.label}>
                          {visitStats.avgFrequencyWeeks != null
                            ? `${visitStats.avgFrequencyWeeks}w`
                            : '—'}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Avg Frequency</p>
                      </div>
                    </motion.div>

                    {/* Top Services */}
                    {topServices.length > 0 && (
                      <motion.div variants={staggerItem} className="space-y-2">
                        <h4 className={tokens.heading.subsection}>Top Services</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {topServices.map(svc => (
                            <Badge key={svc.name} variant="outline" className="text-xs gap-1">
                              {svc.name}
                              <span className="text-muted-foreground">×{svc.count}</span>
                            </Badge>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    <Separator />

                    {/* Visit Timeline */}
                    <motion.div variants={staggerItem} className="space-y-2">
                      <h4 className={tokens.heading.subsection}>Visit History</h4>
                      {historyLoading ? (
                        <DashboardLoader size="sm" className="py-6" />
                      ) : visitHistory.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">First visit with you — no history yet</p>
                      ) : (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {visitHistory.slice(0, 20).map(visit => (
                            <div key={visit.id} className="flex items-start gap-3 text-sm py-2 border-b border-border/50 last:border-0">
                              <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="truncate font-medium">{visit.service_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(parseISO(visit.appointment_date), 'MMM d, yyyy')}
                                  {visit.stylist_name && ` · ${visit.stylist_name}`}
                                </p>
                              </div>
                              {visit.total_price != null && (
                                <span className="text-xs text-muted-foreground shrink-0">
                                  <BlurredAmount>{formatCurrency(visit.total_price)}</BlurredAmount>
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                    </>
                    )}
                    </motion.div>
                  </TabsContent>

                  {/* ─── TAB: Notes ───────────────────────────── */}
                  <TabsContent value="notes" className="p-6 pt-4 mt-0">
                    <motion.div variants={staggerContainer} initial={false} animate="show" className="space-y-5">
                    {/* Appointment Notes */}
                    <motion.div variants={staggerItem} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={tokens.heading.subsection}>
                          {notesScope === 'this' ? 'Appointment Notes' : 'Client Note History'}
                        </h4>
                        {appointment.phorest_client_id && (
                          <ToggleGroup
                            type="single"
                            value={notesScope}
                            onValueChange={(v) => v && setNotesScope(v as 'this' | 'all')}
                            size="sm"
                            className="h-7"
                          >
                            <ToggleGroupItem value="this" className="h-7 px-2 text-xs">
                              This Appointment
                            </ToggleGroupItem>
                            <ToggleGroupItem value="all" className="h-7 px-2 text-xs">
                              All Visits
                              {clientAptNotes.length > 0 && (
                                <span className="ml-1.5 text-[10px] text-muted-foreground">
                                  {clientAptNotes.length}
                                </span>
                              )}
                            </ToggleGroupItem>
                          </ToggleGroup>
                        )}
                      </div>

                      {notesScope === 'this' ? (
                        <>
                          {notes.length > 0 ? (
                            <div className="space-y-2">
                              {notes.map(note => (
                                <div key={note.id} className={cn('p-3 rounded-lg border text-sm', note.is_private && 'bg-muted/50 border-dashed')}>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-5 w-5">
                                        <AvatarImage src={note.author?.photo_url || undefined} />
                                        <AvatarFallback className="text-[8px]">{(note.author?.display_name || note.author?.full_name || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                                      </Avatar>
                                      <span className="font-medium text-sm">{note.author?.display_name || note.author?.full_name}</span>
                                      {note.is_private && <Lock className="h-3 w-3 text-muted-foreground" />}
                                    </div>
                                    {note.author_id === user?.id && (
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteNote(note.id)}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                  <p className="mt-1">{note.note}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(new Date(note.created_at), 'MMM d, yyyy · h:mm a')}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">No notes on this appointment</p>
                              {appointment.phorest_client_id && clientAptNotes.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setNotesScope('all')}
                                  className="text-xs text-primary hover:underline"
                                >
                                  {clientAptNotes.length} {clientAptNotes.length === 1 ? 'note' : 'notes'} from past visits — view all
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {clientAptNotesLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : clientAptNotes.length > 0 ? (
                            <div className="space-y-2">
                              {clientAptNotes.map(note => {
                                const statusKey = (note.appointment?.status?.toLowerCase() ?? 'pending') as keyof typeof APPOINTMENT_STATUS_BADGE;
                                const statusCfg = APPOINTMENT_STATUS_BADGE[statusKey] ?? APPOINTMENT_STATUS_BADGE.pending;
                                const isCurrentApt = note.phorest_appointment_id === appointment.phorest_id;
                                return (
                                  <div key={note.id} className={cn('p-3 rounded-lg border text-sm', note.is_private && 'bg-muted/50 border-dashed', isCurrentApt && 'ring-1 ring-primary/40')}>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-5 w-5">
                                          <AvatarImage src={note.author?.photo_url || undefined} />
                                          <AvatarFallback className="text-[8px]">{(note.author?.display_name || note.author?.full_name || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium text-sm">{note.author?.display_name || note.author?.full_name}</span>
                                        {note.is_private && <Lock className="h-3 w-3 text-muted-foreground" />}
                                        {isCurrentApt && (
                                          <span className="text-[10px] uppercase tracking-wide text-primary font-medium">This Visit</span>
                                        )}
                                      </div>
                                      <span className="text-xs text-muted-foreground shrink-0">
                                        {formatDate(new Date(note.created_at), 'MMM d, yyyy · h:mm a')}
                                      </span>
                                    </div>
                                    <p className="mt-1">{note.note}</p>
                                    {note.appointment && (
                                      <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                                        <span>From:</span>
                                        <span className="font-medium text-foreground">{note.appointment.service_name}</span>
                                        <span>·</span>
                                        <span>{formatDate(parseISO(note.appointment.appointment_date), 'MMM d, yyyy')}</span>
                                        <span>·</span>
                                        <span className={cn('px-1.5 py-0.5 rounded border text-[10px] font-medium', statusCfg.bg, statusCfg.text, statusCfg.border)}>
                                          {statusCfg.label}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No notes yet for this client</p>
                          )}
                        </>
                      )}

                      {/* Add Appointment Note (always writes to current appointment) */}
                      {canAddNotes && (
                        <div className="space-y-2 mt-3">
                          <Textarea placeholder="Add note to this appointment..." value={newNote} onChange={e => setNewNote(e.target.value)} rows={2} />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Switch id="apt-private" checked={isPrivateNote} onCheckedChange={setIsPrivateNote} />
                              <Label htmlFor="apt-private" className="text-xs flex items-center gap-1"><Lock className="h-3 w-3" /> Private</Label>
                            </div>
                            <Button size={tokens.button.inline} onClick={handleAddNote} disabled={!newNote.trim() || isAdding}>
                              {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5 mr-1" />}
                              Add
                            </Button>
                          </div>
                        </div>
                      )}
                    </motion.div>

                    <Separator />

                    {/* Client Notes -- collapsed for walk-ins (#7) */}
                    {!isWalkIn && (
                    <motion.div variants={staggerItem} className="space-y-2">
                      <h4 className={tokens.heading.subsection}>Client Notes</h4>
                      {clientNotesLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : clientNotes.length > 0 ? (
                        <div className="space-y-2">
                          {clientNotes.map(note => (
                            <div key={note.id} className={cn('p-3 rounded-lg border text-sm', note.is_private && 'bg-muted/50 border-dashed')}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage src={note.author?.photo_url || undefined} />
                                    <AvatarFallback className="text-[8px]">{(note.author?.display_name || note.author?.full_name || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-sm">{note.author?.display_name || note.author?.full_name}</span>
                                  {note.is_private && <Lock className="h-3 w-3 text-muted-foreground" />}
                                </div>
                                {note.user_id === user?.id && (
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteClientNote.mutate({ noteId: note.id, clientId: appointment.phorest_client_id! })}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <p className="mt-1">{note.note}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{formatDate(new Date(note.created_at), 'MMM d, h:mm a')}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No client notes</p>
                      )}

                      {/* Add Client Note */}
                      {canAddNotes && appointment.phorest_client_id && (
                        <div className="space-y-2 mt-3">
                          <Textarea placeholder="Add client note..." value={newClientNote} onChange={e => setNewClientNote(e.target.value)} rows={2} />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Switch id="client-private" checked={isPrivateClientNote} onCheckedChange={setIsPrivateClientNote} />
                              <Label htmlFor="client-private" className="text-xs flex items-center gap-1"><Lock className="h-3 w-3" /> Private</Label>
                            </div>
                            <Button size={tokens.button.inline} onClick={handleAddClientNote} disabled={!newClientNote.trim() || addClientNote.isPending}>
                              {addClientNote.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5 mr-1" />}
                              Add
                            </Button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                    )}

                    {/* Notes From Booking Assistant -- canonical location (#11) */}
                    {appointment.notes && (
                      <motion.div variants={staggerItem}>
                        <Separator className="mb-5" />
                        <div className="space-y-1">
                          <h4 className={tokens.heading.subsection}>Notes From Booking Assistant</h4>
                          <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                        </div>
                      </motion.div>
                    )}
                    </motion.div>
                  </TabsContent>

                  {/* ─── TAB: Photos ──────────────────────────── */}
                  <TabsContent value="photos" className="p-6 pt-4 mt-0">
                    {resolvedClientId ? (
                      <>
                        <InspirationPhotosSection clientId={resolvedClientId} />
                        <TransformationTimeline
                          clientId={resolvedClientId}
                          phorestClientId={resolvedClientId}
                        />
                      </>
                    ) : appointment.client_name ? (
                      <div className={tokens.empty.container}>
                        <Camera className={tokens.empty.icon} />
                        <h3 className={tokens.empty.heading}>{appointment.client_name} isn't in your client list yet</h3>
                        <p className={tokens.empty.description}>
                          Add {appointment.client_name.split(' ')[0]} as a client to start tracking transformation photos.
                        </p>
                      </div>
                    ) : (
                      <div className={tokens.empty.container}>
                        <Camera className={tokens.empty.icon} />
                        <h3 className={tokens.empty.heading}>Walk-in appointment</h3>
                        <p className={tokens.empty.description}>
                          Add client details to this appointment to track transformation photos.
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* ─── TAB: Color Bar (unified) ──────────────── */}
                  <TabsContent value="color-bar" className="p-6 pt-4 mt-0">
                    {colorBarEntitled ? (
                      <Tabs defaultValue="today" className="w-full">
                        <SubTabsList>
                          <SubTabsTrigger value="today">Today's Mix</SubTabsTrigger>
                          <SubTabsTrigger value="history">Formula History</SubTabsTrigger>
                        </SubTabsList>
                        <TabsContent value="today" className="mt-4">
                          <ColorBarTab
                            appointment={appointment}
                            organizationId={effectiveOrganization?.id ?? ''}
                          />
                        </TabsContent>
                        <TabsContent value="history" className="mt-4">
                          <ClientFormulaHistoryTab clientId={appointment.phorest_client_id} />
                        </TabsContent>
                      </Tabs>
                    ) : (
                      <ColorBarUpsellInline
                        isPendingActivation={isColorBarPendingActivation}
                        onActivate={() =>
                          navigate(
                            isColorBarPendingActivation
                              ? dashPath('/admin/color-bar-settings')
                              : dashPath('/apps'),
                          )
                        }
                      />
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>

              {/* ─── Payment Link Status ────────────────────── */}
              {appointment.payment_link_sent_at && (
                <div className="px-4 py-2.5 border-t border-border/60 bg-card/40 shrink-0">
                  <PaymentLinkStatusBadge
                    paymentLinkSentAt={appointment.payment_link_sent_at}
                    paymentLinkUrl={appointment.payment_link_url}
                    paymentLinkExpiresAt={appointment.payment_link_expires_at}
                    splitPaymentTerminalIntentId={appointment.split_payment_terminal_intent_id}
                    splitPaymentLinkIntentId={appointment.split_payment_link_intent_id}
                    paidAt={appointment.paid_at}
                    paymentStatus={appointment.payment_status}
                    onResend={handleResendPaymentLink}
                    isResending={isResendingLink}
                  />
                </div>
              )}

              {/* ─── Footer Action Bar (Lifecycle Only) ────────── */}
              {(availableTransitions.includes('confirmed') || availableTransitions.includes('checked_in') || availableTransitions.includes('completed')) && (
                <div className="p-4 border-t border-border/60 bg-card/60 backdrop-blur-md shrink-0">
                  <div className="flex items-center gap-2">
                    {/* Confirm */}
                    {availableTransitions.includes('confirmed') && (
                      <Button size={tokens.button.card} onClick={() => handleStatusChange('confirmed')} disabled={isUpdating} className="flex-1">
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Confirm
                      </Button>
                    )}
                    {/* Check In */}
                    {availableTransitions.includes('checked_in') && (
                      <Button size={tokens.button.card} onClick={() => handleStatusChange('checked_in')} disabled={isUpdating} className="flex-1">
                        <UserCheck className="h-3.5 w-3.5 mr-1" /> Check In
                      </Button>
                    )}
                    {/* Pay / Checkout */}
                    {availableTransitions.includes('completed') && onPay && (
                      <Button size={tokens.button.card} onClick={() => onPay(appointment)} disabled={isUpdating} className="flex-1">
                        <CreditCard className="h-3.5 w-3.5 mr-1" /> Pay
                      </Button>
                    )}
                    {/* Complete (if no pay handler) */}
                    {availableTransitions.includes('completed') && !onPay && (
                      <Button size={tokens.button.card} onClick={() => handleStatusChange('completed')} disabled={isUpdating} className="flex-1">
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Complete
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </PremiumFloatingPanel>

      {/* Wave 22.5 — Zura-native call/text dialogs */}
      {appointment.client_phone && resolvedOrgId && (
        <>
          <ContactActionDialog
            mode="call"
            open={callDialogOpen}
            onOpenChange={setCallDialogOpen}
            clientName={appointment.client_name || 'Client'}
            phone={appointment.client_phone}
            organizationId={resolvedOrgId}
            clientId={clientRecord?.id ?? null}
            appointmentId={appointment.id ?? null}
          />
          <ContactActionDialog
            mode="text"
            open={textDialogOpen}
            onOpenChange={setTextDialogOpen}
            clientName={appointment.client_name || 'Client'}
            phone={appointment.client_phone}
            organizationId={resolvedOrgId}
            clientId={clientRecord?.id ?? null}
            appointmentId={appointment.id ?? null}
          />
        </>
      )}

      {/* Confirmation Dialog (Cancel / No Show) */}
      <div>
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) { setConfirmAction(null); setCancelReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'cancelled' ? 'Cancel Appointment?' : 'Mark as No Show?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'cancelled'
                ? 'This will cancel the appointment. The client may need to be notified.'
                : 'This will mark the client as a no-show for this appointment.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <Textarea
              placeholder={confirmAction === 'cancelled' ? 'Reason for cancellation (optional)...' : 'Reason for no-show (optional)...'}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              className={confirmAction === 'no_show' ? 'bg-destructive text-destructive-foreground' : ''}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>

      {/* Recurring Cancel Confirmation Dialog */}
      <div>
      <AlertDialog open={showCancelFutureConfirm} onOpenChange={(open) => { if (!open) { setShowCancelFutureConfirm(false); setCancelFutureReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel All Future Recurring?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel this and all future appointments in this recurring series.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <Textarea
              placeholder="Reason for cancellation (optional)..."
              value={cancelFutureReason}
              onChange={e => setCancelFutureReason(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelAllFuture} disabled={cancellingFuture}>
              {cancellingFuture && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Cancel All Future
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>

      {/* Delete Confirmation Dialog */}
      <div>
      <AlertDialog open={showDeleteConfirm} onOpenChange={(open) => { if (!open) setShowDeleteConfirm(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              {isManagerOrAdmin
                ? 'This will permanently remove this appointment from all records. This is not a cancellation — no fee or notification will be applied.'
                : 'This will remove this appointment as a data entry correction. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>

      {/* Confirmation Gate Dialog */}
      <Dialog open={showConfirmGate} onOpenChange={(open) => { if (!open) setShowConfirmGate(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base tracking-wide">Confirm Appointment</DialogTitle>
            <DialogDescription>How was the client informed about this appointment?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <RadioGroup value={confirmMethod} onValueChange={setConfirmMethod} className="space-y-2">
              {[
                { value: 'called', icon: Phone, label: 'Called Client' },
                { value: 'texted', icon: MessageSquare, label: 'Texted Client' },
                { value: 'emailed', icon: Mail, label: 'Emailed Client' },
                { value: 'in_person', icon: User, label: 'Spoke In Person' },
                { value: 'other', icon: MoreHorizontal, label: 'Other' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={opt.value} id={`confirm-${opt.value}`} />
                  <opt.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </RadioGroup>
            <Textarea
              placeholder="Additional notes (optional)..."
              value={confirmNote}
              onChange={e => setConfirmNote(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <div className="flex items-start gap-2">
              <Checkbox
                id="confirm-acknowledged"
                checked={confirmAcknowledged}
                onCheckedChange={(checked) => setConfirmAcknowledged(checked === true)}
              />
              <label htmlFor="confirm-acknowledged" className="text-sm leading-tight cursor-pointer">
                Client has been informed and acknowledged
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmGate(false)}>Go Back</Button>
            <Button
              onClick={handleConfirmGateSubmit}
              disabled={!confirmMethod || !confirmAcknowledged || isUpdating}
            >
              {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Mark as Confirmed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Stylist Dialog */}
      <Dialog open={showReassignDialog} onOpenChange={(open) => { if (!open) { setShowReassignDialog(false); setSelectedNewStylist(null); setReassignMode('entire'); setPerServiceSelections({}); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base tracking-wide">Reassign Stylist</DialogTitle>
            <DialogDescription>
              {services.length > 1
                ? 'Reassign the entire appointment or individual services.'
                : 'Select a new stylist for this appointment.'}
            </DialogDescription>
          </DialogHeader>

          {/* Mode toggle -- only show for multi-service appointments */}
          {services.length > 1 && (
            <ToggleGroup
              type="single"
              value={reassignMode}
              onValueChange={(v) => { if (v) setReassignMode(v as 'entire' | 'individual'); }}
              className="w-full border rounded-lg p-1"
            >
              <ToggleGroupItem value="entire" className="flex-1 text-xs data-[state=on]:bg-primary/10">
                Entire Appointment
              </ToggleGroupItem>
              <ToggleGroupItem value="individual" className="flex-1 text-xs data-[state=on]:bg-primary/10">
                Individual Services
              </ToggleGroupItem>
            </ToggleGroup>
          )}

          {reassignMode === 'entire' ? (
            <>
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-1 p-1">
                  {teamMembers
                    .filter(m =>
                      m.user_id !== appointment.stylist_user_id &&
                      (m.roles?.includes('stylist') || m.roles?.includes('admin'))
                    )
                    .map(member => {
                      const conflicts = conflictMap.get(member.user_id) || [];
                      const isSelected = selectedNewStylist === member.user_id;
                      return (
                        <button
                          key={member.user_id}
                          className={cn(
                            'flex flex-col w-full p-3 rounded-lg text-left text-sm transition-colors',
                            isSelected ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted',
                          )}
                          onClick={() => setSelectedNewStylist(member.user_id)}
                        >
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={member.photo_url || undefined} />
                              <AvatarFallback className="text-[9px]">{(formatName(member) || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{formatName(member)}</span>
                            {conflicts.length > 0 && (
                              <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-300 border-amber-300 ml-auto shrink-0">
                                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          {conflicts.map((c, ci) => (
                            <span key={ci} className="text-[11px] text-amber-600 dark:text-amber-400 pl-9 leading-tight mt-0.5">
                              {c.role === 'assistant' ? 'Assisting' : 'Busy'} {formatTime12h(c.startTime)}–{formatTime12h(c.endTime)} ({c.serviceName})
                            </span>
                          ))}
                        </button>
                      );
                    })}
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowReassignDialog(false); setSelectedNewStylist(null); }}>Cancel</Button>
                <Button
                  onClick={() => selectedNewStylist && reassignStylist.mutate({ newStylistUserId: selectedNewStylist })}
                  disabled={!selectedNewStylist || reassignStylist.isPending}
                >
                  {reassignStylist.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                  Reassign
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              {/* Individual Services mode */}
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-3 p-1">
                  {services.map((svc, si) => {
                    const currentOverride = assignmentMap.get(svc.name);
                    const selectedId = perServiceSelections[svc.name] || currentOverride?.assigned_user_id || appointment.stylist_user_id;
                    const isDefault = selectedId === appointment.stylist_user_id && !perServiceSelections[svc.name] && !currentOverride;

                    return (
                      <div key={si} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{svc.name}</span>
                            {svc.category && <Badge variant="outline" className="text-[10px]">{svc.category}</Badge>}
                            {svc.duration && <span className="text-xs text-muted-foreground">{formatMinutesToDuration(svc.duration)}</span>}
                          </div>
                          {isDefault && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                        </div>
                        <div className="space-y-0.5">
                          {teamMembers
                            .filter(m => m.roles?.includes('stylist') || m.roles?.includes('admin'))
                            .slice(0, 8)
                            .map(member => {
                              const conflicts = conflictMap.get(member.user_id) || [];
                              const isActive = selectedId === member.user_id;
                              return (
                                <button
                                  key={member.user_id}
                                  className={cn(
                                    'flex items-center gap-2 w-full p-2 rounded-md text-left text-sm transition-colors',
                                    isActive ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted',
                                  )}
                                  onClick={() => setPerServiceSelections(prev => ({ ...prev, [svc.name]: member.user_id }))}
                                >
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={member.photo_url || undefined} />
                                    <AvatarFallback className="text-[8px]">{(formatName(member) || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{formatName(member)}</span>
                                  {member.user_id === appointment.stylist_user_id && (
                                    <Badge variant="outline" className="text-[9px] ml-auto">Lead</Badge>
                                  )}
                                  {conflicts.length > 0 && (
                                    <Badge variant="outline" className="text-[9px] text-amber-700 dark:text-amber-300 border-amber-300 ml-auto shrink-0">
                                      <AlertTriangle className="h-2 w-2 mr-0.5" />{conflicts.length}
                                    </Badge>
                                  )}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowReassignDialog(false); setPerServiceSelections({}); }}>Cancel</Button>
                <Button
                  onClick={async () => {
                    if (!resolvedOrgId || !appointment.id) return;
                    const assignments = Object.entries(perServiceSelections)
                      .filter(([, userId]) => userId !== appointment.stylist_user_id)
                      .map(([serviceName, userId]) => {
                        const member = teamMembers.find(m => m.user_id === userId);
                        return {
                          serviceName,
                          userId,
                          staffName: member?.display_name || member?.full_name || 'Unknown',
                        };
                      });
                    if (assignments.length === 0) {
                      toast.info('No changes to save');
                      return;
                    }
                    try {
                      await upsertAssignments.mutateAsync({
                        appointmentId: appointment.id,
                        organizationId: resolvedOrgId,
                        assignments,
                      });
                      for (const a of assignments) {
                        const oldAssignment = assignmentMap.get(a.serviceName);
                        const oldName = oldAssignment?.assigned_staff_name || appointment.stylist_profile?.display_name || 'Default';
                        fireAuditLog('service_reassigned', { service: a.serviceName, stylist: oldName }, { service: a.serviceName, stylist: a.staffName });
                      }
                      toast.success(`${assignments.length} service${assignments.length > 1 ? 's' : ''} reassigned`);
                      setShowReassignDialog(false);
                      setPerServiceSelections({});
                    } catch (err: any) {
                      toast.error('Failed to save service assignments', { description: err.message });
                    }
                  }}
                  disabled={Object.keys(perServiceSelections).length === 0 || upsertAssignments.isPending}
                >
                  {upsertAssignments.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                  Save Assignments
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {appointment && (
        <EditServicesDialog
          open={editServicesOpen}
          onOpenChange={setEditServicesOpen}
          currentServices={services.map(s => s.name)}
          locationId={appointment.location_id}
          isSaving={updateServicesMutation.isPending}
          onSave={(newServices: ServiceEntry[]) => {
            updateServicesMutation.mutate({
              appointmentId: appointment.id,
              organizationId: resolvedOrgId || '',
              services: newServices,
              previousServiceName: appointment.service_name,
            }, {
              onSuccess: () => setEditServicesOpen(false),
            });
          }}
        />
      )}
    </>
  );
}
