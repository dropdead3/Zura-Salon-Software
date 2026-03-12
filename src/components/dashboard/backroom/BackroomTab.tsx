/**
 * BackroomTab — Entry point for backroom functionality inside AppointmentDetailSheet.
 * Loads appointment context and renders the MixSessionManager.
 */

import { MixSessionManager } from './MixSessionManager';

interface BackroomTabProps {
  appointment: {
    id: string;
    organization_id?: string | null;
    client_id?: string | null;
    client_name?: string | null;
    staff_user_id?: string | null;
    staff_name?: string | null;
    location_id?: string | null;
    service_name?: string | null;
    service_id?: string | null;
    phorest_client_id?: string | null;
  };
  organizationId: string;
}

export function BackroomTab({ appointment, organizationId }: BackroomTabProps) {
  return (
    <div className="space-y-4">
      <MixSessionManager
        organizationId={organizationId}
        appointmentId={appointment.id}
        clientId={appointment.client_id ?? appointment.phorest_client_id ?? undefined}
        staffUserId={appointment.staff_user_id ?? undefined}
        locationId={appointment.location_id ?? undefined}
        serviceName={appointment.service_name ?? undefined}
        staffName={appointment.staff_name ?? undefined}
      />
    </div>
  );
}
