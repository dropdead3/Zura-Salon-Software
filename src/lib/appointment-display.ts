/**
 * Appointment client-display resolver — single source of truth for the
 * "client_name || 'Walk-in'" decision across the schedule + dock surfaces.
 *
 * DOCTRINE: "Fallback values must be distinguishable from real values when
 * the underlying state differs." A truly missing client (no phorest_client_id,
 * no client_id) is a walk-in. A row with a client_id but no name is a sync
 * gap — rendering it as "Walk-in" silently erases an integration-health signal.
 *
 * Three states:
 *  • resolved   — `client_name` present → render the name
 *  • walk-in    — no client linkage at all → render "Walk-in" (truthful)
 *  • pending    — client linkage exists, name not yet synced → render
 *                 "Client #ABC1" (last-4 of the Phorest ID) so operators
 *                 see "we know there's a client; the name is catching up."
 */

export interface AppointmentClientSource {
  client_name?: string | null;
  phorest_client_id?: string | null;
  client_id?: string | null;
}

export interface DisplayClientName {
  /** Final string to render. */
  label: string;
  /** True when `client_name` is populated. */
  isResolved: boolean;
  /** True when there is no client linkage at all (genuine walk-in). */
  isWalkIn: boolean;
  /** True when a client linkage exists but the name has not synced yet. */
  isPending: boolean;
}

function shortIdSuffix(id: string): string {
  // Phorest IDs are UUID-like; last 4 alphanumerics give a stable, scannable
  // short-form without leaking the full identifier in dense UI.
  const cleaned = id.replace(/[^a-zA-Z0-9]/g, '');
  return cleaned.slice(-4).toUpperCase() || cleaned.toUpperCase();
}

export function getDisplayClientName(
  source: AppointmentClientSource | null | undefined,
): DisplayClientName {
  const name = source?.client_name?.trim();
  if (name) {
    return { label: name, isResolved: true, isWalkIn: false, isPending: false };
  }

  const linkedId = source?.phorest_client_id || source?.client_id;
  if (linkedId) {
    return {
      label: `Client #${shortIdSuffix(linkedId)}`,
      isResolved: false,
      isWalkIn: false,
      isPending: true,
    };
  }

  return { label: 'Walk-in', isResolved: false, isWalkIn: true, isPending: false };
}

/** Compact-name variant — keeps the same three-state contract. */
export function getCompactDisplayClientName(
  source: AppointmentClientSource | null | undefined,
): DisplayClientName {
  const resolved = getDisplayClientName(source);
  if (!resolved.isResolved) return resolved;

  const parts = resolved.label.split(/\s+/);
  if (parts.length === 1) return resolved;
  return {
    ...resolved,
    label: `${parts[0]} ${parts[parts.length - 1][0]}.`,
  };
}
