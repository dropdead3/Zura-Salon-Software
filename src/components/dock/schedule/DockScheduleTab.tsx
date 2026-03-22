/**
 * DockScheduleTab — Today's appointments grouped by Active/Scheduled/Completed.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Calendar, Plus, Loader2, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { DockStaffSession } from '@/pages/Dock';
import { useDockAppointments, type DockAppointment } from '@/hooks/dock/useDockAppointments';
import { DockAppointmentCard } from './DockAppointmentCard';
import { DockNewBookingSheet } from './DockNewBookingSheet';
import { useDockTrackedServices } from '@/hooks/dock/useDockTrackedServices';
import { isColorOrChemicalService } from '@/utils/serviceCategorization';
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
const COMPLETED_STATUSES = ['completed', 'no_show', 'cancelled'];

function groupAppointments(appointments: DockAppointment[]) {
  const active: DockAppointment[] = [];
  const scheduled: DockAppointment[] = [];
  const completed: DockAppointment[] = [];

  for (const a of appointments) {
    const status = a.status || 'pending';
    if (ACTIVE_STATUSES.includes(status)) {
      active.push(a);
    } else if (COMPLETED_STATUSES.includes(status)) {
      completed.push(a);
    } else {
      scheduled.push(a);
    }
  }

  return { active, scheduled, completed };
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
  const [showNewBooking, setShowNewBooking] = useState(false);
  const storageKey = `dock-chemical-toggle::${staff.userId}`;
  const [showChemicalOnly, setShowChemicalOnly] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved !== null ? saved === 'true' : true;
  });

  const handleToggleChange = (checked: boolean) => {
    localStorage.setItem(storageKey, String(checked));
    setShowChemicalOnly(checked);
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
    return () => el.removeEventListener('scroll', checkScroll);
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

  const filteredAppointments = useMemo(() => {
    const all = appointments || [];
    if (!showChemicalOnly) return all;
    return all.filter((a) => {
      const services = (a.service_name || '').split(',').map((s) => s.trim().toLowerCase());
      if (trackedSet) {
        return services.some((s) => trackedSet.has(s));
      }
      return services.some((s) => isColorOrChemicalService(s));
    });
  }, [appointments, showChemicalOnly, trackedSet]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
      </div>
    );
  }

  const { active, scheduled, completed } = groupAppointments(filteredAppointments);

  return (
    <div className="relative flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-8 pb-3">
        <div>
          <h1 className="font-display text-3xl tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
            Today's Appointments
          </h1>
          <p className="text-base text-[hsl(var(--platform-foreground-muted))] mt-0.5">
            {today}
          </p>
        </div>
        <button
          onClick={() => setShowNewBooking(true)}
          className="flex items-center justify-center w-14 h-14 rounded-xl bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 transition-colors"
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>

      {/* Chemical filter toggle */}
      <div className="flex items-center justify-between px-5 pb-4">
        <label htmlFor="chemical-toggle" className="text-base text-[hsl(var(--platform-foreground-muted))]">
          Show Color & Chemical Service Appointments Only
        </label>
        <Switch
          id="chemical-toggle"
          checked={showChemicalOnly}
          onCheckedChange={handleToggleChange}
          className="data-[state=checked]:bg-violet-500/60 data-[state=unchecked]:bg-[hsl(var(--platform-foreground-muted)/0.25)]"
        />
      </div>

      {/* Appointment list + scroll indicator wrapper */}
      <div className="relative flex-1 min-h-0">
        <div ref={scrollRef} onScroll={checkScroll} className="h-full overflow-y-auto px-5 pb-44 space-y-8">
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
                <AppointmentGroup label="Active" count={active.length} appointments={active} accentColor="violet" onTap={onOpenAppointment} onComplete={onCompleteAppointment} onStart={handleStartAppointment} onViewClient={onViewClient} />
              )}
              {scheduled.length > 0 && (
                <AppointmentGroup label="Scheduled" count={scheduled.length} appointments={scheduled} accentColor="blue" onTap={onOpenAppointment} onComplete={onCompleteAppointment} onStart={handleStartAppointment} onViewClient={onViewClient} />
              )}
              {completed.length > 0 && (
                <AppointmentGroup label="Completed" count={completed.length} appointments={completed} accentColor="slate" onTap={onOpenAppointment} onComplete={onCompleteAppointment} onStart={handleStartAppointment} onViewClient={onViewClient} />
              )}
            </>
          )}
        </div>

        {/* Scroll indicator */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center pb-3 transition-opacity duration-300"
          style={{ opacity: showScrollIndicator ? 1 : 0 }}
        >
          <div className="w-full h-12 bg-gradient-to-t from-[hsl(var(--platform-bg))] to-transparent" />
          <ChevronDown className="w-5 h-5 text-[hsl(var(--platform-foreground-muted))] animate-bounce" />
        </div>
      </div>

      <DockNewBookingSheet
        open={showNewBooking}
        onClose={() => setShowNewBooking(false)}
        staff={staff}
        locationId={locationId}
        staffFilter={staffFilter}
      />
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
  onViewClient,
}: {
  label: string;
  count: number;
  appointments: DockAppointment[];
  accentColor: 'violet' | 'blue' | 'slate';
  onTap: (appointment: DockAppointment) => void;
  onComplete?: (appointment: DockAppointment) => void;
  onStart?: (appointment: DockAppointment) => void;
  onViewClient?: (appointment: DockAppointment) => void;
}) {
  const dotColor = {
    violet: 'bg-violet-500',
    blue: 'bg-blue-500',
    slate: 'bg-slate-500',
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
          <DockAppointmentCard key={a.id} appointment={a} accentColor={accentColor} onTap={onTap} onComplete={onComplete} onStart={onStart} onViewClient={onViewClient} />
        ))}
      </div>
    </div>
  );
}

export { formatTime };
