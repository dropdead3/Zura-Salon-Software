import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { DollarSign, Users, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { VisibilityGate } from '@/components/visibility/VisibilityGate';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { formatCurrency as formatCurrencyUtil } from '@/lib/formatCurrency';

interface RentRevenueTabProps {
  organizationId: string;
}

export function RentRevenueTab({ organizationId }: RentRevenueTabProps) {
  const { formatDate } = useFormatDate();
  const { formatCurrencyWhole } = useFormatCurrency();
  // Fetch rent revenue stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['rent-revenue-stats', organizationId],
    queryFn: async () => {
      // Get all rent payments for the last 12 months
      const startDate = format(subMonths(new Date(), 11), 'yyyy-MM-01');
      
      const { data: payments } = await supabase
        .from('rent_payments' as any)
        .select('amount, late_fee_amount, paid_at, due_date, status')
        .eq('organization_id', organizationId)
        .gte('due_date', startDate);

      // Get active booth renters count
      const { data: renters } = await supabase
        .from('booth_renter_profiles' as any)
        .select('id')
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      // Calculate stats
      const now = new Date();
      const currentMonth = format(now, 'yyyy-MM');
      
      let totalCollected = 0;
      let totalExpected = 0;
      let currentMonthCollected = 0;
      let currentMonthExpected = 0;
      let overdueAmount = 0;
      let overdueCount = 0;
      let lateFees = 0;

      const monthlyData = new Map<string, { collected: number; expected: number; late_fees: number }>();

      ((payments || []) as any[]).forEach((payment: any) => {
        const monthKey = format(new Date(payment.due_date), 'yyyy-MM');
        const amount = payment.amount || 0;
        const lateFee = payment.late_fee_amount || 0;

        const existing = monthlyData.get(monthKey) || { collected: 0, expected: 0, late_fees: 0 };
        existing.expected += amount;

        if (payment.status === 'paid') {
          existing.collected += amount;
          totalCollected += amount;
          lateFees += lateFee;
        }

        if (payment.status === 'overdue') {
          overdueAmount += amount;
          overdueCount++;
        }

        totalExpected += amount;
        monthlyData.set(monthKey, existing);

        if (monthKey === currentMonth) {
          currentMonthExpected += amount;
          if (payment.status === 'paid') {
            currentMonthCollected += amount;
          }
        }
      });

      // Convert to array for chart
      const chartData = Array.from(monthlyData.entries())
        .map(([month, data]) => ({
          month: formatDate(new Date(month + '-01'), 'MMM'),
          collected: data.collected,
          expected: data.expected,
          late_fees: data.late_fees,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

      return {
        totalCollected,
        totalExpected,
        currentMonthCollected,
        currentMonthExpected,
        collectionRate,
        overdueAmount,
        overdueCount,
        lateFees,
        activeRenters: (renters || []).length,
        chartData,
      };
    },
    enabled: !!organizationId,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-muted rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <VisibilityGate 
          elementKey="rent_mtd_collected" 
          elementName="MTD Rent Collected" 
          elementCategory="Analytics Hub - Rent"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">MTD Collected</p>
                  <p className="text-2xl font-medium">
                    {formatCurrencyWhole(stats?.currentMonthCollected || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    of {formatCurrencyWhole(stats?.currentMonthExpected || 0)} expected
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-500/10">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </VisibilityGate>

        <VisibilityGate 
          elementKey="rent_collection_rate" 
          elementName="Collection Rate" 
          elementCategory="Analytics Hub - Rent"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Collection Rate</p>
                  <p className="text-2xl font-medium">
                    {(stats?.collectionRate || 0).toFixed(1)}%
                  </p>
                  <Progress value={stats?.collectionRate || 0} className="h-2 mt-2" />
                </div>
                <div className="p-3 rounded-full bg-blue-500/10">
                  <CheckCircle className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </VisibilityGate>

        <VisibilityGate 
          elementKey="rent_overdue" 
          elementName="Overdue Rent" 
          elementCategory="Analytics Hub - Rent"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-medium text-red-500">
                    {formatCurrencyWhole(stats?.overdueAmount || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats?.overdueCount || 0} payments
                  </p>
                </div>
                <div className="p-3 rounded-full bg-red-500/10">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </VisibilityGate>

        <VisibilityGate 
          elementKey="rent_active_renters" 
          elementName="Active Renters" 
          elementCategory="Analytics Hub - Rent"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Renters</p>
                  <p className="text-2xl font-medium">{stats?.activeRenters || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrencyWhole(stats?.lateFees || 0)} in late fees
                  </p>
                </div>
                <div className="p-3 rounded-full bg-purple-500/10">
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </VisibilityGate>
      </div>

      {/* Revenue Chart */}
      <VisibilityGate 
        elementKey="rent_revenue_chart" 
        elementName="Rent Revenue Trend" 
        elementCategory="Analytics Hub - Rent"
      >
        <Card>
          <CardHeader>
            <CardTitle>Rent Revenue Trend</CardTitle>
            <CardDescription>Monthly collected vs expected rent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.chartData || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => formatCurrencyUtil(v, undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrencyUtil(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expected" 
                    stroke="hsl(var(--muted-foreground))" 
                    fill="hsl(var(--muted))" 
                    strokeWidth={2}
                    name="Expected"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="collected" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.3}
                    strokeWidth={2}
                    name="Collected"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </VisibilityGate>

      {/* YTD Summary */}
      <VisibilityGate 
        elementKey="rent_ytd_summary" 
        elementName="YTD Rent Summary" 
        elementCategory="Analytics Hub - Rent"
      >
        <Card>
          <CardHeader>
            <CardTitle>Year-to-Date Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Total Collected</p>
                <p className="text-3xl font-medium">{formatCurrencyWhole(stats?.totalCollected || 0)}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Total Expected</p>
                <p className="text-3xl font-medium">{formatCurrencyWhole(stats?.totalExpected || 0)}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Late Fees Collected</p>
                <p className="text-3xl font-medium">{formatCurrencyWhole(stats?.lateFees || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </VisibilityGate>
    </div>
  );
}
