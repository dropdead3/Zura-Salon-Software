import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { parseISO, differenceInDays } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAppointmentNotes } from '@/hooks/useAppointmentNotes';
import { useClientNotes, useAddClientNote, useDeleteClientNote } from '@/hooks/useClientNotes';
import { useClientVisitHistory } from '@/hooks/useClientVisitHistory';
import { useAppointmentAssistants } from '@/hooks/useAppointmentAssistants';
import { useAssistantConflictCheck } from '@/hooks/useAssistantConflictCheck';
import { usePreferredStylist, getStylistDisplayName } from '@/hooks/usePreferredStylist';
import { useTeamDirectory } from '@/hooks/useEmployeeProfile';
import { useServiceLookup } from '@/hooks/useServiceLookup';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  Phone, Mail, Calendar, Clock, User, MapPin, DollarSign,
  ChevronDown, Copy, CheckCircle, UserCheck, XCircle, AlertTriangle,
  MessageSquare, Lock, Trash2, Loader2, UserPlus, X, Repeat, RotateCcw,
  CreditCard, CalendarClock, RefreshCw, Star, TrendingUp,
} from 'lucide-react';
import { cn, formatPhoneDisplay } from '@/lib/utils';
import { toast } from 'sonner';
import { tokens } from '@/lib/design-tokens';
import { getClientInitials, getAvatarColor } from '@/lib/appointment-card-utils';
import type { PhorestAppointment, AppointmentStatus } from '@/hooks/usePhorestCalendar';

