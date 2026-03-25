/**
 * TeardropFill — Animated teardrop SVG with clip-based fill.
 * Fill rises from bottom to top based on fillPercent (0–1).
 */

import { cn } from '@/lib/utils';

interface TeardropFillProps {
  fillPercent: number; // 0–1
  fillColor?: string;
  size?: number;
  className?: string;
}

// Teardrop path in a 100x140 viewBox (pointed top, round bottom)
const TEARDROP_PATH =
  'M50 4 C50 4 10 55 10 90 C10 115 28 136 50 136 C72 136 90 115 90 90 C90 55 50 4 50 4Z';

export function TeardropFill({
  fillPercent,
  fillColor = 'hsl(262 83% 58%)', // violet-500 fallback
  size = 200,
  className,
}: TeardropFillProps) {
  const clamped = Math.min(Math.max(fillPercent, 0), 1.15); // allow slight overfill visual
  const isOverfill = fillPercent > 1;
  // Fill rises from bottom (y=140) to top (y=0)
  const fillY = 140 - clamped * 140;

  const uniqueId = `teardrop-clip-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: size, height: size * 1.4 }}
    >
      {/* Glow effect when filling */}
      {fillPercent > 0 && (
        <div
          className="absolute inset-0 rounded-full blur-3xl opacity-20 transition-opacity duration-500"
          style={{ backgroundColor: isOverfill ? 'hsl(0 72% 51%)' : fillColor }}
        />
      )}

      <svg
        viewBox="0 0 100 140"
        width={size}
        height={size * 1.4}
        className="relative z-10"
      >
        <defs>
          <clipPath id={uniqueId}>
            <path d={TEARDROP_PATH} />
          </clipPath>

          {/* 3D depth gradient for the empty shell */}
          <radialGradient id={`${uniqueId}-shell`} cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="hsl(var(--platform-bg-elevated))" />
            <stop offset="100%" stopColor="hsl(var(--platform-bg-card))" />
          </radialGradient>

          {/* Fill gradient — slightly lighter at top for liquid effect */}
          <linearGradient id={`${uniqueId}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Empty shell */}
        <path
          d={TEARDROP_PATH}
          fill={`url(#${uniqueId}-shell)`}
          stroke="hsl(var(--platform-border))"
          strokeWidth="1"
          strokeOpacity="0.3"
        />

        {/* Liquid fill — clipped to teardrop, rect rises */}
        <g clipPath={`url(#${uniqueId})`}>
          <rect
            x="0"
            y={fillY}
            width="100"
            height={140 - fillY}
            fill={`url(#${uniqueId}-fill)`}
            className="transition-all duration-500 ease-out"
          />

          {/* Subtle wave line at fill top */}
          {fillPercent > 0.02 && fillPercent < 1.1 && (
            <ellipse
              cx="50"
              cy={fillY}
              rx="42"
              ry="3"
              fill={fillColor}
              opacity="0.4"
              className="transition-all duration-500 ease-out"
            />
          )}
        </g>

        {/* Overfill border glow */}
        {isOverfill && (
          <path
            d={TEARDROP_PATH}
            fill="none"
            stroke="hsl(0 72% 51%)"
            strokeWidth="2.5"
            strokeOpacity="0.6"
            className="animate-pulse"
          />
        )}

        {/* Specular highlight */}
        <ellipse
          cx="38"
          cy="70"
          rx="8"
          ry="20"
          fill="white"
          opacity="0.06"
          transform="rotate(-15 38 70)"
        />
      </svg>
    </div>
  );
}
