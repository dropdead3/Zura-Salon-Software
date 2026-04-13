/**
 * DockScheduleTab — Today's appointments grouped by Active/Scheduled/Completed.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Calendar, Loader2, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import type { DockStaffSession } from '@/pages/Dock';
import { useDockAppointments, type DockAppointment } from '@/hooks/dock/useDockAppointments';
import { DockAppointmentCard } from './DockAppointmentCard';

import { useDockTrackedServices } from '@/hooks/dock/useDockTrackedServices';
import { isColorOrChemicalService } from '@/utils/serviceCategorization';
import { cn } from '@/lib/utils';
import { DOCK_DIALOG, DOCK_SHEET } from '@/components/dock/dock-ui-tokens';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface DockScheduleTabProps {
  staff: DockStaffSession;
  onOpenAppointment: (appointment: DockAppointment) => void;
  onCompleteAppointment?: (appointment: DockAppointment) => void;
  onViewClient?: (appointment: DockAppointment) => void;
  locationId: string;
  staffFilter?: string;
}

const ACTIVE_STATUSES = ['checked_in', 'in_progress'];

function groupAppointments(appointments: DockAppointment[]) {
  const active: DockAppointment[] = [];
  const scheduled: DockAppointment[] = [];
  const completed: DockAppointment[] = [];
  const noShow: DockAppointment[] = [];
  const cancelled: DockAppointment[] = [];

  for (const a of appointments) {
    const status = a.status || 'pending';
    if (ACTIVE_STATUSES.includes(status)) {
      active.push(a);
    } else if (status === 'no_show') {
      noShow.push(a);
    } else if (status === 'cancelled') {
      cancelled.push(a);
    } else if (status === 'completed') {
      completed.push(a);
    } else {
      scheduled.push(a);
    }
  }

  const sortByTime = (a: DockAppointment, b: DockAppointment) =>
    (a.start_time || '').localeCompare(b.start_time || '');

  return {
    active: active.sort(sortByTime),
    scheduled: scheduled.sort(sortByTime),
    completed: completed.sort(sortByTime),
    noShow: noShow.sort(sortByTime),
    cancelled: cancelled.sort(sortByTime),
  };
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function DockScheduleTab({ staff, onOpenAppointment, onCompleteAppointment, onViewClient, locationId, staffFilter }: DockScheduleTabProps) {
  const queryClient = useQueryClient();
  const { data: appointments, isLoading } = useDockAppointments(staff.userId, locationId, staffFilter);
  const { data: trackedSet } = useDockTrackedServices(staff.organizationId);
  const today = format(new Date(), 'EEEE, MMMM d');
   
  const storageKey = `dock-chemical-toggle::${staff.userId}`;
  const [showAll, setShowAll] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved !== null ? saved === 'true' : false;
  });

  // Confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<{ appointment: DockAppointment; action: 'cancel' | 'no_show' | 'retry_charge' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleChange = (checked: boolean) => {
    localStorage.setItem(storageKey, String(checked));
    setShowAll(checked);
  };
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollHeight > el.clientHeight;
    const notAtBottom = el.scrollTop + el.clientHeight < el.scrollHeight - 20;
    setShowScrollIndicator(hasOverflow && notAtBottom);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => checkScroll());
    resizeObserver.observe(el);
    if (el.firstElementChild) {
      resizeObserver.observe(el.firstElementChild);
    }

    return () => {
      el.removeEventListener('scroll', checkScroll);
      resizeObserver.disconnect();
    };
  }, [checkScroll, appointments]);

  const handleStartAppointment = useCallback(async (appointment: DockAppointment) => {
    if (appointment.id.startsWith('demo-')) {
      toast.success('Demo: Appointment started');
      return;
    }
    try {
      const { error } = await supabase.functions.invoke('update-phorest-appointment', {
        body: { appointment_id: appointment.id, status: 'CHECKED_IN' },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['dock-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment started');
    } catch (err) {
      toast.error('Failed to start: ' + (err as Error).message);
    }
  }, [queryClient]);

  const handleCancelAppointment = useCallback((appointment: DockAppointment) => {
    setConfirmAction({ appointment, action: 'cancel' });
  }, []);

  const handleNoShowAppointment = useCallback((appointment: DockAppointment) => {
    setConfirmAction({ appointment, action: 'no_show' });
  }, []);

  const handleRetryCharge = useCallback((appointment: DockAppointment) => {
    setConfirmAction({ appointment, action: 'retry_charge' });
  }, []);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmAction) return;
    const { appointment, action } = confirmAction;

    if (appointment.id.startsWith('demo-')) {
      if (action === 'retry_charge' && !appointment.total_price) {
        toast.warning('Demo: Cannot retry — no price set on this appointment');
        setConfirmAction(null);
        return;
      }
      toast.success(`Demo: ${action === 'retry_charge' ? 'Charge retried' : action === 'cancel' ? 'Appointment cancelled' : 'Marked as no-show'}`);
      setConfirmAction(null);
      return;
    }

    setIsSubmitting(true);
    try {
      if (action === 'retry_charge') {
        const clientId = appointment.phorest_client_id || appointment.client_id;
        const amount = appointment.total_price;
        if (!clientId || !amount) throw new Error('Missing client or amount');

        const { error } = await supabase.functions.invoke('charge-card-on-file', {
          body: {
            organization_id: staff.organizationId,
            client_id: clientId,
            amount,
            appointment_id: appointment.id,
            description: `Retry charge for ${appointment.client_name || 'appointment'}`,
          },
        });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['dock-appointments'] });
        queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        toast.success('Charge retried successfully');
      } else {
        const status = action === 'cancel' ? 'CANCELLED' : 'NO_SHOW';
        const { error } = await supabase.functions.invoke('update-phorest-appointment', {
          body: { appointment_id: appointment.id, status },
        });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['dock-appointments'] });
        queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        toast.success(action === 'cancel' ? 'Appointment cancelled' : 'Marked as no-show');
      }
    } catch (err) {
      toast.error(`Failed: ${(err as Error).message}`);
    } finally {
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  }, [confirmAction, queryClient, staff.organizationId]);

  const filteredAppointments = useMemo(() => {
    const all = appointments || [];
    if (showAll) return all;
    return all.filter((a) => {
      const services = (a.service_name || '').split(',').map((s) => s.trim().toLowerCase());
      if (trackedSet) {
        return services.some((s) => trackedSet.has(s));
      }
      return services.some((s) => isColorOrChemicalService(s));
    });
  }, [appointments, showAll, trackedSet]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
      </div>
    );
  }

  const { active, scheduled, completed, noShow, cancelled } = groupAppointments(filteredAppointments);

  return (
    <div className="relative flex flex-col h-full">
      {/* Header */}
      <div className="px-7 pt-8 pb-5 border-b border-[hsl(var(--platform-border)/0.15)]">
        <h1 className="font-display text-3xl tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
          Today's Appointments
        </h1>
        <p className="text-base text-[hsl(var(--platform-foreground-muted))]">
          {today}
        </p>
      </div>

      {/* Chemical filter toggle */}
      <div className="flex items-center justify-between px-7 pt-2 pb-5">
        <label htmlFor="chemical-toggle" className="text-base text-[hsl(var(--platform-foreground-muted))]">
          Show All Appointments
        </label>
        <Switch
          id="chemical-toggle"
          checked={showAll}
          onCheckedChange={handleToggleChange}
          className="data-[state=checked]:bg-violet-500/60 data-[state=unchecked]:bg-[hsl(var(--platform-foreground-muted)/0.25)]"
        />
      </div>

      {/* Appointment list + scroll indicator wrapper */}
      <div className="relative flex-1 min-h-0">
        {/* Top fade overlay */}
        <div className="absolute top-0 left-0 right-0 h-12 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, hsl(var(--platform-bg)), transparent)' }}
        />
        <div ref={scrollRef} onScroll={checkScroll} className="h-full overflow-y-auto px-7 pt-16 pb-8 space-y-8">
          {filteredAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20 text-center">
              <Calendar className="w-12 h-12 text-violet-400/40 mb-4" />
              <p className="text-base text-[hsl(var(--platform-foreground-muted))]">
                No appointments today
              </p>
            </div>
          ) : (
            <>
              {active.length > 0 && (
                <AppointmentGroup label="Active" count={active.length} appointments={active} accentColor="violet" onTap={onOpenAppointment} onComplete={onCompleteAppointment} onStart={handleStartAppointment} onCancel={handleCancelAppointment} onNoShow={handleNoShowAppointment} onViewClient={onViewClient} onRetryCharge={handleRetryCharge} retryingId={confirmAction?.action === 'retry_charge' && isSubmitting ? confirmAction.appointment.id : null} retryDisabled={!!confirmAction} />
              )}
              {scheduled.length > 0 && (
                <AppointmentGroup label="Upcoming" count={scheduled.length} appointments={scheduled} accentColor="blue" onTap={onOpenAppointment} onComplete={onCompleteAppointment} onStart={handleStartAppointment} onCancel={handleCancelAppointment} onNoShow={handleNoShowAppointment} onViewClient={onViewClient} onRetryCharge={handleRetryCharge} retryingId={confirmAction?.action === 'retry_charge' && isSubmitting ? confirmAction.appointment.id : null} retryDisabled={!!confirmAction} />
              )}
              {completed.length > 0 && (
                <AppointmentGroup label="Completed" count={completed.length} appointments={completed} accentColor="slate" onTap={onOpenAppointment} onComplete={onCompleteAppointment} onStart={handleStartAppointment} onCancel={handleCancelAppointment} onNoShow={handleNoShowAppointment} onViewClient={onViewClient} onRetryCharge={handleRetryCharge} retryingId={confirmAction?.action === 'retry_charge' && isSubmitting ? confirmAction.appointment.id : null} retryDisabled={!!confirmAction} />
              )}
              {noShow.length > 0 && (
                <AppointmentGroup label="No Show" count={noShow.length} appointments={noShow} accentColor="amber" onTap={onOpenAppointment} onComplete={onCompleteAppointment} onStart={handleStartAppointment} onCancel={handleCancelAppointment} onNoShow={handleNoShowAppointment} onViewClient={onViewClient} onRetryCharge={handleRetryCharge} retryingId={confirmAction?.action === 'retry_charge' && isSubmitting ? confirmAction.appointment.id : null} retryDisabled={!!confirmAction} />
              )}
              {cancelled.length > 0 && (
                <AppointmentGroup label="Cancelled" count={cancelled.length} appointments={cancelled} accentColor="red" onTap={onOpenAppointment} onComplete={onCompleteAppointment} onStart={handleStartAppointment} onCancel={handleCancelAppointment} onNoShow={handleNoShowAppointment} onViewClient={onViewClient} onRetryCharge={handleRetryCharge} retryingId={confirmAction?.action === 'retry_charge' && isSubmitting ? confirmAction.appointment.id : null} retryDisabled={!!confirmAction} />
              )}
            </>
          )}
        </div>

        {/* Scroll-down indicator (no gradient) */}
        <div
          className="pointer-events-none absolute bottom-2 left-0 right-0 z-[30] flex justify-center transition-opacity duration-300"
          style={{ opacity: showScrollIndicator ? 1 : 0 }}
        >
          <ChevronDown className="w-5 h-5 text-[hsl(var(--platform-foreground-muted))] animate-bounce" />
        </div>
      </div>


      {/* Dock-native confirmation overlay */}
      <AnimatePresence>
        {confirmAction && (
          <>
            {/* Backdrop */}
            <motion.div
              className={DOCK_DIALOG.overlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => !isSubmitting && setConfirmAction(null)}
            />
            {/* Dialog panel */}
            <motion.div
              className={DOCK_DIALOG.content}
              initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
              transition={DOCK_SHEET.spring}
            >
              <h2 className={DOCK_DIALOG.title}>
                {confirmAction.action === 'retry_charge' ? 'Retry Charge' : confirmAction.action === 'cancel' ? 'Cancel Appointment' : 'Mark as No-Show'}
              </h2>
              <p className={DOCK_DIALOG.description}>
                {confirmAction.action === 'retry_charge'
                  ? `Retry charge of $${((confirmAction.appointment.total_price || 0)).toFixed(2)}${confirmAction.appointment.card_last4 ? ` to ${confirmAction.appointment.card_brand || 'card'} ending in ${confirmAction.appointment.card_last4}` : ''} for ${confirmAction.appointment.client_name || 'this client'}?`
                  : confirmAction.action === 'cancel'
                    ? `Are you sure you want to cancel ${confirmAction.appointment.client_name || 'this client'}'s appointment? This action will update the schedule and POS.`
                    : `Mark ${confirmAction.appointment.client_name || 'this client'} as a no-show? This will be reflected in the schedule and client history.`
                }
              </p>
              <div className={DOCK_DIALOG.buttonRow}>
                <button
                  disabled={isSubmitting}
                  onClick={() => setConfirmAction(null)}
                  className={DOCK_DIALOG.cancelButton}
                >
                  {confirmAction.action === 'retry_charge' ? 'Cancel' : confirmAction.action === 'cancel' ? 'Keep Appointment' : 'Go Back'}
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={isSubmitting}
                  className={confirmAction.action === 'retry_charge'
                    ? DOCK_DIALOG.retryAction
                    : confirmAction.action === 'cancel' ? DOCK_DIALOG.destructiveAction : DOCK_DIALOG.warningAction}
                >
                  {isSubmitting ? 'Processing…' : confirmAction.action === 'retry_charge' ? 'Retry Charge' : confirmAction.action === 'cancel' ? 'Yes, Cancel' : 'Mark No-Show'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function AppointmentGroup({
  label,
  count,
  appointments,
  accentColor,
  onTap,
  onComplete,
  onStart,
  onCancel,
  onNoShow,
  onViewClient,
  onRetryCharge,
  retryingId,
  retryDisabled,
}: {
  label: string;
  count: number;
  appointments: DockAppointment[];
  accentColor: 'violet' | 'blue' | 'slate' | 'amber' | 'red';
  onTap: (appointment: DockAppointment) => void;
  onComplete?: (appointment: DockAppointment) => void;
  onStart?: (appointment: DockAppointment) => void;
  onCancel?: (appointment: DockAppointment) => void;
  onNoShow?: (appointment: DockAppointment) => void;
  onViewClient?: (appointment: DockAppointment) => void;
  onRetryCharge?: (appointment: DockAppointment) => void;
  retryingId?: string | null;
  retryDisabled?: boolean;
}) {
  const dotColor = {
    violet: 'bg-violet-500',
    blue: 'bg-blue-500',
    slate: 'bg-slate-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  }[accentColor];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${dotColor}`} />
        <span className="text-base font-display font-medium tracking-wide text-[hsl(var(--platform-foreground-muted))]">
          {label}
        </span>
        <span className="text-base text-[hsl(var(--platform-foreground-muted)/0.6)]">
          ({count})
        </span>
      </div>
      <div className="space-y-4">
        {appointments.map((a) => (
          <DockAppointmentCard key={a.id} appointment={a} accentColor={accentColor} isChemical={isColorOrChemicalService(a.service_name)} isRetrying={retryingId === a.id} retryDisabled={retryDisabled} onTap={onTap} onComplete={onComplete} onStart={onStart} onCancel={onCancel} onNoShow={onNoShow} onViewClient={onViewClient} onRetryCharge={onRetryCharge} />
        ))}
      </div>
    </div>
  );
}

export { formatTime };