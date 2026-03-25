/**
 * DockAppointmentDetail — Full-screen appointment view with Services/Notes/Summary tabs.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FlaskConical, StickyNote, Receipt, Pencil, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DOCK_TABS } from '@/components/dock/dock-ui-tokens';
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
  { id: 'services', label: 'Formulations', icon: FlaskConical },
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

  // Read demo service overrides from sessionStorage
  const demoServiceOverride = appointment.id.startsWith('demo-')
    ? (() => { try { return sessionStorage.getItem(`dock-demo-services::${appointment.id}`); } catch { return null; } })()
    : null;
  const effectiveServiceName = demoServiceOverride ?? appointment.service_name;

  const currentServices = effectiveServiceName
    ? effectiveServiceName.split(',').map(s => s.trim()).filter(Boolean)
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
            <p className="text-sm text-[hsl(var(--platform-foreground-muted))] truncate mt-0.5">
              {effectiveServiceName && <span>{effectiveServiceName} · </span>}
              {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
            </p>
            {!isTerminal && (
              <button
                onClick={() => setEditServicesOpen(true)}
                className="mt-2 px-3 py-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 text-violet-400 text-xs font-medium flex items-center gap-1.5 active:scale-[0.97] transition-all"
              >
                <Pencil className="w-3 h-3" />
                Edit Services
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className={DOCK_TABS.bar}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(DOCK_TABS.trigger, tab === id ? DOCK_TABS.triggerActive : DOCK_TABS.triggerInactive)}
            >
              <Icon className={DOCK_TABS.icon} />
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
