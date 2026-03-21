import { useMemo, useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  CartesianGrid,
} from 'recharts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { formatCurrencyWhole } from '@/lib/formatCurrency';
import { motion } from 'framer-motion';
import type { LocationCardData } from './LocationComparisonCard';

let barIdCounter = 0;

const AnimatedBar = (props: any) => {
  const { x, y, width, height, fill, stroke, strokeWidth, index } = props;
  const [animWidth, setAnimWidth] = useState(0);
  const [clipId] = useState(() => `loc-bar-clip-${barIdCounter++}`);

  useEffect(() => {
    const delay = (index || 0) * 60;
    const t = setTimeout(() => setAnimWidth(width || 0), delay + 50);
    return () => clearTimeout(t);
  }, [width, index]);

  const w = width || 0;
  const h = height || 0;
  const r = Math.min(4, w / 2, h / 2);
  if (h <= 0) return null;

  const clipPath = w > 0
    ? `M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x} Z`
    : `M${x},${y} H${x} V${y + h} H${x} Z`;

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <path d={clipPath} />
        </clipPath>
      </defs>
      <rect
        x={x} y={y} width={animWidth} height={h}
        fill={fill}
        stroke={animWidth > 0 ? stroke : 'none'}
        strokeWidth={strokeWidth}
        clipPath={`url(#${clipId})`}
        style={{ transition: 'width 800ms cubic-bezier(0.25, 1, 0.5, 1)' }}
      />
    </g>
  );
};

interface LocationBarChartProps {
  locations: LocationCardData[];
  colors: string[];
  totalRevenue: number;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-medium">{d.name}</p>
      <p className="text-muted-foreground">
        <BlurredAmount>{formatCurrencyWhole(d.totalRevenue)}</BlurredAmount>
        <span className="ml-2">({Math.round(d.sharePercent)}%)</span>
      </p>
    </div>
  );
}

export function LocationBarChart({ locations, colors, totalRevenue }: LocationBarChartProps) {
  const data = useMemo(() =>
    [...locations].sort((a, b) => b.totalRevenue - a.totalRevenue),
    [locations]
  );

  // Unique gradient defs for each color
  const gradientDefs = useMemo(() => {
    const unique = [...new Set(colors.slice(0, data.length))];
    return unique.map(hex => ({ id: `loc-glass-${hex.replace('#', '')}`, hex }));
  }, [colors, data.length]);

  const barHeight = 36;
  const chartHeight = Math.max(200, data.length * barHeight + 40);
  const needsScroll = data.length > 15;

  const chart = (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical" barSize={24} margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
        <defs>
          {gradientDefs.map(({ id, hex }) => (
            <linearGradient key={id} id={id} x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor={hex} stopOpacity={0.75} />
              <stop offset="40%" stopColor={hex} stopOpacity={0.55} />
              <stop offset="100%" stopColor={hex} stopOpacity={0.35} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.15)' }} />
        <Bar dataKey="totalRevenue" radius={[0, 4, 4, 0]} shape={<AnimatedBar />} isAnimationActive={false}>
          {data.map((_, i) => {
            const hex = colors[i % colors.length];
            const gradId = `loc-glass-${hex.replace('#', '')}`;
            return (
              <Cell key={i} fill={`url(#${gradId})`} stroke={`${hex}50`} strokeWidth={1} />
            );
          })}
          <LabelList
            dataKey="totalRevenue"
            position="insideRight"
            content={({ x, y, width, height, value, index }: any) => {
              const barW = width || 0;
              const barH = height || 0;
              const padY = 3;
              const padX = 4;
              const badgeH = barH - padY * 2;
              const label = formatCurrencyWhole(Number(value));
              const badgeW = Math.max(label.length * 6.5 + 14, 50);
              if (badgeW + padX * 2 > barW) return null;
              const bx = (x || 0) + barW - badgeW - padX;
              const by = (y || 0) + padY;
              const delay = (index || 0) * 60 + 650;
              return (
                <g opacity={0} style={{ animation: `svgFadeIn 350ms ease-out ${delay}ms forwards` }}>
                  <rect x={bx} y={by} width={badgeW} height={badgeH} rx={3} fill="hsl(var(--background) / 0.8)" />
                  <text
                    x={bx + badgeW / 2} y={by + badgeH / 2 + 4}
                    textAnchor="middle"
                    style={{ fontSize: 10, fontWeight: 500, fill: 'hsl(var(--foreground))' }}
                  >
                    {label}
                  </text>
                </g>
              );
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
    >
      {needsScroll ? (
        <ScrollArea className="max-h-[480px]">{chart}</ScrollArea>
      ) : (
        chart
      )}
    </motion.div>
  );
}
