import { cn } from '@/lib/utils';
import { TrendSparkline } from '@/components/dashboard/TrendSparkline';
import type { ServiceVolumeEntry } from '@/hooks/useServiceBookingVolumes';

/**
 * Wave 15a — Inline volume display for service rows.
 *
 * Renders trailing-30d count + a 6-week sparkline. Zombie services (0/30d)
 * surface a subtle gray "zombie" flag instead of an empty sparkline so the
 * defect is legible at a glance without lighting up the whole row.
 *
 * Loading state intentionally renders nothing to avoid flicker — the
 * surrounding row is already information-dense.
 */
export function ServiceVolumeCell({
  entry,
  loading,
}: {
  entry: ServiceVolumeEntry | undefined;
  loading?: boolean;
}) {
  if (loading) return null;
  const count = entry?.count30d ?? 0;
  const buckets = entry?.buckets ?? [];
  const isZombie = count === 0;

  if (isZombie) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-[10px] font-sans text-muted-foreground/70 italic',
        )}
        title="Zero bookings in trailing 30 days"
      >
        <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/30" />
        zombie
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <TrendSparkline data={buckets} width={48} height={16} />
      <span className="text-[10px] font-sans text-muted-foreground tabular-nums">
        {count}/30d
      </span>
    </span>
  );
}
