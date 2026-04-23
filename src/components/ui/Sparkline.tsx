import * as React from 'react';
import { cn } from '@/lib/utils';

interface SparklineProps {
  /** Series of numeric values, oldest → newest. */
  data: number[];
  /** Px width. Defaults to fluid (100%). */
  width?: number | string;
  height?: number;
  /** Stroke color — defaults to currentColor (inherits text color). */
  stroke?: string;
  strokeWidth?: number;
  /** Fill area beneath the line as a soft gradient. */
  fill?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * Minimal SVG sparkline. Pure-render, no deps.
 * Wave 1 component — drop into any KPI card behind/below the value.
 *
 * Doctrine: ranks visual quality higher than chart precision. No axis,
 * no tooltip, no gridlines — pure data shape.
 */
export const Sparkline = React.forwardRef<SVGSVGElement, SparklineProps>(
  (
    {
      data,
      width = '100%',
      height = 32,
      stroke = 'currentColor',
      strokeWidth = 1.5,
      fill = true,
      className,
      ariaLabel = 'Trend sparkline',
    },
    ref
  ) => {
    if (!data || data.length < 2) {
      return (
        <svg
          ref={ref}
          width={width}
          height={height}
          className={cn('opacity-40', className)}
          aria-hidden="true"
        />
      );
    }

    const w = 100; // viewBox width — scaled by SVG width attribute
    const h = 32;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2; // 2px top/bottom padding
      return [x, y] as const;
    });

    const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
    const areaPath = `${linePath} L${w},${h} L0,${h} Z`;
    const gradientId = React.useId();

    return (
      <svg
        ref={ref}
        viewBox={`0 0 ${w} ${h}`}
        width={width}
        height={height}
        preserveAspectRatio="none"
        className={cn('overflow-visible', className)}
        role="img"
        aria-label={ariaLabel}
      >
        {fill && (
          <>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
                <stop offset="100%" stopColor={stroke} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#${gradientId})`} />
          </>
        )}
        <path
          d={linePath}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }
);
Sparkline.displayName = 'Sparkline';
