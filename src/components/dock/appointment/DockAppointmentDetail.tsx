/**
 * DockAppointmentDetail — Full-screen appointment view with Services/Notes/Summary tabs.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FlaskConical, StickyNote, Receipt, Pencil, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DockStaffSession } from '@/pages/Dock';
import type { DockAppointment } from '@/hooks/dock/useDockAppointments';
import { formatTime } from '../schedule/DockScheduleTab';
import { DockServicesTab } from './DockServicesTab';
import { DockNotesTab } from './DockNotesTab';
import { DockSummaryTab } from './DockSummaryTab';
import { DockClientTab } from './DockClientTab';
import { DockEditServicesSheet } from './DockEditServicesSheet';
import { useUpdateAppointmentServices, type ServiceEntry } from '@/hooks/useUpdateAppointmentServices';
import { useDockMixSessions } from '@/hooks/dock/useDockMixSessions';
import { supabase } from '@/integrations/supabase/client';

type DetailTab = 'services' | 'notes' | 'summary' | 'client';

interface DockAppointmentDetailProps {
  appointment: DockAppointment;
  staff: DockStaffSession;
  onBack: () => void;
}

const TABS: { id: DetailTab; label: string; icon: typeof FlaskConical }[] = [
  { id: 'services', label: 'Services', icon: FlaskConical },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'summary', label: 'Summary', icon: Receipt },
  { id: 'client', label: 'Client', icon: User },
];

export function DockAppointmentDetail({ appointment, staff, onBack }: DockAppointmentDetailProps) {
  const [tab, setTab] = useState<DetailTab>('services');
  const [editServicesOpen, setEditServicesOpen] = useState(false);
  const updateServicesMutation = useUpdateAppointmentServices();
  const { data: mixSessions } = useDockMixSessions(appointment.id);

  // Find active bowl ID from any open session
  const activeSessionId = mixSessions?.find(s => s.status === 'active')?.id;
  const { data: activeBowl } = useQuery({
    queryKey: ['dock-active-bowl', activeSessionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('mix_bowls')
        .select('id')
        .eq('mix_session_id', activeSessionId!)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.id ?? null;
    },
    enabled: !!activeSessionId,
    staleTime: 15_000,
  });
  const activeBowlId = activeBowl ?? null;

  const currentServices = appointment.service_name
    ? appointment.service_name.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const isTerminal = ['completed', 'cancelled', 'no_show'].includes((appointment.status || '').toLowerCase());

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-7 pt-6 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl tracking-wide uppercase text-[hsl(var(--platform-foreground))] truncate">
              {appointment.client_name || 'Walk-in'}
            </h1>
            <div className="flex items-center gap-1 mt-0.5">
              <p className="text-sm text-[hsl(var(--platform-foreground-muted))] truncate">
                {appointment.service_name && <span>{appointment.service_name} · </span>}
                {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
              </p>
              {!isTerminal && (
                <button
                  onClick={() => setEditServicesOpen(true)}
                  className="shrink-0 p-0.5 rounded text-[hsl(var(--platform-foreground-muted)/0.6)] hover:text-[hsl(var(--platform-foreground))] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-[hsl(var(--platform-bg-card))] rounded-2xl p-1.5 border border-[hsl(var(--platform-border)/0.2)]">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center justify-center gap-1.5 flex-1 h-10 rounded-xl text-xs font-medium transition-all duration-150',
                tab === id
                  ? 'bg-violet-600/30 text-violet-300'
                  : 'text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))]'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === 'services' && <DockServicesTab appointment={appointment} staff={staff} />}
        {tab === 'notes' && <DockNotesTab appointment={appointment} />}
        {tab === 'summary' && <DockSummaryTab appointment={appointment} staff={staff} />}
        {tab === 'client' && <DockClientTab appointment={appointment} staff={staff} activeBowlId={activeBowlId} />}
      </div>

      <DockEditServicesSheet
        open={editServicesOpen}
        onClose={() => setEditServicesOpen(false)}
        currentServices={currentServices}
        locationId={appointment.location_id}
        isSaving={updateServicesMutation.isPending}
        onSave={(newServices: ServiceEntry[]) => {
          updateServicesMutation.mutate({
            appointmentId: appointment.id,
            organizationId: staff.organizationId,
            services: newServices,
            previousServiceName: appointment.service_name,
          }, {
            onSuccess: () => setEditServicesOpen(false),
          });
        }}
      />
    </div>
  );
}
