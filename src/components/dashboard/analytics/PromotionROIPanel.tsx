import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays } from 'date-fns';
import { TrendingUp, Percent, DollarSign, Users, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { formatCurrency as formatCurrencyUtil } from '@/lib/formatCurrency';

interface PromotionROIPanelProps {
  organizationId: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2'))', 'hsl(var(--chart-3'))', 'hsl(var(--chart-4'))', 'hsl(var(--chart-5'))'];

export function PromotionROIPanel({ organizationId }: PromotionROIPanelProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['promotion-roi-stats', organizationId],
    queryFn: async () => {
      // Get promotions with redemption data
      const { data: promotions } = await supabase
        .from('promotions' as any)
        .select('id, name, promotion_type, discount_value, current_usage_count, is_active')
        .eq('organization_id', organizationId);

      // Get redemption details
      const { data: redemptions } = await supabase
        .from('promotion_redemptions' as any)
        .select('promotion_id, discount_applied, revenue_attributed, redeemed_at, original_amount')
        .eq('organization_id', organizationId);

      // Calculate per-promotion stats
      const promoStats = ((promotions || []) as any[]).map((promo: any) => {
        const promoRedemptions = ((redemptions || []) as any[]).filter(
          (r: any) => r.promotion_id === promo.id
        );
        
        const totalDiscounts = promoRedemptions.reduce(
          (sum: number, r: any) => sum + (r.discount_applied || 0), 0
        );
        const totalRevenue = promoRedemptions.reduce(
          (sum: number, r: any) => sum + (r.revenue_attributed || 0), 0
        );
        const totalOriginal = promoRedemptions.reduce(
          (sum: number, r: any) => sum + (r.original_amount || 0), 0
        );

        return {
          id: promo.id,
          name: promo.name,
          promotion_type: promo.promotion_type,
          discount_value: promo.discount_value,
          redemptions: promoRedemptions.length,
          total_discounts: totalDiscounts,
          total_revenue: totalRevenue,
          original_revenue: totalOriginal,
          roi: totalDiscounts > 0 ? ((totalRevenue - totalDiscounts) / totalDiscounts) * 100 : 0,
          is_active: promo.is_active,
        };
      }).sort((a, b) => b.total_revenue - a.total_revenue);

      // Overall stats
      const totalRedemptions = ((redemptions || []) as any[]).length;
      const totalDiscounts = ((redemptions || []) as any[]).reduce(
        (sum: number, r: any) => sum + (r.discount_applied || 0), 0
      );
      const totalRevenue = ((redemptions || []) as any[]).reduce(
        (sum: number, r: any) => sum + (r.revenue_attributed || 0), 0
      );
      const avgRedemptionValue = totalRedemptions > 0 ? totalRevenue / totalRedemptions : 0;

      // Chart data - top 5 by revenue
      const chartData = promoStats.slice(0, 5).map(p => ({
        name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
        revenue: p.total_revenue,
        discounts: p.total_discounts,
      }));

      // Pie chart - redemptions by type
      const typeBreakdown = new Map<string, number>();
      promoStats.forEach(p => {
        const type = p.promotion_type || 'other';
        typeBreakdown.set(type, (typeBreakdown.get(type) || 0) + p.redemptions);
      });

      const pieData = Array.from(typeBreakdown.entries()).map(([name, value]) => ({
        name: name.replace('_', ' '),
        value,
      }));

      return {
        totalRedemptions,
        totalDiscounts,
        totalRevenue,
        avgRedemptionValue,
        overallROI: totalDiscounts > 0 ? ((totalRevenue - totalDiscounts) / totalDiscounts) * 100 : 0,
        promotions: promoStats,
        chartData,
        pieData,
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
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Redemptions</p>
                <p className="text-2xl font-medium">{stats?.totalRedemptions || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue Generated</p>
                <p className="text-2xl font-medium">{formatCurrencyWhole(stats?.totalRevenue || 0)}</p>
              </div>
              <div className="p-3 rounded-full bg-success/10">
                <DollarSign className="h-5 w-5 text-success-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Discounts Given</p>
                <p className="text-2xl font-medium">{formatCurrencyWhole(stats?.totalDiscounts || 0)}</p>
              </div>
              <div className="p-3 rounded-full bg-warning/10">
                <Percent className="h-5 w-5 text-warning-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall ROI</p>
                <p className={`text-2xl font-medium ${(stats?.overallROI || 0) > 0 ? 'text-success-foreground' : 'text-destructive'}`}>
                  {(stats?.overallROI || 0).toFixed(0)}%
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Promotion Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Promotions by Revenue</CardTitle>
            <CardDescription>Revenue vs discounts for top 5 promotions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.chartData || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(v) => formatCurrencyUtil(v, undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })} className="text-xs" />
                  <YAxis type="category" dataKey="name" className="text-xs" width={100} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrencyUtil(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" />
                  <Bar dataKey="discounts" fill="hsl(var(--muted-foreground))" name="Discounts" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Redemptions by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Redemptions by Type</CardTitle>
            <CardDescription>Distribution of promotion types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.pieData || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={0}
                    stroke="hsl(var(--border) / 0.4)"
                    strokeWidth={1}
                    dataKey="value"
                  >
                    {(stats?.pieData || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {(stats?.pieData || []).map((entry, index) => (
                  <Badge key={entry.name} variant="outline" className="capitalize">
                    <span 
                      className="w-2 h-2 rounded-full mr-1.5" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    {entry.name}: {entry.value}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Promotions Performance</CardTitle>
          <CardDescription>Detailed breakdown by promotion</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Promotion</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Redemptions</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Discounts</TableHead>
                <TableHead className="text-right">ROI</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(stats?.promotions || []).slice(0, 10).map((promo) => (
                <TableRow key={promo.id}>
                  <TableCell className="font-medium">{promo.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {promo.promotion_type?.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{promo.redemptions}</TableCell>
                  <TableCell className="text-right">{formatCurrencyWhole(promo.total_revenue)}</TableCell>
                  <TableCell className="text-right">{formatCurrencyWhole(promo.total_discounts)}</TableCell>
                  <TableCell className={`text-right font-medium ${promo.roi > 0 ? 'text-success-foreground' : 'text-destructive'}`}>
                    {promo.roi.toFixed(0)}%
                  </TableCell>
                  <TableCell>
                    <Badge variant={promo.is_active ? 'default' : 'secondary'}>
                      {promo.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
