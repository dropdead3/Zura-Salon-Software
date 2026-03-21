import * as React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface HealthTrendLineProps {
  data: Array<{ score_date: string; score: number }>;
  height?: number;
  className?: string;
}

export function HealthTrendLine({ data, height = 100, className }: HealthTrendLineProps) {
  if (!data || data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center text-slate-500 text-sm', className)} style={{ height }}>
        No historical data
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: d.score_date,
    score: Number(d.score),
  }));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="date"
            tickFormatter={(value) => format(parseISO(value), 'MMM d')}
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={{ stroke: '#475569' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={{ stroke: '#475569' }}
            tickLine={false}
            width={30}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-lg">
                    <p className="text-slate-400 text-xs">{format(parseISO(data.date), 'MMM d, yyyy')}</p>
                    <p className="text-white font-medium">Score: {data.score}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#8b5cf6' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
