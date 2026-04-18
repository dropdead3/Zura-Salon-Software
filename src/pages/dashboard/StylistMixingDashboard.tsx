import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { Beaker, Loader2, FlaskConical, TrendingUp, AlertTriangle, BarChart3, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { TrendSparkline } from '@/components/dashboard/TrendSparkline';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDateShort, formatRelativeTime } from '@/lib/format';
import { useAuth } from '@/contexts/AuthContext';
import { useStylistMixingDashboard } from '@/hooks/color-bar/useStylistMixingDashboard';
import { useColorBarEntitlement } from '@/hooks/color-bar/useColorBarEntitlement';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';

// ─── Status badge helper ────────────────────────────────────────────────────

const SESSION_STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'Pending', variant: 'outline' },
  in_progress: { label: 'In Progress', variant: 'default' },
  completed: { label: 'Completed', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

const CHARGE_STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'Pending', variant: 'outline' },
  approved: { label: 'Approved', variant: 'default' },
  waived: { label: 'Waived', variant: 'secondary' },
};

export default function StylistMixingDashboard() {
  const { user } = useAuth();
  const userId = user?.id;
  const { dashPath } = useOrgDashboardPath();
  const { isEntitled, isLoading: entitlementLoading } = useColorBarEntitlement();
  const { todaySessions, performance, productTrends, topFormulas, overageHistory, isLoading } = useStylistMixingDashboard(userId);

  // Gate: redirect if org doesn't have Color Bar enabled
  if (!entitlementLoading && !isEntitled) {
    return <Navigate to={dashPath('/')} replace />;
  }

  if (entitlementLoading) {
    return <DashboardLoader fullPage />;
  }

  // Derive performance stats
  const perfData = performance.data?.[0];
  const stats = useMemo(() => {
    if (!perfData) return null;
    return {
      totalSessions: perfData.mix_session_count,
      wasteRate: (perfData.waste_rate * 100).toFixed(1),
      reweighCompliance: (perfData.reweigh_compliance_rate * 100).toFixed(0),
      avgVariance: (perfData.avg_usage_variance * 100).toFixed(1),
    };
  }, [perfData]);

  if (isLoading) {
    return (
      <div className={tokens.layout.pageContainer}>
        <DashboardPageHeader title="My Mixing" />
        <DashboardLoader fullPage />
      </div>
    );
  }

  return (
    <div className={tokens.layout.pageContainer}>
      <DashboardPageHeader
        title="My Mixing"
        description="Your color bar mixing activity, formulas, and performance"
      />

      {/* ─── Performance Snapshot ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="Sessions (30d)"
          value={stats?.totalSessions?.toString() ?? '—'}
          icon={<FlaskConical className="w-4 h-4 text-primary" />}
        />
        <StatTile
          label="Waste Rate"
          value={stats ? `${stats.wasteRate}%` : '—'}
          icon={<AlertTriangle className="w-4 h-4 text-primary" />}
          variant={stats && parseFloat(stats.wasteRate) > 10 ? 'warning' : 'default'}
        />
        <StatTile
          label="Reweigh Rate"
          value={stats ? `${stats.reweighCompliance}%` : '—'}
          icon={<BarChart3 className="w-4 h-4 text-primary" />}
          variant={stats && parseInt(stats.reweighCompliance) < 80 ? 'warning' : 'default'}
        />
        <StatTile
          label="Avg Variance"
          value={stats ? `${stats.avgVariance}%` : '—'}
          icon={<TrendingUp className="w-4 h-4 text-primary" />}
        />
      </div>

      {/* ─── Today's Formulas ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Beaker className={tokens.card.icon} />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Today's Formulas</CardTitle>
            <CardDescription className={tokens.body.muted}>Mix sessions from today</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {!todaySessions.data?.length ? (
            <div className={tokens.empty.container}>
              <Beaker className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No sessions today</h3>
              <p className={tokens.empty.description}>Your mix sessions will appear here as you work</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaySessions.data.map((session) => {
                const statusConfig = SESSION_STATUS_MAP[session.status] ?? SESSION_STATUS_MAP.pending;
                return (
                  <div
                    key={session.id}
                    className={cn(tokens.card.inner, 'p-4 flex items-center justify-between')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                        <FlaskConical className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className={tokens.body.emphasis}>
                          {session.bowl_count} bowl{session.bowl_count !== 1 ? 's' : ''}
                        </p>
                        <p className={cn(tokens.body.muted, 'text-xs')}>
                          {formatRelativeTime(session.started_at)}
                          {session.is_manual_override && ' · Manual override'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.confidence_score != null && (
                        <span className={cn(tokens.label.tiny)}>
                          {Math.round(session.confidence_score * 100)}% conf
                        </span>
                      )}
                      <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Two-column: Product Trends + Top Formulas ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Usage Trends */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className={tokens.card.iconBox}>
              <BarChart3 className={tokens.card.icon} />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Product Usage</CardTitle>
              <CardDescription className={tokens.body.muted}>Top 8 products by weight (30d)</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {!productTrends.data?.length ? (
              <div className={tokens.empty.container}>
                <BarChart3 className={tokens.empty.icon} />
                <h3 className={tokens.empty.heading}>No usage data yet</h3>
                <p className={tokens.empty.description}>Complete mix sessions to see trends</p>
              </div>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={productTrends.data}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="product_name"
                      width={120}
                      tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`${value}g`, 'Dispensed']}
                    />
                    <Bar
                      dataKey="total_dispensed"
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                      barSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most-Used Formulas */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className={tokens.card.iconBox}>
              <FlaskConical className={tokens.card.icon} />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Most-Used Formulas</CardTitle>
              <CardDescription className={tokens.body.muted}>Your top formula combinations</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {!topFormulas.data?.length ? (
              <div className={tokens.empty.container}>
                <FlaskConical className={tokens.empty.icon} />
                <h3 className={tokens.empty.heading}>No formulas yet</h3>
                <p className={tokens.empty.description}>Saved formulas will appear here</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={tokens.table.columnHeader}>Formula</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Uses</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Clients</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Last Used</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topFormulas.data.map((formula) => (
                    <TableRow key={formula.formula_key}>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {formula.components.slice(0, 3).map((c, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                              {c}
                            </Badge>
                          ))}
                          {formula.components.length > 3 && (
                            <Badge variant="outline" className="text-[10px]">
                              +{formula.components.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formula.use_count}</TableCell>
                      <TableCell className="text-right">
                        <span className="flex items-center justify-end gap-1">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          {formula.client_count}
                        </span>
                      </TableCell>
                      <TableCell className={cn('text-right', tokens.body.muted)}>
                        {formatDateShort(formula.last_used)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Overage History ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className={tokens.card.iconBox}>
            <AlertTriangle className={tokens.card.icon} />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Overage History</CardTitle>
            <CardDescription className={tokens.body.muted}>Recent overage charges from your sessions</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {!overageHistory.data?.length ? (
            <div className={tokens.empty.container}>
              <AlertTriangle className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No overages</h3>
              <p className={tokens.empty.description}>Great work — no overage charges found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={tokens.table.columnHeader}>Date</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Service</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Included</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Actual</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Overage</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Charge</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overageHistory.data.map((charge) => {
                  const statusConfig = CHARGE_STATUS_MAP[charge.status] ?? CHARGE_STATUS_MAP.pending;
                  return (
                    <TableRow key={charge.id}>
                      <TableCell className={tokens.body.muted}>{formatDateShort(charge.created_at)}</TableCell>
                      <TableCell className={tokens.body.emphasis}>{charge.service_name ?? '—'}</TableCell>
                      <TableCell className="text-right">{charge.included_allowance_qty}g</TableCell>
                      <TableCell className="text-right">{charge.actual_usage_qty}g</TableCell>
                      <TableCell className="text-right text-destructive">+{charge.overage_qty}g</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(charge.charge_amount)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── StatTile sub-component ─────────────────────────────────────────────────

function StatTile({
  label,
  value,
  icon,
  variant = 'default',
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  variant?: 'default' | 'warning';
}) {
  return (
    <div className={cn(tokens.kpi.tile, 'relative')}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className={tokens.kpi.label}>{label}</span>
      </div>
      <span
        className={cn(
          tokens.kpi.value,
          variant === 'warning' && 'text-destructive'
        )}
      >
        {value}
      </span>
    </div>
  );
}
