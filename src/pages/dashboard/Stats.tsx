import { useState, useMemo } from 'react';
import { formatName } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePhorestPerformanceMetrics, usePhorestConnection, useUserPhorestMapping } from '@/hooks/usePhorestSync';
import { useUserSalesSummary } from '@/hooks/useSalesData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { 
  TrendingUp,
  Link2,
  Users,
  Download,
  MessageSquare,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useAddonMarginAnalytics } from '@/hooks/useAddonMarginAnalytics';
import { useRedoAnalytics } from '@/hooks/useRedoAnalytics';
import { TrendSparkline } from '@/components/dashboard/TrendSparkline';
import { useStylistAddonAttachment } from '@/hooks/useStylistAddonAttachment';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { VisibilityGate } from '@/components/visibility/VisibilityGate';
import { usePOSProviderLabel } from '@/hooks/usePOSProviderLabel';
import { PhorestSyncButton } from '@/components/dashboard/PhorestSyncButton';
import { PersonalGoalsCard } from '@/components/dashboard/sales/PersonalGoalsCard';
import { TierProgressAlert } from '@/components/dashboard/sales/TierProgressAlert';
import { SalesAchievements } from '@/components/dashboard/sales/SalesAchievements';
import { PerformanceTrendChart } from '@/components/dashboard/sales/PerformanceTrendChart';
import { ClientInsightsCard } from '@/components/dashboard/sales/ClientInsightsCard';
import { ServiceMixChart } from '@/components/dashboard/sales/ServiceMixChart';
import { StylistLocationRevenueChart } from '@/components/dashboard/sales/StylistLocationRevenueChart';
import { exportRedoCsv } from '@/lib/exportRedoCsv';
import { Button } from '@/components/ui/button';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { PageExplainer } from '@/components/ui/PageExplainer';

