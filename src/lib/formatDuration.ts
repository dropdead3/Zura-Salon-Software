/** 330 → "5h 30m", 45 → "45m", 60 → "1h", 90 → "1h 30m" */
export function formatMinutesToDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
