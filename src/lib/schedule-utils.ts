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
  const targetStart = parseTimeToMinutes(target.start_time);
  const targetEnd = parseTimeToMinutes(target.end_time);

  const overlapping = appointments.filter((apt) => {
    const aptStart = parseTimeToMinutes(apt.start_time);
    const aptEnd = parseTimeToMinutes(apt.end_time);
    return !(aptEnd <= targetStart || aptStart >= targetEnd);
  });

  overlapping.sort(
    (a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time),
  );
  const columnIndex = overlapping.findIndex((apt) => apt.id === target.id);

  return { columnIndex, totalOverlapping: overlapping.length };
}
