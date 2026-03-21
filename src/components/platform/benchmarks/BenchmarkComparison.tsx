import * as React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { formatMetricValue } from '@/hooks/useBenchmarkData';
import { cn } from '@/lib/utils';

interface ComparisonRow {
  metric_key: string;
  metric_label: string;
  format: 'currency' | 'percent' | 'number';
  org1_value: number;
  org1_percentile: number;
  org2_value: number;
  org2_percentile: number;
  difference: number;
  difference_percent: number;
}

interface BenchmarkComparisonProps {
  org1Name: string;
  org2Name: string;
  comparison: ComparisonRow[];
  className?: string;
}

export function BenchmarkComparison({ 
  org1Name, 
  org2Name, 
  comparison,
  className 
}: BenchmarkComparisonProps) {
  return (
    <div className={cn('rounded-lg border border-slate-700/50 overflow-hidden', className)}>
      {/* Header */}
      <div className="grid grid-cols-4 bg-slate-800/50 border-b border-slate-700/50 p-3">
        <div className="text-sm text-slate-400 font-medium">Metric</div>
        <div className="text-sm text-slate-400 font-medium text-center">{org1Name}</div>
        <div className="text-sm text-slate-400 font-medium text-center">{org2Name}</div>
        <div className="text-sm text-slate-400 font-medium text-center">Difference</div>
      </div>

      {/* Rows */}
      {comparison.map((row) => {
        const isPositive = row.difference > 0;
        const isNegative = row.difference < 0;
        const isNeutral = row.difference === 0;

        return (
          <div 
            key={row.metric_key}
            className="grid grid-cols-4 items-center p-3 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/30"
          >
            <div className="text-sm text-white font-medium">{row.metric_label}</div>
            
            <div className="text-center">
              <span className="text-sm text-white">
                {formatMetricValue(row.org1_value, row.format)}
              </span>
              <span className="text-xs text-slate-500 ml-1">
                (Top {100 - row.org1_percentile}%)
              </span>
            </div>

            <div className="text-center">
              <span className="text-sm text-white">
                {formatMetricValue(row.org2_value, row.format)}
              </span>
              <span className="text-xs text-slate-500 ml-1">
                (Top {100 - row.org2_percentile}%)
              </span>
            </div>

            <div className="flex items-center justify-center gap-1">
              {isPositive && <ArrowUpRight className="w-4 h-4 text-emerald-400" />}
              {isNegative && <ArrowDownRight className="w-4 h-4 text-red-400" />}
              {isNeutral && <Minus className="w-4 h-4 text-slate-500" />}
              <span className={cn(
                'text-sm',
                isPositive && 'text-emerald-400',
                isNegative && 'text-red-400',
                isNeutral && 'text-slate-500'
              )}>
                {isPositive && '+'}
                {formatMetricValue(row.difference, row.format)}
                {row.difference_percent !== 0 && (
                  <span className="text-xs ml-1">
                    ({isPositive && '+'}{row.difference_percent.toFixed(0)}%)
                  </span>
                )}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
