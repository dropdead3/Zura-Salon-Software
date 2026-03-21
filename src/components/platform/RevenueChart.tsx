import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

interface MonthlyRevenueData {
  month: string;
  revenue: number;
}

interface PlanRevenueData {
  tier: string;
  revenue: number;
  count: number;
}

interface RevenueChartProps {
  data: MonthlyRevenueData[];
}

interface PlanBreakdownChartProps {
  data: PlanRevenueData[];
}

import { formatCurrencyWhole } from '@/lib/formatCurrency';

const tierColors: Record<string, string> = {
  starter: '#8b5cf6',
  standard: '#3b82f6',
  professional: '#10b981',
  enterprise: '#f59e0b',
};

const tierLabels: Record<string, string> = {
  starter: 'Starter',
  standard: 'Standard',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 shadow-xl">
        <p className="text-sm font-medium text-slate-300">{label}</p>
        <p className="text-lg font-medium text-violet-400">
          {formatCurrencyWhole(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const PlanTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 shadow-xl">
        <p className="text-sm font-medium text-slate-300">
          {tierLabels[data.tier] || data.tier}
        </p>
        <p className="text-lg font-medium text-violet-400">
          {formatCurrencyWhole(data.revenue)}
        </p>
        <p className="text-xs text-slate-400">{data.count} accounts</p>
      </div>
    );
  }
  return null;
};

export function MonthlyRevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis 
          dataKey="month" 
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 12 }}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          tickFormatter={(value) => formatCurrencyWhole(value)}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#8b5cf6"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorRevenue)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function PlanBreakdownChart({ data }: PlanBreakdownChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis 
          dataKey="tier" 
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          tickFormatter={(value) => tierLabels[value] || value}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          tickFormatter={(value) => formatCurrencyWhole(value)}
        />
        <Tooltip content={<PlanTooltip />} />
        <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={tierColors[entry.tier] || '#8b5cf6'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PlanDistributionPie({ data }: PlanBreakdownChartProps) {
  const pieData = data.map(item => ({
    name: tierLabels[item.tier] || item.tier,
    value: item.count,
    color: tierColors[item.tier] || '#8b5cf6',
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={0}
          stroke="hsl(var(--border) / 0.4)"
          strokeWidth={1}
          dataKey="value"
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number) => [`${value} accounts`, '']}
          contentStyle={{ 
            backgroundColor: '#1e293b', 
            border: '1px solid #334155',
            borderRadius: '8px',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
