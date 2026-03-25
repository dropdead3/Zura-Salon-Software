/** 330 → "5h 30m", 45 → "45m", 60 → "1h", 90 → "1h 30m" */
export function formatMinutesToDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** 330 → "5 hours 30 min", 45 → "45 minutes", 60 → "1 hour", 120 → "2 hours" */
export function formatMinutesToDurationLong(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m > 0) return `${h} hour${h !== 1 ? 's' : ''} ${m} min`;
  return `${h} hour${h !== 1 ? 's' : ''}`;
}