export default function Stats() {
  const { dashPath } = useOrgDashboardPath();
  const { user, roles } = useAuth();
  const [clientInsightsLocation, setClientInsightsLocation] = useState<string>('all');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const { formatCurrency, formatCurrencyWhole } = useFormatCurrency();
  const { effectiveOrganization } = useOrganizationContext();
  const { providerLabel } = usePOSProviderLabel();
  const orgId = effectiveOrganization?.id;
  const { data: marginData } = useAddonMarginAnalytics(orgId);
  const { data: redoData } = useRedoAnalytics(30);
  const { data: stylistAddonData } = useStylistAddonAttachment(orgId);

  // Check if user is admin/manager
  const isAdmin = roles.some(role => ['admin', 'super_admin', 'manager'].includes(role));

  // Fetch team members with stylist/stylist_assistant roles (only for admins)
  const { data: teamMembers } = useQuery({
    queryKey: ['stats-team-members'],
    queryFn: async () => {
      // Get users with stylist or stylist_assistant roles
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['stylist', 'stylist_assistant']);
      
      if (!userRoles?.length) return [];
      
      const userIds = [...new Set(userRoles.map(r => r.user_id))];
      
      const { data: profiles } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name, photo_url')
        .in('user_id', userIds)
        .eq('is_active', true)
        .order('full_name');
      
      return profiles || [];
    },
    enabled: isAdmin,
  });

  // Determine which user's stats to show
  const effectiveUserId = isAdmin && selectedMemberId ? selectedMemberId : user?.id;

  // Get the selected member's name for display
  const selectedMember = teamMembers?.find(m => m.user_id === selectedMemberId);

  // Date ranges for sales data
  const today = new Date();
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');

  // Phorest data - use effectiveUserId
  const { data: phorestConnection } = usePhorestConnection();
  const { data: phorestMetrics } = usePhorestPerformanceMetrics(weekStart);
  const { data: userPhorestMapping } = useUserPhorestMapping(effectiveUserId);

  // User sales data for goals and achievements - use effectiveUserId
  const { data: userWeeklySales } = useUserSalesSummary(effectiveUserId, weekStart, format(today, 'yyyy-MM-dd'));
  const { data: userMonthlySales } = useUserSalesSummary(effectiveUserId, monthStart, monthEnd);

  // Find selected user's Phorest metrics - use effectiveUserId
  const myPhorestMetrics = useMemo(() => {
    if (!phorestMetrics || !effectiveUserId) return null;
    return phorestMetrics.find((m: any) => m.user_id === effectiveUserId);
  }, [phorestMetrics, effectiveUserId]);
  
  // Check if user is linked to Phorest (has active mapping)
  const isLinkedToPhorest = !!userPhorestMapping;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <DashboardPageHeader
          title={isAdmin ? 'Team Stats' : 'My Stats'}
          description={isAdmin 
            ? 'View performance metrics for any team member.' 
            : 'Track your personal performance metrics.'}
          className="mb-8"
          actions={
            isAdmin && teamMembers && teamMembers.length > 0 ? (
              <Select 
                value={selectedMemberId || ''} 
                onValueChange={(value) => setSelectedMemberId(value || null)}
              >
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue placeholder="Select team member..." />
        <PageExplainer pageId="my-stats" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {formatName(member)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : undefined
          }
        />

        {/* Viewing indicator for admins */}
        {isAdmin && selectedMemberId && selectedMember && (
          <div className="mb-4 p-3 bg-primary/10 rounded-lg flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm">
              Viewing stats for <strong>{selectedMember.display_name || selectedMember.full_name}</strong>
            </span>
          </div>
        )}

        {/* Performance Content */}
        <div className="space-y-6">
            {myPhorestMetrics && (
              <Card className="p-6 bg-primary/5 border-primary/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-primary" />
                    <h2 className="font-display text-sm tracking-wide">{providerLabel.toUpperCase()} DATA - THIS WEEK</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <PhorestSyncButton syncType="reports" size="sm" />
                    <Badge variant="outline" className="text-primary border-primary">
                      <span className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse" />
                      Live
                    </Badge>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="text-center">
                    <p className="text-2xl font-display">{myPhorestMetrics.new_clients}</p>
                    <p className="text-xs text-muted-foreground">New Clients</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-display">{formatCurrencyWhole(Number(myPhorestMetrics.total_revenue))}</p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-display">{myPhorestMetrics.service_count}</p>
                    <p className="text-xs text-muted-foreground">Services</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-display">{Number(myPhorestMetrics.retention_rate).toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">Retention</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Show connection prompt if not linked to Phorest */}
            {!isLinkedToPhorest && phorestConnection?.connected && (
              <Card className="p-4 bg-muted/50 border-dashed">
                <p className="text-sm text-muted-foreground text-center">
                  Your account isn't linked to {providerLabel} yet. <Link to={dashPath('/admin/phorest')} className="text-primary underline">Set up staff mapping</Link> to see your stats automatically.
                </p>
              </Card>
            )}

            {/* Personal Goals & Progress Section */}
            {effectiveUserId && (
              <div className="grid gap-6 md:grid-cols-2">
                <PersonalGoalsCard 
                  userId={effectiveUserId}
                  currentMonthlyRevenue={userMonthlySales?.totalRevenue || 0}
                  currentWeeklyRevenue={userWeeklySales?.totalRevenue || 0}
                />
                <TierProgressAlert 
                  currentRevenue={userMonthlySales?.totalRevenue || 0}
                />
              </div>
            )}

            {/* Performance Visualizations */}
            {effectiveUserId && isLinkedToPhorest && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <PerformanceTrendChart userId={effectiveUserId} weeks={8} />
                </div>
                <ClientInsightsCard 
                  userId={effectiveUserId} 
                  locationId={clientInsightsLocation}
                  onLocationChange={setClientInsightsLocation}
                  showLocationFilter={true}
                />
              </div>
            )}

            {/* Location Revenue Comparison - for multi-branch stylists */}
            {effectiveUserId && isLinkedToPhorest && (
              <StylistLocationRevenueChart userId={effectiveUserId} months={3} />
            )}

            {/* Service Mix */}
            {effectiveUserId && isLinkedToPhorest && (
              <div className="grid gap-6 md:grid-cols-2">
                <ServiceMixChart userId={effectiveUserId} days={30} />
                <SalesAchievements
                  totalRevenue={userMonthlySales?.totalRevenue || 0}
                  serviceRevenue={userMonthlySales?.serviceRevenue || 0}
                  productRevenue={userMonthlySales?.productRevenue || 0}
                  totalTransactions={userMonthlySales?.totalTransactions || 0}
                />
              </div>
            )}

            {/* Fallback for non-Phorest users */}
            {effectiveUserId && !isLinkedToPhorest && (userMonthlySales?.totalRevenue || 0) > 0 && (
              <SalesAchievements
                totalRevenue={userMonthlySales?.totalRevenue || 0}
                serviceRevenue={userMonthlySales?.serviceRevenue || 0}
                productRevenue={userMonthlySales?.productRevenue || 0}
                totalTransactions={userMonthlySales?.totalTransactions || 0}
              />
            )}

            {/* Conversion Dashboard - Powered by Phorest */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h2 className="font-display text-sm tracking-wide">CONVERSION DASHBOARD</h2>
                </div>
                {isLinkedToPhorest && (
                  <Badge variant="outline" className="text-xs">
                    <Link2 className="w-3 h-3 mr-1" />
                    {providerLabel} Data
                  </Badge>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Rebooking Rate"
                  value={myPhorestMetrics?.rebooking_rate 
                    ? `${Number(myPhorestMetrics.rebooking_rate).toFixed(0)}%` 
                    : '0%'
                  }
                />
                <StatCard
                  label="Retention Rate"
                  value={myPhorestMetrics?.retention_rate 
                    ? `${Number(myPhorestMetrics.retention_rate).toFixed(0)}%` 
                    : '0%'
                  }
                />
                <StatCard
                  label="Avg Ticket Value"
                  value={myPhorestMetrics?.average_ticket 
                    ? formatCurrencyWhole(Number(myPhorestMetrics.average_ticket)) 
                    : (userWeeklySales?.averageTicket 
                      ? formatCurrencyWhole(userWeeklySales.averageTicket) 
                      : formatCurrencyWhole(0))
                  }
                />
                <StatCard
                  label="New Clients"
                  value={myPhorestMetrics?.new_clients?.toString() || '0'}
                />
              </div>
              {!isLinkedToPhorest && (
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Link your {providerLabel} account to see live conversion metrics
                </p>
              )}
            </Card>

            {/* Add-On Margins Card - admin/manager only */}
            {isAdmin && marginData && marginData.addonsWithCost > 0 && (
              <VisibilityGate
                elementKey="addon_margins_card"
                elementName="Add-On Margins"
                elementCategory="Stats"
              >
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <h2 className="font-display text-sm tracking-wide">ADD-ON MARGINS</h2>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {marginData.addonsWithCost} of {marginData.totalAddons} with cost data
                    </Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                      label="Avg Margin"
                      value={`${marginData.avgMarginPct.toFixed(0)}%`}
                    />
                    {marginData.topMargin.map((addon, i) => (
                      <StatCard
                        key={addon.name}
                        label={i === 0 ? 'Highest Margin' : `#${i + 1} Margin`}
                        value={`${addon.marginPct.toFixed(0)}%`}
                      />
                    ))}
                  </div>

                  {marginData.lowMargin.length > 0 && marginData.lowMargin[0].name !== marginData.topMargin[0]?.name && (
                    <p className="text-xs text-muted-foreground mt-4 text-center">
                      Lowest margin: <strong>{marginData.lowMargin[0].name}</strong> at {marginData.lowMargin[0].marginPct.toFixed(0)}% ({formatCurrency(marginData.lowMargin[0].price)} price, {formatCurrency(marginData.lowMargin[0].cost)} cost)
                    </p>
                  )}
                </Card>
              </VisibilityGate>
            )}

            {/* Redo & Adjustment Insights */}
            {isAdmin && redoData && (redoData.totalRedos > 0 || true) && (
              <VisibilityGate
                elementKey="redo_adjustment_insights_card"
                elementName="Redo & Adjustment Insights"
                elementCategory="Stats"
              >
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <h2 className="font-display text-sm tracking-wide">REDO & ADJUSTMENT INSIGHTS</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {redoData.totalRedos > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1.5"
                          onClick={() => exportRedoCsv(redoData, formatCurrencyWhole)}
                        >
                          <Download className="w-3.5 h-3.5" />
                          Export CSV
                        </Button>
                      )}
                      <Badge variant="outline" className="text-xs">Last 30 days</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-4 mb-6">
                    <div className="text-center">
                      <p className="text-2xl font-display tabular-nums">{redoData.totalRedos}</p>
                      <p className="text-xs text-muted-foreground">Redos</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <p className="text-2xl font-display tabular-nums">{redoData.redoRate.toFixed(1)}%</p>
                        {redoData.weeklyTrend.length >= 2 && (
                          <TrendSparkline data={redoData.weeklyTrend} width={60} height={20} />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Redo Rate</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-display tabular-nums">{formatCurrencyWhole(redoData.financialImpact)}</p>
                      <p className="text-xs text-muted-foreground">Revenue Impact</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-display tabular-nums">{redoData.repeatRedoClients}</p>
                      <p className="text-xs text-muted-foreground">Repeat Clients</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-display tabular-nums text-destructive">{formatCurrencyWhole(redoData.commissionImpact)}</p>
                      <p className="text-xs text-muted-foreground">Commission Impact</p>
                    </div>
                  </div>

                  {redoData.byStylist.length > 0 && (
                    <>
                      <h3 className="text-xs font-display tracking-wide text-muted-foreground mb-2">BY STYLIST</h3>
                      <div className="space-y-2 mb-4">
                        {redoData.byStylist.slice(0, 5).map(s => (
                          <div key={s.staffUserId} className="flex items-center justify-between text-sm">
                            <span className="font-medium">{s.staffName}</span>
                            <div className="flex items-center gap-3">
                              <span className="tabular-nums">{s.redoCount} redos</span>
                              <Badge variant={s.redoRate > 5 ? "destructive" : "secondary"} className="text-[10px] tabular-nums">
                                {s.redoRate.toFixed(1)}%
                              </Badge>
                              {s.redoRate > 5 && (
                                <Link
                                  to={`/dashboard/meetings/schedule?staffId=${s.staffUserId}&topic=redo-review`}
                                  className="text-primary hover:text-primary/80 transition-colors"
                                  title="Schedule coaching conversation"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </Link>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {redoData.byReason.length > 0 && (
                    <>
                      <h3 className="text-xs font-display tracking-wide text-muted-foreground mb-2">BY REASON</h3>
                      <div className="space-y-1.5">
                        {redoData.byReason.map(r => (
                          <div key={r.reason} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{r.reason}</span>
                            <span className="tabular-nums font-medium">{r.count}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {redoData.totalRedos === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No redos recorded in the last 30 days.
                    </p>
                  )}
                </Card>
              </VisibilityGate>
            )}
            {/* Stylist Add-On Performance Card - admin/manager only */}
            {isAdmin && stylistAddonData && stylistAddonData.length > 0 && (
              <VisibilityGate
                elementKey="stylist_addon_performance_card"
                elementName="Stylist Add-On & Extras Performance"
                elementCategory="Stats"
              >
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <h2 className="font-display text-sm tracking-wide">STYLIST ADD-ON & EXTRAS PERFORMANCE</h2>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Last 30 days
                    </Badge>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 pr-4 text-xs font-display tracking-wide text-muted-foreground">STYLIST</th>
                          <th className="text-right py-2 px-4 text-xs font-display tracking-wide text-muted-foreground">ADD-ONS</th>
                          <th className="text-right py-2 px-4 text-xs font-display tracking-wide text-muted-foreground">AVG MARGIN</th>
                          <th className="text-right py-2 pl-4 text-xs font-display tracking-wide text-muted-foreground">HIGH / LOW</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stylistAddonData.map((stylist) => (
                          <tr key={stylist.staffUserId} className="border-b border-border/50 last:border-0">
                            <td className="py-2.5 pr-4 font-medium">{stylist.displayName}</td>
                            <td className="py-2.5 px-4 text-right tabular-nums">{stylist.totalAddons}</td>
                            <td className="py-2.5 px-4 text-right tabular-nums">
                              <span className={stylist.avgMarginPct >= 50 ? 'text-green-600' : stylist.avgMarginPct < 30 ? 'text-red-500' : ''}>
                                {stylist.avgMarginPct > 0 ? `${stylist.avgMarginPct.toFixed(0)}%` : '—'}
                              </span>
                            </td>
                            <td className="py-2.5 pl-4 text-right tabular-nums">
                              <span className="text-green-600">{stylist.highMarginCount}</span>
                              {' / '}
                              <span className="text-red-500">{stylist.lowMarginCount}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    High = margin ≥ 50% · Low = margin &lt; 30%
                  </p>
                </Card>
              </VisibilityGate>
            )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-xs text-muted-foreground font-display tracking-wide mb-2">
        {label}
      </p>
      <p className="font-display text-2xl">{value}</p>
    </Card>
  );
}