// ─── Status Config ──────────────────────────────────────────────
const STATUS_CONFIG: Record<AppointmentStatus, {
  bg: string; text: string; label: string; icon: React.ElementType;
}> = {
  pending:    { bg: 'bg-amber-100 dark:bg-amber-900/50',  text: 'text-amber-800 dark:text-amber-300',  label: 'Pending',    icon: Clock },
  booked:     { bg: 'bg-slate-100 dark:bg-slate-800',      text: 'text-slate-700 dark:text-slate-300',  label: 'Booked',     icon: Calendar },
  confirmed:  { bg: 'bg-green-100 dark:bg-green-900/50',   text: 'text-green-800 dark:text-green-300',  label: 'Confirmed',  icon: CheckCircle },
  checked_in: { bg: 'bg-blue-100 dark:bg-blue-900/50',     text: 'text-blue-800 dark:text-blue-300',    label: 'Checked In', icon: UserCheck },
  completed:  { bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-800 dark:text-purple-300',label: 'Completed',  icon: CheckCircle },
  cancelled:  { bg: 'bg-gray-100 dark:bg-gray-800',        text: 'text-gray-600 dark:text-gray-400',    label: 'Cancelled',  icon: XCircle },
  no_show:    { bg: 'bg-red-100 dark:bg-red-900/50',       text: 'text-red-800 dark:text-red-300',      label: 'No Show',    icon: AlertTriangle },
};

const STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  booked: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

const LIFECYCLE_STEPS: AppointmentStatus[] = ['booked', 'confirmed', 'checked_in', 'completed'];

function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function getDurationMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
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
}: AppointmentDetailSheetProps) {
  const { user, hasPermission, roles } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const { formatCurrency } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const queryClient = useQueryClient();

  const [newNote, setNewNote] = useState('');
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [confirmAction, setConfirmAction] = useState<AppointmentStatus | null>(null);
  const [showAssistantPicker, setShowAssistantPicker] = useState(false);
  const [cancellingFuture, setCancellingFuture] = useState(false);
  const [newClientNote, setNewClientNote] = useState('');
  const [isPrivateClientNote, setIsPrivateClientNote] = useState(false);

  const isManagerOrAdmin = roles.some(r => ['admin', 'super_admin', 'manager'].includes(r));
  const canAddNotes = hasPermission('add_appointment_notes');
  const canManageAssistants = hasPermission('create_appointments') || hasPermission('view_team_appointments');

  // ─── Data Hooks ────────────────────────────────────────────────
  const { notes, addNote, deleteNote, isAdding } = useAppointmentNotes(appointment?.phorest_id || null);
  const { assistants, assignAssistant, removeAssistant, updateAssistDuration, isAssigning } = useAppointmentAssistants(appointment?.id || null);
  const { data: clientNotes = [], isLoading: clientNotesLoading } = useClientNotes(appointment?.phorest_client_id || undefined);
  const addClientNote = useAddClientNote();
  const deleteClientNote = useDeleteClientNote();
  const { data: visitHistory = [], isLoading: historyLoading } = useClientVisitHistory(appointment?.phorest_client_id);
  const { data: serviceLookup } = useServiceLookup();

  // Fetch client email + preferred_stylist_id from phorest_clients
  const { data: clientRecord } = useQuery({
    queryKey: ['client-record-for-panel', appointment?.phorest_client_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phorest_clients')
        .select('email, preferred_stylist_id, client_since')
        .eq('phorest_client_id', appointment!.phorest_client_id!)
        .maybeSingle();
      if (error) throw error;
      return data;
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
        .from('phorest_appointments')
        .select('id, appointment_date, stylist_user_id, service_name, status')
        .eq('original_appointment_id', appointment.id)
        .not('status', 'in', '("cancelled")');
      const results = (phorestRedos || []).map(r => ({
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
  });

  // Redo mutations
  const approveRedo = useMutation({
    mutationFn: async () => {
      if (!appointment?.id || !user?.id) throw new Error('Missing data');
      const { error } = await supabase.from('phorest_appointments').update({ redo_approved_by: user.id, status: 'confirmed' }).eq('id', appointment.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] }); toast.success('Redo approved'); },
    onError: (e: Error) => toast.error('Failed to approve redo', { description: e.message }),
  });

  const declineRedo = useMutation({
    mutationFn: async () => {
      if (!appointment?.id) throw new Error('Missing data');
      const { error } = await supabase.from('phorest_appointments').update({ status: 'cancelled', notes: (appointment.notes || '') + '\n[Redo declined]' }).eq('id', appointment.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] }); toast.success('Redo declined'); handleClose(); },
    onError: (e: Error) => toast.error('Failed to decline redo', { description: e.message }),
  });

  // Team for assistant picker
  const { data: teamMembers = [] } = useTeamDirectory(undefined, { organizationId: effectiveOrganization?.id });
  const conflictMap = useAssistantConflictCheck(
    appointment?.appointment_date || null,
    appointment?.start_time || null,
    appointment?.end_time || null,
    appointment?.id || null,
    showAssistantPicker,
  );

  // ─── Derived Data ─────────────────────────────────────────────
  const services = useMemo(() => {
    if (!appointment?.service_name) return [];
    return appointment.service_name.split(',').map(s => s.trim()).filter(Boolean).map(name => {
      const info = serviceLookup?.get(name);
      return { name, duration: info?.duration_minutes || null, category: info?.category || null };
    });
  }, [appointment?.service_name, serviceLookup]);

  const durationMinutes = appointment ? getDurationMinutes(appointment.start_time, appointment.end_time) : 0;

  const visitStats = useMemo(() => {
    const completed = visitHistory.filter(v => v.status === 'completed');
    const totalSpend = completed.reduce((sum, v) => sum + (v.total_price || 0), 0);
    const tenure = clientRecord?.client_since
      ? differenceInDays(new Date(), parseISO(clientRecord.client_since))
      : null;
    return { visitCount: completed.length, totalSpend, tenure };
  }, [visitHistory, clientRecord]);

  const preferredStylistMismatch = useMemo(() => {
    if (!clientRecord?.preferred_stylist_id || !appointment?.stylist_user_id) return false;
    return clientRecord.preferred_stylist_id !== appointment.stylist_user_id;
  }, [clientRecord, appointment]);

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

  const handleStatusChange = (status: AppointmentStatus) => {
    if (status === 'cancelled' || status === 'no_show') {
      setConfirmAction(status);
    } else {
      onStatusChange(appointment.phorest_id, status);
    }
  };

  const confirmStatusChange = () => {
    if (confirmAction) {
      onStatusChange(appointment.phorest_id, confirmAction);
      setConfirmAction(null);
    }
  };

  const handleCancelAllFuture = async () => {
    if (!appointment.recurrence_group_id) return;
    setCancellingFuture(true);
    try {
      const { error } = await supabase
        .from('phorest_appointments')
        .update({ status: 'cancelled' })
        .eq('recurrence_group_id', appointment.recurrence_group_id)
        .gte('appointment_date', appointment.appointment_date)
        .neq('status', 'cancelled');
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
      toast.success('All future recurring appointments cancelled');
      handleClose();
    } catch (err: any) {
      toast.error('Failed to cancel future appointments', { description: err.message });
    } finally {
      setCancellingFuture(false);
    }
  };

  // ─── Lifecycle Step Indicator ────────────────────────────────
  const currentStepIndex = LIFECYCLE_STEPS.indexOf(appointment.status);
  const isTerminal = ['cancelled', 'no_show'].includes(appointment.status);

  // ─── Render ───────────────────────────────────────────────────
  return createPortal(
    <>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="apt-detail-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
              onClick={handleClose}
            />
            {/* Floating Panel */}
            <motion.div
              key="apt-detail-panel"
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 80 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300, mass: 0.8 }}
              className="fixed right-4 top-4 bottom-4 z-50 w-[calc(100vw-2rem)] max-w-[440px] rounded-xl border border-border bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute right-3 top-3 z-10 rounded-full p-1.5 bg-muted/60 hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* ─── Header ────────────────────────────────────── */}
              <div className="p-6 pb-4">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={cn('w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-base font-medium', avatarColor)}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <h2 className="font-display text-lg font-medium tracking-wide truncate">{appointment.client_name}</h2>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {services.length > 1 ? `${services.length} services` : appointment.service_name}
                    </p>
                  </div>
                </div>

                {/* Status + Dropdown */}
                <div className="flex items-center gap-2 mt-3">
                  {availableTransitions.length > 0 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size={tokens.button.inline} className={cn('gap-1.5', statusConfig.bg, statusConfig.text)} disabled={isUpdating}>
                          {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StatusIcon className="h-3.5 w-3.5" />}
                          {statusConfig.label}
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {availableTransitions.map(status => {
                          const cfg = STATUS_CONFIG[status];
                          const Icon = cfg.icon;
                          return (
                            <DropdownMenuItem key={status} onClick={() => handleStatusChange(status)} className={cfg.text}>
                              <Icon className="h-4 w-4 mr-2" /> Mark as {cfg.label}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Badge className={cn(statusConfig.bg, statusConfig.text)}>
                      <StatusIcon className="h-3.5 w-3.5 mr-1" /> {statusConfig.label}
                    </Badge>
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
                            <span className="text-[9px] font-medium text-primary uppercase tracking-wider whitespace-nowrap">
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

              {/* ─── Tabbed Content ───────────────────────────── */}
              <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="mx-6 mb-0 shrink-0">
                  <TabsTrigger value="details" className="font-sans">Details</TabsTrigger>
                  <TabsTrigger value="history" className="font-sans">History</TabsTrigger>
                  <TabsTrigger value="notes" className="font-sans">Notes</TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1">
                  {/* ─── TAB: Details ──────────────────────────── */}
                  <TabsContent value="details" className="p-6 pt-4 space-y-5 mt-0">
                    {/* Redo approval actions */}
                    {appointment.is_redo && appointment.status === 'pending' && isManagerOrAdmin && (
                      <div className="flex items-center gap-2">
                        <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => approveRedo.mutate()} disabled={approveRedo.isPending || declineRedo.isPending}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve Redo
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs text-destructive hover:text-destructive" onClick={() => declineRedo.mutate()} disabled={approveRedo.isPending || declineRedo.isPending}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Decline
                        </Button>
                      </div>
                    )}
                    {appointment.is_redo && appointment.status === 'pending' && !isManagerOrAdmin && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">Awaiting manager approval</p>
                    )}

                    {/* Linked Redos */}
                    {linkedRedos.length > 0 && (
                      <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 border border-blue-200 dark:border-blue-800">
                        <RotateCcw className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="text-sm text-blue-700 dark:text-blue-300">
                          Redo scheduled: {linkedRedos[0].service_name || 'Service'} on {linkedRedos[0].appointment_date}
                          {linkedRedos[0].staff_name && ` with ${linkedRedos[0].staff_name}`}
                        </span>
                      </div>
                    )}

                    {/* Appointment Info */}
                    <div className="space-y-2">
                      <h4 className={tokens.heading.subsection}>Appointment</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{formatDate(parseISO(appointment.appointment_date), 'EEEE, MMMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{formatTime12h(appointment.start_time)} – {formatTime12h(appointment.end_time)} ({durationMinutes}min)</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Services Breakdown */}
                    <div className="space-y-2">
                      <h4 className={tokens.heading.subsection}>Services</h4>
                      <div className="space-y-1.5">
                        {services.map((svc, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate">{svc.name}</span>
                              {svc.category && (
                                <Badge variant="outline" className="text-[10px] shrink-0">{svc.category}</Badge>
                              )}
                            </div>
                            {svc.duration && (
                              <span className="text-muted-foreground text-xs shrink-0 ml-2">{svc.duration}min</span>
                            )}
                          </div>
                        ))}
                      </div>
                      {appointment.total_price != null && (
                        <div className="flex items-center justify-between pt-2 border-t border-dashed">
                          <span className="text-sm text-muted-foreground">Total</span>
                          <span className="font-display text-sm font-medium">
                            <BlurredAmount>{formatCurrency(appointment.total_price)}</BlurredAmount>
                          </span>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Stylist + Preferred Comparison */}
                    <div className="space-y-2">
                      <h4 className={tokens.heading.subsection}>Stylist</h4>
                      {appointment.stylist_profile && (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={appointment.stylist_profile.photo_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {(appointment.stylist_profile.display_name || appointment.stylist_profile.full_name).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{appointment.stylist_profile.display_name || appointment.stylist_profile.full_name}</span>
                          <Badge variant="outline" className="text-[10px]">Booked</Badge>
                        </div>
                      )}
                      {clientRecord?.preferred_stylist_id && preferredStylist && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <Star className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <span className="text-sm text-muted-foreground">{getStylistDisplayName(preferredStylist)}</span>
                          {preferredStylistMismatch ? (
                            <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-300 border-amber-300">
                              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Mismatch
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-green-700 dark:text-green-300 border-green-300">Preferred</Badge>
                          )}
                        </div>
                      )}

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
                                      if (effectiveOrganization?.id) {
                                        assignAssistant({ assistantUserId: member.user_id, organizationId: effectiveOrganization.id });
                                        setShowAssistantPicker(false);
                                      }
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-5 w-5">
                                        <AvatarImage src={member.photo_url || undefined} />
                                        <AvatarFallback className="text-[8px]">{(member.display_name || member.full_name || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                                      </Avatar>
                                      <span>{member.display_name || member.full_name}</span>
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
                    </div>

                    <Separator />

                    {/* Client Contact */}
                    <div className="space-y-2">
                      <h4 className={tokens.heading.subsection}>Client Contact</h4>
                      <div className="space-y-1.5">
                        {appointment.client_phone && (
                          <div className="flex items-center justify-between">
                            <a href={`tel:${appointment.client_phone}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              {formatPhoneDisplay(appointment.client_phone)}
                            </a>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyPhone}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {clientRecord?.email && (
                          <div className="flex items-center justify-between">
                            <a href={`mailto:${clientRecord.email}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                              {clientRecord.email}
                            </a>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyEmail}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {!appointment.client_phone && !clientRecord?.email && (
                          <p className="text-xs text-muted-foreground">No contact info available</p>
                        )}
                      </div>
                    </div>

                    {/* Booking Notes (POS) */}
                    {appointment.notes && (
                      <>
                        <Separator />
                        <div className="space-y-1">
                          <h4 className={tokens.heading.subsection}>Booking Notes</h4>
                          <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                        </div>
                      </>
                    )}

                    {/* Recurrence cancel */}
                    {recurrenceLabel && (
                      <>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{recurrenceLabel}</span>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={handleCancelAllFuture} disabled={cancellingFuture}>
                            {cancellingFuture ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                            Cancel all future
                          </Button>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  {/* ─── TAB: History ─────────────────────────── */}
                  <TabsContent value="history" className="p-6 pt-4 space-y-5 mt-0">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
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
                    </div>

                    <Separator />

                    {/* Visit Timeline */}
                    <div className="space-y-2">
                      <h4 className={tokens.heading.subsection}>Visit History</h4>
                      {historyLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : visitHistory.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No visit history</p>
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
                    </div>
                  </TabsContent>

                  {/* ─── TAB: Notes ───────────────────────────── */}
                  <TabsContent value="notes" className="p-6 pt-4 space-y-5 mt-0">
                    {/* Appointment Notes */}
                    <div className="space-y-2">
                      <h4 className={tokens.heading.subsection}>Appointment Notes</h4>
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
                              <p className="mt-1 text-xs text-muted-foreground">{formatDate(new Date(note.created_at), 'MMM d, h:mm a')}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No appointment notes</p>
                      )}

                      {/* Add Appointment Note */}
                      {canAddNotes && (
                        <div className="space-y-2 mt-3">
                          <Textarea placeholder="Add appointment note..." value={newNote} onChange={e => setNewNote(e.target.value)} rows={2} />
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
                    </div>

                    <Separator />

                    {/* Client Notes */}
                    <div className="space-y-2">
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
                    </div>

                    {/* POS Booking Notes */}
                    {appointment.notes && (
                      <>
                        <Separator />
                        <div className="space-y-1">
                          <h4 className={tokens.heading.subsection}>POS Booking Notes</h4>
                          <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                        </div>
                      </>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>

              {/* ─── Footer Action Bar ────────────────────────── */}
              <div className="p-4 border-t border-border/60 bg-card/60 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Check In */}
                  {availableTransitions.includes('checked_in') && (
                    <Button size={tokens.button.card} onClick={() => handleStatusChange('checked_in')} disabled={isUpdating}>
                      <UserCheck className="h-3.5 w-3.5 mr-1" /> Check In
                    </Button>
                  )}
                  {/* Pay / Checkout */}
                  {availableTransitions.includes('completed') && onPay && (
                    <Button size={tokens.button.card} onClick={() => onPay(appointment)} disabled={isUpdating}>
                      <CreditCard className="h-3.5 w-3.5 mr-1" /> Pay
                    </Button>
                  )}
                  {/* Complete (if no pay handler) */}
                  {availableTransitions.includes('completed') && !onPay && (
                    <Button size={tokens.button.card} onClick={() => handleStatusChange('completed')} disabled={isUpdating}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Complete
                    </Button>
                  )}
                  {/* Reschedule */}
                  {onReschedule && !['completed', 'cancelled', 'no_show'].includes(appointment.status) && (
                    <Button variant="outline" size={tokens.button.card} onClick={() => onReschedule(appointment)}>
                      <CalendarClock className="h-3.5 w-3.5 mr-1" /> Reschedule
                    </Button>
                  )}
                  {/* Rebook */}
                  {onRebook && (
                    <Button variant="outline" size={tokens.button.card} onClick={() => onRebook(appointment)}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> Rebook
                    </Button>
                  )}
                  {/* Cancel */}
                  {availableTransitions.includes('cancelled') && (
                    <Button variant="outline" size={tokens.button.card} className="text-destructive hover:text-destructive" onClick={() => handleStatusChange('cancelled')} disabled={isUpdating}>
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
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
    </>,
    document.body
  );
}
