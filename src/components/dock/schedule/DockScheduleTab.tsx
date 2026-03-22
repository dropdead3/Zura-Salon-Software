/**
 * DockScheduleTab — Today's appointments grouped by Active/Scheduled/Completed.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { DockStaffSession } from '@/pages/Dock';
import { useDockAppointments, type DockAppointment } from '@/hooks/dock/useDockAppointments';
import { DockAppointmentCard } from './DockAppointmentCard';
import { DockNewBookingSheet } from './DockNewBookingSheet';

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
    if (a.has_mix_session || ACTIVE_STATUSES.includes(status)) {
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
  const { data: appointments, isLoading } = useDockAppointments(staff.userId, locationId, staffFilter);
  const today = format(new Date(), 'EEEE, MMMM d');
  const [showNewBooking, setShowNewBooking] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
      </div>
    );
  }

  const all = appointments || [];
  const { active, scheduled, completed } = groupAppointments(all);

  return (
    <div className="relative flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-8 pb-5">
        <div>
          <h1 className="font-display text-2xl tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
            {staff.displayName}'s Appointments Today
          </h1>
          <p className="text-sm text-[hsl(var(--platform-foreground-muted))] mt-0.5">
            {today}
          </p>
        </div>
        <button
          onClick={() => setShowNewBooking(true)}
          className="flex items-center justify-center w-12 h-12 rounded-xl bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 transition-colors"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Appointment list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6 space-y-8">
        {all.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <Calendar className="w-12 h-12 text-violet-400/40 mb-4" />
            <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
              No appointments today
            </p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <AppointmentGroup label="Active" count={active.length} appointments={active} accentColor="violet" onTap={onOpenAppointment} onComplete={onCompleteAppointment} onViewClient={onViewClient} />
            )}
            {scheduled.length > 0 && (
              <AppointmentGroup label="Scheduled" count={scheduled.length} appointments={scheduled} accentColor="blue" onTap={onOpenAppointment} onComplete={onCompleteAppointment} onViewClient={onViewClient} />
            )}
            {completed.length > 0 && (
              <AppointmentGroup label="Completed" count={completed.length} appointments={completed} accentColor="slate" onTap={onOpenAppointment} onComplete={onCompleteAppointment} onViewClient={onViewClient} />
            )}
          </>
        )}
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
  onViewClient,
}: {
  label: string;
  count: number;
  appointments: DockAppointment[];
  accentColor: 'violet' | 'blue' | 'slate';
  onTap: (appointment: DockAppointment) => void;
  onComplete?: (appointment: DockAppointment) => void;
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
        <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
        <span className="text-sm font-medium tracking-wide uppercase text-[hsl(var(--platform-foreground-muted))]">
          {label}
        </span>
        <span className="text-sm text-[hsl(var(--platform-foreground-muted)/0.6)]">
          ({count})
        </span>
      </div>
      <div className="space-y-3">
        {appointments.map((a) => (
          <DockAppointmentCard key={a.id} appointment={a} accentColor={accentColor} onTap={onTap} onComplete={onComplete} onViewClient={onViewClient} />
        ))}
      </div>
    </div>
  );
}

export { formatTime };
