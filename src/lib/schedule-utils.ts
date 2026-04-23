/**
 * Shared schedule utilities — single source of truth.
 * Replaces duplicated parseTimeToMinutes / formatTime12h / getEventStyle / getOverlapInfo
 * across DayView, WeekView, AgendaView, MeetingCard, AssistantBlockOverlay, etc.
 */

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes.slice(0, 2)} ${ampm}`;
}

export function formatMinutesAs12h(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

export function getEventStyle(
  startTime: string,
  endTime: string,
  hoursStart: number,
  rowHeight: number = 20,
  slotInterval: number = 15,
) {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  const startOffset = startMinutes - hoursStart * 60;
  const duration = endMinutes - startMinutes;
  const top = Math.max(0, (startOffset / slotInterval) * rowHeight);
  const height = Math.max((Math.max(0, duration) / slotInterval) * rowHeight, rowHeight);
  return { top: `${top}px`, height: `${height}px` };
}

/**
 * For a target appointment, find how many siblings overlap it and
 * which column index this appointment should occupy.
 */
export interface OverlapInfo {
  columnIndex: number;
  totalOverlapping: number;
}

/**
 * Overlap column layout — fully rounded cards that visually "kiss".
 *
 * Each card keeps its full rounded-lg + 1px stroke on all four sides.
 * To eliminate the slot of background that would otherwise appear between
 * two side-by-side rounded pills, we extend each non-last column's width
 * by OVERLAP_KISS_PX into its right neighbor. The kiss value matches the
 * corner radius of `rounded-lg` (~8px tangent), so the rounded edges meet
 * with no visible white sliver.
 *
 * z-index: leftmost column wins, decreasing rightward, so the rounded
 * right edge of column N sits over column N+1's left stroke.
 */
const OVERLAP_KISS_PX = 8;

export interface OverlapColumnLayout {
  left: string;
  width: string;
  isFirstOverlapCol: boolean;
  isLastOverlapCol: boolean;
  isOverlapping: boolean;
  zIndex: number;
}

export function getOverlapColumnLayout(
  columnIndex: number,
  totalOverlapping: number,
): OverlapColumnLayout {
  const widthPercent = 100 / Math.max(1, totalOverlapping);
  const leftPercent = columnIndex * widthPercent;
  const isFirstOverlapCol = columnIndex === 0;
  const isLastOverlapCol = columnIndex === totalOverlapping - 1;
  const isOverlapping = totalOverlapping > 1;
  // Extend each non-last overlap column into its right neighbor by the
  // kiss amount so the rounded edges visually touch with no background
  // sliver. Last column stays exact so it does not bleed past the stylist
  // column's right edge.
  const width = isOverlapping && !isLastOverlapCol
    ? `calc(${widthPercent}% + ${OVERLAP_KISS_PX}px)`
    : `${widthPercent}%`;
  // Leftmost column gets the highest z; decreasing rightward.
  // Base 10 matches the `z-10` baseline used by absolutely-positioned cards.
  const zIndex = isOverlapping ? 10 + (totalOverlapping - columnIndex) : 10;
  return {
    left: `${leftPercent}%`,
    width,
    isFirstOverlapCol,
    isLastOverlapCol,
    isOverlapping,
    zIndex,
  };
}

/**
 * Compute pixel-snapped render metrics for the current-time indicator and
 * the "past" overlay rectangle, ensuring both share an identical pixel boundary.
 *
 * - `linePx`: integer top offset for the indicator bar (border-t-2)
 * - `overlayPx`: height for the gray overlay, snapped to end exactly at the
 *   visible top edge of the indicator line (no 1–2px subpixel halo)
 * - `visible`: whether the indicator falls within the rendered grid
 */
export function getCurrentTimeRenderMetrics(
  nowMinutes: number,
  hoursStart: number,
  slotInterval: number,
  rowHeight: number,
  totalSlots: number,
): { linePx: number; overlayPx: number; visible: boolean } {
  const gridHeight = totalSlots * rowHeight;
  const raw = ((nowMinutes - hoursStart * 60) / slotInterval) * rowHeight;
  const clamped = Math.max(0, Math.min(raw, gridHeight));
  const linePx = Math.round(clamped);
  // Overlay stops exactly at the visible top edge of the line — no spillover.
  const overlayPx = Math.max(0, linePx);
  const visible = clamped > 0 && clamped < gridHeight;
  return { linePx, overlayPx, visible };
}

/**
 * Compute the next "available" 15-min interval ≥ now, clamped to business hours.
 *
 * - Rounds `now` up to the next `slotMinutes` boundary.
 * - Before business start → today at `businessStartHour:00`.
 * - At/after business end → tomorrow at `businessStartHour:00`.
 *
 * Returns a date object (midnight) and "HH:MM" 24h time string. The date
 * object is constructed from local Y/M/D — safe for date-fns sequences.
 */
export function getNextAvailableSlot(
  now: Date = new Date(),
  slotMinutes: number = 15,
  businessStartHour: number = 9,
  businessEndHour: number = 19,
): { date: Date; time: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const todayMidnight = new Date(y, m, d, 0, 0, 0, 0);

  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = businessStartHour * 60;
  const endMins = businessEndHour * 60;

  // Before business hours → today at start
  if (nowMins < startMins) {
    return { date: todayMidnight, time: `${String(businessStartHour).padStart(2, '0')}:00` };
  }

  // At/after business end → tomorrow at start
  if (nowMins >= endMins) {
    const tomorrow = new Date(y, m, d + 1, 0, 0, 0, 0);
    return { date: tomorrow, time: `${String(businessStartHour).padStart(2, '0')}:00` };
  }

  // Round up to next slot boundary
  const rounded = Math.ceil(nowMins / slotMinutes) * slotMinutes;
  // If rounding pushed past business end, bump to tomorrow
  if (rounded >= endMins) {
    const tomorrow = new Date(y, m, d + 1, 0, 0, 0, 0);
    return { date: tomorrow, time: `${String(businessStartHour).padStart(2, '0')}:00` };
  }

  const h = Math.floor(rounded / 60);
  const min = rounded % 60;
  return {
    date: todayMidnight,
    time: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
  };
}

export function getOverlapInfo<T extends { id: string; start_time: string; end_time: string }>(
  appointments: T[],
  target: T,
): OverlapInfo {
  const map = buildOverlapLayoutMap(appointments);
  const entry = map.get(target.id);
  if (!entry) return { columnIndex: 0, totalOverlapping: 1 };
  return { columnIndex: entry.columnIndex, totalOverlapping: entry.totalColumns };
}

/**
 * Cluster-aware overlap layout — single source of truth for scheduler packing.
 *
 * Per-appointment overlap math is unstable: two cards in the same visual
 * conflict cluster can compute different totals when one only overlaps a
 * subset of the cluster. This helper guarantees that every appointment in
 * the same connected overlap cluster shares the same `totalColumns`, so all
 * cards in the stack render against an identical column system.
 *
 * Algorithm:
 *  1. Sort appointments by start, then by end.
 *  2. Walk in time order. Group connected overlaps into clusters using a
 *     running "cluster end" — any new appointment that starts before the
 *     cluster's max end belongs to the same cluster.
 *  3. Inside each cluster, assign columns via first-fit interval packing
 *     (place each appointment in the lowest-index column whose previous
 *     occupant has already ended).
 *  4. After packing, the cluster's `totalColumns = max(columnIndex) + 1`
 *     is broadcast to every appointment in that cluster.
 */
export interface OverlapLayoutEntry {
  columnIndex: number;
  totalColumns: number;
  clusterId: number;
  isOverlapping: boolean;
}

export function buildOverlapLayoutMap<
  T extends { id: string; start_time: string; end_time: string },
>(appointments: T[]): Map<string, OverlapLayoutEntry> {
  const result = new Map<string, OverlapLayoutEntry>();
  if (appointments.length === 0) return result;

  // Stable sort: start asc, then end asc, then id for determinism.
  const sorted = [...appointments].sort((a, b) => {
    const as = parseTimeToMinutes(a.start_time);
    const bs = parseTimeToMinutes(b.start_time);
    if (as !== bs) return as - bs;
    const ae = parseTimeToMinutes(a.end_time);
    const be = parseTimeToMinutes(b.end_time);
    if (ae !== be) return ae - be;
    return a.id.localeCompare(b.id);
  });

  let clusterId = 0;
  let clusterStart = 0;
  let clusterAppts: { apt: T; start: number; end: number; col: number }[] = [];
  let columnEnds: number[] = []; // end-minute of last appointment placed in each column
  let clusterMaxEnd = -Infinity;

  const flushCluster = () => {
    if (clusterAppts.length === 0) return;
    const totalColumns = columnEnds.length;
    for (const item of clusterAppts) {
      result.set(item.apt.id, {
        columnIndex: item.col,
        totalColumns,
        clusterId,
        isOverlapping: totalColumns > 1,
      });
    }
    clusterId += 1;
    clusterAppts = [];
    columnEnds = [];
    clusterMaxEnd = -Infinity;
  };

  for (const apt of sorted) {
    const start = parseTimeToMinutes(apt.start_time);
    const end = parseTimeToMinutes(apt.end_time);

    // If this appointment starts at/after the cluster's max end, the
    // current cluster is closed and a new one begins.
    if (start >= clusterMaxEnd) {
      flushCluster();
    }

    // First-fit: find lowest column whose previous appointment has ended
    // by `start`. If none, open a new column.
    let col = -1;
    for (let i = 0; i < columnEnds.length; i++) {
      if (columnEnds[i] <= start) {
        col = i;
        break;
      }
    }
    if (col === -1) {
      col = columnEnds.length;
      columnEnds.push(end);
    } else {
      columnEnds[col] = end;
    }

    clusterAppts.push({ apt, start, end, col });
    if (end > clusterMaxEnd) clusterMaxEnd = end;
    clusterStart = start;
  }
  flushCluster();

  return result;
}
