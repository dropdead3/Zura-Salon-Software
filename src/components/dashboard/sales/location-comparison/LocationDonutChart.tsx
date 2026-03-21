import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { formatCurrencyWhole } from '@/lib/formatCurrency';
import { motion } from 'framer-motion';
import type { LocationCardData } from './LocationComparisonCard';

interface LocationDonutChartProps {
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

function CenterLabel({ viewBox, totalRevenue }: any) {
  const { cx, cy } = viewBox;
  return (
    <g>
      <text x={cx} y={cy - 6} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={10} className="uppercase tracking-wider">
        Total
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={16} fontWeight={500} className="font-display">
        ${(totalRevenue / 1000).toFixed(0)}k
      </text>
    </g>
  );
}

export function LocationDonutChart({ locations, colors, totalRevenue }: LocationDonutChartProps) {
  const data = useMemo(() =>
    locations.map((loc, i) => ({
      name: loc.name,
      value: loc.totalRevenue,
      totalRevenue: loc.totalRevenue,
      sharePercent: loc.sharePercent,
      fill: colors[i % colors.length],
    })),
    [locations, colors]
  );

  // Build unique gradient defs per color
  const gradientDefs = useMemo(() => {
    const unique = [...new Set(colors.slice(0, locations.length))];
    return unique.map(hex => ({ id: `donut-glass-${hex.replace('#', '')}`, hex }));
  }, [colors, locations.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
    >
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <defs>
            {gradientDefs.map(({ id, hex }) => (
              <linearGradient key={id} id={id} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={hex} stopOpacity={0.9} />
                <stop offset="50%" stopColor={hex} stopOpacity={0.7} />
                <stop offset="100%" stopColor={hex} stopOpacity={0.5} />
              </linearGradient>
            ))}
          </defs>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={0}
            stroke="hsl(var(--border) / 0.4)"
            strokeWidth={1}
            label={false}
            startAngle={90}
            endAngle={-270}
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={1200}
            animationEasing="ease-out"
          >
            {data.map((_, i) => {
              const hex = colors[i % colors.length];
              const gradId = `donut-glass-${hex.replace('#', '')}`;
              return <Cell key={i} fill={`url(#${gradId})`} />;
            })}
            <CenterLabel totalRevenue={totalRevenue} />
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value: string) => (
              <span className="text-xs text-muted-foreground">{value}</span>
            )}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
