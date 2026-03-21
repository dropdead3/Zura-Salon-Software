import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Users, Percent, Gift } from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useLoyaltyAnalytics, useTierDistribution, usePromotionPerformance } from '@/hooks/useLoyaltyAnalytics';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useFormatNumber } from '@/hooks/useFormatNumber';

interface PromoAnalyticsSummaryProps {
  organizationId?: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export function PromoAnalyticsSummary({ organizationId }: PromoAnalyticsSummaryProps) {
  const { formatDate } = useFormatDate();
  const { formatNumber } = useFormatNumber();
  const { formatCurrency } = useFormatCurrency();
  const { data: loyaltyStats, isLoading: loadingLoyalty } = useLoyaltyAnalytics(organizationId, 30);
  const { data: tierDistribution, isLoading: loadingTiers } = useTierDistribution(organizationId);
  const { data: promoPerformance, isLoading: loadingPromo } = usePromotionPerformance(organizationId, 30);

  const isLoading = loadingLoyalty || loadingTiers || loadingPromo;

  if (!organizationId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Select an organization to view analytics
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Prepare chart data
  const pointsChartData = loyaltyStats?.dailyTrend.map(day => ({
    date: formatDate(new Date(day.analytics_date), 'MMM d'),
    earned: day.points_earned,
    redeemed: day.points_redeemed,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Loyalty KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Points Earned</p>
                <p className="text-2xl font-medium">{formatNumber(loyaltyStats?.totalPointsEarned ?? 0)}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Points Redeemed</p>
                <p className="text-2xl font-medium">{formatNumber(loyaltyStats?.totalPointsRedeemed ?? 0)}</p>
              </div>
              <div className="p-3 bg-chart-2/10 rounded-full">
                <Gift className="h-5 w-5 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Members</p>
                <p className="text-2xl font-medium">{loyaltyStats?.activeMembersCount || 0}</p>
              </div>
              <div className="p-3 bg-chart-3/10 rounded-full">
                <Users className="h-5 w-5 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Points Liability</p>
                <p className="text-2xl font-medium">{formatCurrency(loyaltyStats?.pointsLiability ?? 0)}</p>
              </div>
              <div className="p-3 bg-destructive/10 rounded-full">
                <DollarSign className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Points Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Points Activity (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {pointsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={pointsChartData}>
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="earned" 
                    stroke="hsl(var(--primary))" 
                    name="Earned"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="redeemed" 
                    stroke="hsl(var(--chart-2))" 
                    name="Redeemed"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No points activity data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tier Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tier Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {tierDistribution && tierDistribution.length > 0 ? (
              <div className="flex items-center gap-8">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={tierDistribution}
                      dataKey="count"
                      nameKey="tier"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ tier, percentage }) => `${percentage}%`}
                    >
                      {tierDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {tierDistribution.map((tier, index) => (
                    <div key={tier.tier} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm">{tier.tier}</span>
                      <Badge variant="outline" className="ml-auto">
                        {tier.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No tier data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Promotion Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Promotion Performance (30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {promoPerformance && promoPerformance.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Promotion</TableHead>
                  <TableHead className="text-right">Uses</TableHead>
                  <TableHead className="text-right">Original Revenue</TableHead>
                  <TableHead className="text-right">Discount Given</TableHead>
                  <TableHead className="text-right">Net Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoPerformance.map((promo: any) => (
                  <TableRow key={promo.promotionId}>
                    <TableCell>
                      <div className="font-medium">{promo.promotionName}</div>
                      <Badge variant="outline" className="mt-1">
                        {promo.promotionType?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{promo.uses}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(promo.totalOriginal)}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      -{formatCurrency(promo.totalDiscount)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(promo.totalFinal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No promotion redemptions in the last 30 days
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
