import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ReportConfig } from '@/lib/reportMetrics';
import { formatCurrency as formatCurrencyUtil, formatCurrencyWhole as formatCurrencyWholeUtil } from '@/lib/formatCurrency';

interface ReportPreviewProps {
  config: ReportConfig;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

// Mock data for preview
const MOCK_DATA = [
  { label: 'Location A', value: 45000, secondary: 12000 },
  { label: 'Location B', value: 38000, secondary: 9500 },
  { label: 'Location C', value: 28000, secondary: 7200 },
  { label: 'Location D', value: 22000, secondary: 5800 },
];

export function ReportPreview({ config }: ReportPreviewProps) {
  const hasMetrics = config.metrics.length > 0;

  const chartData = useMemo(() => {
    if (!hasMetrics) return [];
    return MOCK_DATA.map(d => ({
      name: d.label,
      [config.metrics[0]?.label || 'value']: d.value,
      ...(config.metrics[1] ? { [config.metrics[1].label || 'secondary']: d.secondary } : {}),
    }));
  }, [config.metrics, hasMetrics]);

  if (!hasMetrics) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        Select metrics to see preview
      </div>
    );
  }

  if (config.visualization === 'table') {
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dimension</TableHead>
              {config.metrics.map(m => (
                <TableHead key={m.id} className="text-right">{m.label || m.id}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_DATA.slice(0, 3).map((row, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell className="text-right">{formatCurrencyWholeUtil(row.value)}</TableCell>
                {config.metrics.length > 1 && (
                  <TableCell className="text-right">{formatCurrencyWholeUtil(row.secondary)}</TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (config.visualization === 'pie_chart') {
    return (
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey={config.metrics[0]?.label || 'value'}
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={60}
              label={({ name }) => name}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatCurrencyUtil(value)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (config.visualization === 'line_chart') {
    return (
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v) => formatCurrencyWholeUtil(v / 1000) + 'k'} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(value: number) => formatCurrencyUtil(value)} />
            <Line 
              type="monotone" 
              dataKey={config.metrics[0]?.label || 'value'} 
              stroke="hsl(var(--primary))" 
              strokeWidth={2} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Default: bar chart
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical">
          <XAxis type="number" tickFormatter={(v) => formatCurrencyWholeUtil(v / 1000) + 'k'} tick={{ fontSize: 10 }} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={70} />
          <Tooltip formatter={(value: number) => formatCurrencyUtil(value)} />
          <Bar 
            dataKey={config.metrics[0]?.label || 'value'} 
            fill="hsl(var(--primary))" 
            radius={[0, 4, 4, 0]} 
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
