import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBenchmarkContext, getBenchmarkColor } from '@/hooks/useBenchmarks';
import { cn } from '@/lib/utils';
import { formatCurrencyWhole as formatCurrencyWholeUtil } from '@/lib/formatCurrency';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { TrendingUp, TrendingDown, Target, Building2, History } from 'lucide-react';

interface BenchmarkBarProps {
  metricKey: string;
  currentValue: number;
  format?: 'currency' | 'percent' | 'number';
  label: string;
  inverse?: boolean; // For metrics where lower is better
}

const ICON_MAP = {
  industry: Building2,
  historical: History,
  goal: Target,
  peer: Building2,
};

export function BenchmarkBar({ 
  metricKey, 
  currentValue, 
  format = 'currency',
  label,
  inverse = false,
}: BenchmarkBarProps) {
  const context = useBenchmarkContext(metricKey, currentValue);
  const { formatNumber } = useFormatNumber();
  
  const formatValue = (value: number): string => {
    switch (format) {
      case 'currency':
        return formatCurrencyWholeUtil(value);
      case 'percent':
        return `${value.toFixed(1)}%`;
      default:
        return formatNumber(value);
    }
  };

  // Find the max value for scale
  const allValues = [currentValue, ...context.benchmarks.map(b => b.value)];
  const maxValue = Math.max(...allValues) * 1.1; // 10% padding
  const minValue = 0;
  const range = maxValue - minValue;

  const getPosition = (value: number): number => {
    return ((value - minValue) / range) * 100;
  };

  if (context.benchmarks.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-lg font-medium">{formatValue(currentValue)}</span>
        </div>

        {/* Progress bar with markers */}
        <div className="relative h-3 bg-muted rounded-full overflow-visible">
          {/* Current value fill */}
          <div
            className="absolute h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${Math.min(getPosition(currentValue), 100)}%` }}
          />

          {/* Benchmark markers */}
          {context.benchmarks.map((benchmark, i) => {
            const Icon = ICON_MAP[benchmark.type] || Target;
            const position = getPosition(benchmark.value);
            
            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer z-10"
                    style={{ left: `${Math.min(position, 100)}%` }}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 bg-background flex items-center justify-center',
                      benchmark.type === 'goal' ? 'border-amber-500' :
                      benchmark.type === 'industry' ? 'border-blue-500' :
                      'border-muted-foreground'
                    )}>
                      <div className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        benchmark.type === 'goal' ? 'bg-amber-500' :
                        benchmark.type === 'industry' ? 'bg-blue-500' :
                        'bg-muted-foreground'
                      )} />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p className="font-medium">{benchmark.label}</p>
                    <p>{formatValue(benchmark.value)}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Benchmark comparisons */}
        <div className="mt-4 space-y-1.5">
          {context.benchmarks.map((benchmark, i) => {
            const Icon = ICON_MAP[benchmark.type] || Target;
            const colorClass = getBenchmarkColor(benchmark.percentDiff, inverse);
            const isAbove = benchmark.percentDiff > 0;
            
            return (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Icon className="w-3 h-3" />
                  <span>{benchmark.label}: {formatValue(benchmark.value)}</span>
                </div>
                <div className={cn('flex items-center gap-1', colorClass)}>
                  {isAbove ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>
                    {isAbove ? '+' : ''}{benchmark.percentDiff.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
