/**
 * ProgressBarFill — Thick vertical progress bar as an alternative to TeardropFill.
 * Fill rises from bottom to top based on fillPercent (0–1).
 */

import { cn } from '@/lib/utils';

interface ProgressBarFillProps {
  fillPercent: number; // 0–1
  fillColor?: string;
  size?: number;
  className?: string;
}

export function ProgressBarFill({
  fillPercent,
  fillColor = 'hsl(262 83% 58%)',
  size = 200,
  className,
}: ProgressBarFillProps) {
  const clamped = Math.min(Math.max(fillPercent, 0), 1.15);
  const isOverfill = fillPercent > 1;
  const barWidth = 64;
  const barHeight = size * 1.4;
  const fillHeight = clamped * barHeight;

  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: barWidth + 40, height: barHeight }}
    >
      {/* Glow effect when filling */}
      {fillPercent > 0 && (
        <div
          className="absolute inset-0 rounded-3xl blur-3xl opacity-15 transition-opacity duration-500"
          style={{ backgroundColor: isOverfill ? 'hsl(0 72% 51%)' : fillColor }}
        />
      )}

      {/* Bar shell */}
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border transition-all duration-300',
          isOverfill
            ? 'border-red-500/60 animate-pulse'
            : 'border-[hsl(var(--platform-border)/0.3)]'
        )}
        style={{
          width: barWidth,
          height: barHeight,
          background: 'linear-gradient(180deg, hsl(var(--platform-bg-elevated)), hsl(var(--platform-bg-card)))',
        }}
      >
        {/* Fill rising from bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 transition-all duration-500 ease-out rounded-b-xl"
          style={{
            height: fillHeight,
            background: `linear-gradient(to top, ${fillColor}, ${fillColor}dd)`,
          }}
        >
          {/* Subtle wave line at fill top */}
          {fillPercent > 0.02 && fillPercent < 1.1 && (
            <div
              className="absolute top-0 left-0 right-0 h-2 transition-all duration-500"
              style={{
                background: `linear-gradient(to bottom, ${fillColor}66, transparent)`,
                borderRadius: '50% 50% 0 0',
              }}
            />
          )}
        </div>

        {/* Specular highlight */}
        <div
          className="absolute top-[15%] left-[12%] w-[20%] h-[35%] rounded-full opacity-[0.06]"
          style={{ background: 'white' }}
        />
      </div>
    </div>
  );
}
