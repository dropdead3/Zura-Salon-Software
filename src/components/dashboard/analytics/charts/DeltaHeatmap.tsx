import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatCurrencyWhole as formatCurrencyWholeUtil } from '@/lib/formatCurrency';

interface HeatmapDataPoint {
  dimension: string;
  subdimension: string;
  periodA: number;
  periodB: number;
  changePercent: number;
}

interface DeltaHeatmapProps {
  data: HeatmapDataPoint[];
  isLoading?: boolean;
  title?: string;
  xLabel?: string;
  yLabel?: string;
}

export function DeltaHeatmap({
  data,
  isLoading,
  title = 'Change Intensity',
  xLabel = 'Day of Week',
  yLabel = 'Hour',
}: DeltaHeatmapProps) {
  const { grid, dimensions, subdimensions, maxChange } = useMemo(() => {
    const dims = [...new Set(data.map(d => d.dimension))];
    const subdims = [...new Set(data.map(d => d.subdimension))];
    
    const gridMap: Record<string, Record<string, HeatmapDataPoint>> = {};
    let max = 0;

    data.forEach(d => {
      if (!gridMap[d.dimension]) gridMap[d.dimension] = {};
      gridMap[d.dimension][d.subdimension] = d;
      max = Math.max(max, Math.abs(d.changePercent));
    });

    return {
      grid: gridMap,
      dimensions: dims,
      subdimensions: subdims,
      maxChange: max || 1,
    };
  }, [data]);

  const getColor = (changePercent: number): string => {
    const intensity = Math.min(Math.abs(changePercent) / maxChange, 1);
    
    if (changePercent > 0) {
      // Green gradient for positive
      const opacity = 0.2 + intensity * 0.8;
      return `hsl(var(--chart-2) / ${opacity})`;
    } else if (changePercent < 0) {
      // Red gradient for negative
      const opacity = 0.2 + intensity * 0.8;
      return `hsl(var(--destructive) / ${opacity})`;
    }
    return 'hsl(var(--muted))';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No data available for heatmap
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-xs text-muted-foreground font-normal text-left pb-2 pr-2">
                  {yLabel}
                </th>
                {subdimensions.map(sub => (
                  <th key={sub} className="text-xs text-muted-foreground font-normal pb-2 px-1 text-center">
                    {sub}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dimensions.map(dim => (
                <tr key={dim}>
                  <td className="text-xs text-muted-foreground pr-2 py-0.5">{dim}</td>
                  {subdimensions.map(sub => {
                    const cell = grid[dim]?.[sub];
                    const changePercent = cell?.changePercent || 0;
                    
                    return (
                      <td key={sub} className="px-0.5 py-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'w-8 h-8 rounded-sm cursor-default transition-transform hover:scale-110',
                                'flex items-center justify-center'
                              )}
                              style={{ backgroundColor: getColor(changePercent) }}
                            >
                              {Math.abs(changePercent) >= 10 && (
                                <span className="text-[10px] font-medium text-foreground">
                                  {changePercent > 0 ? '+' : ''}{changePercent.toFixed(0)}%
                                </span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <p className="font-medium">{dim} - {sub}</p>
                              <p>Previous: {formatCurrencyWholeUtil(cell?.periodA ?? 0)}</p>
                              <p>Current: {formatCurrencyWholeUtil(cell?.periodB ?? 0)}</p>
                              <p className={changePercent >= 0 ? 'text-chart-2' : 'text-destructive'}>
                                Change: {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[-100, -50, 0, 50, 100].map(v => (
                <div
                  key={v}
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: getColor(v) }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>← Decrease</span>
            <span>Increase →</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
