import React, { useState, useEffect, useMemo } from 'react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useBackroomDashboard } from '@/hooks/backroom/useBackroomDashboard';
import { useBackroomSetting } from '@/hooks/backroom/useBackroomSettings';
import { useBackroomSetupHealth } from '@/hooks/backroom/useBackroomSetupHealth';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useActiveLocations } from '@/hooks/useLocations';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2, AlertTriangle, ChevronDown, ChevronRight, Check,
  FlaskConical, Trash2, ClipboardCheck, AlertCircle, Wallet, DollarSign,
  ClipboardList, FileText, Eye, Download, PackageOpen, TrendingUp, TrendingDown,
  Users2, Package, ShieldAlert, Truck, BarChart3, Brain, MapPin,
} from 'lucide-react';
import { ZuraZIcon } from '@/components/icons/ZuraZIcon';
import { BackroomSetupWizard } from './BackroomSetupWizard';
import { BackroomInsightsSection } from './BackroomInsightsSection';
import { SupplyIntelligenceDashboard } from '@/components/dashboard/backroom/supply-intelligence/SupplyIntelligenceDashboard';
import { formatRelativeTime } from '@/lib/format';
import type { ControlTowerAlert } from '@/lib/backroom/control-tower-engine';

interface Props {
  onNavigate: (section: string) => void;
  initialSubTab?: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  medium: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  informational: 'bg-muted text-muted-foreground',
};

type DatePreset = '7d' | '30d' | 'this_month' | 'last_month' | '90d';

function getDateRange(preset: DatePreset): { start: string; end: string; label: string } {
  const today = new Date();
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  switch (preset) {
    case '7d': return { start: fmt(subDays(today, 6)), end: fmt(today), label: 'Last 7 Days' };
    case '30d': return { start: fmt(subDays(today, 29)), end: fmt(today), label: 'Last 30 Days' };
    case 'this_month': return { start: fmt(startOfMonth(today)), end: fmt(today), label: 'This Month' };
    case 'last_month': { const lm = subMonths(today, 1); return { start: fmt(startOfMonth(lm)), end: fmt(endOfMonth(lm)), label: 'Last Month' }; }
    case '90d': return { start: fmt(subDays(today, 89)), end: fmt(today), label: 'Last 90 Days' };
  }
}

export function BackroomDashboardOverview({ onNavigate, initialSubTab }: Props) {
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [selectedLocationId, setSelectedLocationId] = useState('all');
  const { data: activeLocations = [] } = useActiveLocations();

  const { start, end, label: rangeLabel } = useMemo(() => getDateRange(datePreset), [datePreset]);
  const effectiveLocationId = selectedLocationId === 'all' ? undefined : selectedLocationId;

  const dashboard = useBackroomDashboard(effectiveLocationId, start, end);
  const { formatCurrency } = useFormatCurrency();
  const { data: wizardSetting } = useBackroomSetting('setup_wizard_completed');
  const [showWizard, setShowWizard] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab || 'command-center');
  const wizardCompleted = !!(wizardSetting?.value as Record<string, unknown>)?.completed;

  useEffect(() => {
    if (initialSubTab) setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  if (dashboard.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  if (showWizard) {
    return (
      <BackroomSetupWizard
        onComplete={() => setShowWizard(false)}
        onCancel={() => setShowWizard(false)}
      />
    );
  }

  const { kpis, alerts, staffSummary, inventoryHealth, setupHealth, reorderData, lastUpdatedAt, supplyCostRecovery, supplyCostRecoveryEnabled } = dashboard;
  const showSetupBanner = setupHealth && !setupHealth.isComplete;

  return (
    <div className="space-y-6">
      {/* ── Setup Banner (collapsible) ── */}
      {showSetupBanner && (
        <Collapsible open={setupOpen} onOpenChange={setSetupOpen}>
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="py-4" style={{ containerType: 'inline-size' }}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                    <ZuraZIcon className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="flex items-baseline gap-1.5">
                      <span className="font-display text-sm text-amber-400 tracking-wide">
                        {setupHealth.completed} OF {setupHealth.total}
                      </span>
                      <span className="font-sans text-xs text-muted-foreground">
                        areas configured
                      </span>
                    </p>
                    {/* Step tracker — unified column layout */}
                    <div className="mt-2 w-full px-4">
                      <div className="flex items-start w-full">
                        {setupHealth.steps.map((step, i, arr) => (
                          <React.Fragment key={step.label}>
                            <div className="flex flex-col items-center shrink-0">
                              <div className={cn(
                                'w-5 h-5 rounded-full flex items-center justify-center transition-colors',
                                step.done
                                  ? 'bg-amber-500 text-amber-950'
                                  : 'border border-amber-500/40 bg-transparent'
                              )}>
                                {step.done && <Check className="w-3 h-3" />}
                              </div>
                              <span className="hidden @[600px]:block text-[10px] text-center font-sans text-muted-foreground whitespace-nowrap mt-1">
                                {step.label}
                              </span>
                            </div>
                            {i < arr.length - 1 && (
                              <div className={cn('flex-1 h-px mx-1 mt-2.5', step.done ? 'bg-amber-500/60' : 'bg-border/60')} />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                  {!wizardCompleted && (
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); setShowWizard(true); }} className="shrink-0 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:border-amber-500/70">
                      Resume Setup
                    </Button>
                  )}
                  {setupOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 pt-3 border-t border-border/40">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {setupHealth.warnings.slice(0, 3).map((w) => (
                    <button key={w.id} onClick={() => onNavigate(w.section)} className="text-left p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <p className="text-xs font-sans text-foreground">{w.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{w.description}</p>
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </CardContent>
          </Card>
        </Collapsible>
      )}

      {/* ── Location & Time Filters ── */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {activeLocations.length > 1 && (
          <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
            <SelectTrigger className="w-fit gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {activeLocations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
        
      </div>

      {/* ── Sub-tabs ── */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="command-center" className="gap-1.5">
            <ShieldAlert className="w-4 h-4" /> Command Center
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="w-4 h-4" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5">
            <Brain className="w-4 h-4" /> AI Intelligence
          </TabsTrigger>
        </TabsList>

        {/* ── Command Center ── */}
        <TabsContent value="command-center" className="space-y-6 mt-6">
          {/* ── KPI Strip ── */}
          <div className={cn('grid gap-3', supplyCostRecoveryEnabled ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5')}>
            <KpiTile
              icon={FlaskConical}
              label="Chemical Cost/Svc"
              value={formatCurrency(kpis.chemicalCostPerService)}
            />
            <KpiTile
              icon={Trash2}
              label="Waste Rate"
              value={`${kpis.wasteRate.toFixed(1)}%`}
              status={kpis.wasteRate > 5 ? 'warning' : kpis.wasteRate > 0 ? 'ok' : 'neutral'}
            />
            <KpiTile
              icon={ClipboardCheck}
              label="Reweigh Rate"
              value={`${kpis.reweighCompliance.toFixed(0)}%`}
              status={kpis.reweighCompliance < 80 ? 'warning' : 'ok'}
            />
            <KpiTile
              icon={AlertCircle}
              label="Stockout Alerts"
              value={String(kpis.stockoutAlertCount)}
              status={kpis.stockoutAlertCount > 0 ? 'warning' : 'ok'}
            />
            <BudgetKpiTile
              budgetPct={kpis.budgetPct}
              currentSpend={kpis.currentMonthSpend}
              monthlyBudget={kpis.monthlyBudget}
              threshold={kpis.alertThreshold}
              formatCurrency={formatCurrency}
              onNavigate={onNavigate}
            />
            {supplyCostRecoveryEnabled && supplyCostRecovery && (
              <KpiTile
                icon={DollarSign}
                label="Supply Recovery"
                value={`${supplyCostRecovery.recoveryRate}%`}
                status={supplyCostRecovery.recoveryRate >= 80 ? 'ok' : supplyCostRecovery.recoveryRate > 0 ? 'warning' : 'neutral'}
                subtitle={`${formatCurrency(supplyCostRecovery.totalRecouped)} recouped · ${formatCurrency(supplyCostRecovery.totalWaived)} waived`}
              />
            )}
          </div>
          {/* Two-Column: Control Tower + Procurement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Control Tower Alerts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={tokens.card.iconBox}>
                    <ShieldAlert className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className={tokens.card.title}>Control Tower</CardTitle>
                    <CardDescription>
                      {lastUpdatedAt ? `Updated ${formatRelativeTime(lastUpdatedAt)}` : 'Priority alerts requiring attention'}
                    </CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('alerts')} className="font-sans text-xs text-muted-foreground">
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <div className="py-6 text-center">
                    <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className={tokens.body.muted}>No active alerts — all clear.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alerts.slice(0, 5).map((alert) => (
                      <AlertRow key={alert.id} alert={alert} onNavigate={onNavigate} onSwitchTab={setActiveSubTab} />
                    ))}
                    {alerts.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center pt-1">
                        +{alerts.length - 5} more alerts
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Procurement Snapshot */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={tokens.card.iconBox}>
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className={tokens.card.title}>Procurement</CardTitle>
                    <CardDescription>Budget tracking & projections</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('inventory')} className="font-sans text-xs text-muted-foreground">
                  View Analytics
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {kpis.monthlyBudget > 0 ? (
                  <>
                    <div>
                      <div className="flex justify-between text-xs font-sans mb-1">
                        <span className="text-muted-foreground">Month-to-Date</span>
                        <span className="text-foreground">{formatCurrency(kpis.currentMonthSpend)} / {formatCurrency(kpis.monthlyBudget)}</span>
                      </div>
                      <Progress
                        value={Math.min((kpis.currentMonthSpend / kpis.monthlyBudget) * 100, 100)}
                        className="h-2"
                        indicatorClassName={
                          kpis.budgetPct !== null && kpis.budgetPct > 100 ? 'bg-destructive' :
                          kpis.budgetPct !== null && kpis.budgetPct > kpis.alertThreshold ? 'bg-amber-500' :
                          'bg-primary'
                        }
                      />
                    </div>
                    {reorderData?.projectedNextMonth != null && reorderData.projectedNextMonth > 0 && (
                      <div className="flex items-center gap-2 text-xs font-sans">
                        <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Next month projection:</span>
                        <span className="text-foreground font-medium">{formatCurrency(reorderData.projectedNextMonth)}</span>
                        {reorderData.projectedNextMonth > kpis.monthlyBudget && (
                          <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">Over Budget</Badge>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-4 text-center">
                    <p className={tokens.body.muted}>No budget target set.</p>
                    <Button variant="outline" size="sm" onClick={() => onNavigate('inventory:reorder')} className="mt-2 font-sans">
                      Set Budget
                    </Button>
                  </div>
                )}
                {reorderData && reorderData.trendPct !== 0 && (
                  <div className="flex items-center gap-1.5 text-xs font-sans text-muted-foreground">
                    {reorderData.trendPct > 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-primary" />
                    )}
                    <span>{Math.abs(reorderData.trendPct).toFixed(1)}% {reorderData.trendPct > 0 ? 'increase' : 'decrease'} month-over-month</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Two-Column: Staff + Inventory */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Staff Performance */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={tokens.card.iconBox}>
                    <Users2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className={tokens.card.title}>Staff Performance</CardTitle>
                    <CardDescription>Last 30 days — by waste rate</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveSubTab('analytics')} className="font-sans text-xs text-muted-foreground">
                  Full Report
                </Button>
              </CardHeader>
              <CardContent>
                {staffSummary.top.length === 0 ? (
                  <div className="py-6 text-center">
                    <Users2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className={tokens.body.muted}>No staff data available yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {staffSummary.top.length > 0 && (
                      <div>
                        <p className={cn(tokens.label.tiny, 'mb-2')}>Top Performers</p>
                        {staffSummary.top.map((s) => (
                          <StaffRow key={s.staffUserId} name={s.staffName ?? s.staffUserId} wasteRate={s.wastePct} sessions={s.sessionsPerDay} reweighPct={s.reweighCompliancePct} />
                        ))}
                      </div>
                    )}
                    {staffSummary.bottom.length > 0 && (
                      <div>
                        <p className={cn(tokens.label.tiny, 'mb-2')}>Needs Attention</p>
                        {staffSummary.bottom.map((s) => (
                          <StaffRow key={s.staffUserId} name={s.staffName ?? s.staffUserId} wasteRate={s.wastePct} sessions={s.sessionsPerDay} reweighPct={s.reweighCompliancePct} isBottom />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inventory Health */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={tokens.card.iconBox}>
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className={tokens.card.title}>Inventory Health</CardTitle>
                    <CardDescription>Stock risk snapshot</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('inventory')} className="font-sans text-xs text-muted-foreground">
                  View Inventory
                </Button>
              </CardHeader>
              <CardContent>
                {inventoryHealth.total === 0 ? (
                  <div className="py-6 text-center">
                    <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className={tokens.body.muted}>No inventory projections available.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    <HealthStat label="Critical" count={inventoryHealth.critical} color="text-destructive" />
                    <HealthStat label="High Risk" count={inventoryHealth.high} color="text-amber-500" />
                    <HealthStat label="Medium" count={inventoryHealth.medium} color="text-blue-500" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => onNavigate('inventory:counts')} className="font-sans gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" /> Start Count
                </Button>
                <Button variant="outline" size="sm" onClick={() => onNavigate('inventory:orders')} className="font-sans gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Create PO
                </Button>
                <Button variant="outline" size="sm" onClick={() => onNavigate('alerts')} className="font-sans gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> View Exceptions
                </Button>
                <Button variant="outline" size="sm" onClick={() => onNavigate('suppliers')} className="font-sans gap-1.5">
                  <Truck className="w-3.5 h-3.5" /> Manage Suppliers
                </Button>
                <Button variant="outline" size="sm" onClick={() => setActiveSubTab('analytics')} className="font-sans gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Export Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Analytics ── */}
        <TabsContent value="analytics" className="mt-6 space-y-6">
          <BackroomInsightsSection locationId={selectedLocationId} datePreset={datePreset} hideFilters />
          {/* Additional analytics cards */}
          <WasteCategoryBreakdownCard
            wasteByCategory={kpis.wasteByCategory ?? {}}
            totalWasteQty={kpis.totalWasteQty ?? 0}
          />
          <ServicePLReport startDate={start} endDate={end} locationId={effectiveLocationId} />
          <BackroomInventoryValuationCard locationId={effectiveLocationId} />
          <SeasonalDemandOverlay locationId={effectiveLocationId} />
        </TabsContent>

        {/* ── AI Intelligence ── */}
        <TabsContent value="ai" className="mt-6">
          <SupplyIntelligenceDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Sub-components ── */

function KpiTile({ icon: Icon, label, value, status = 'neutral', subtitle }: {
  icon: typeof FlaskConical;
  label: string;
  value: string;
  status?: 'ok' | 'warning' | 'neutral';
  subtitle?: string;
}) {
  return (
    <div className={cn(tokens.kpi.tile, 'relative')}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className={cn('w-4 h-4', status === 'warning' ? 'text-amber-500' : 'text-primary')} />
        </div>
        <span className={tokens.kpi.label}>{label}</span>
      </div>
      <span className={cn(tokens.kpi.value, status === 'warning' && 'text-amber-500')}>{value}</span>
      {subtitle && (
        <span className="text-[10px] font-sans text-muted-foreground mt-1 block">{subtitle}</span>
      )}
    </div>
  );
}

function BudgetKpiTile({ budgetPct, currentSpend, monthlyBudget, threshold, formatCurrency: fmt, onNavigate }: {
  budgetPct: number | null;
  currentSpend: number;
  monthlyBudget: number;
  threshold: number;
  formatCurrency: (n: number) => string;
  onNavigate: (section: string) => void;
}) {
  const pct = budgetPct ?? 0;
  const status = pct > 100 ? 'over' : pct > threshold ? 'warn' : 'ok';

  return (
    <button
      onClick={() => onNavigate('inventory:reorder')}
      className={cn(tokens.kpi.tile, 'relative cursor-pointer hover:ring-1 hover:ring-primary/20 transition-all text-left w-full')}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Wallet className={cn('w-4 h-4', status === 'over' ? 'text-destructive' : status === 'warn' ? 'text-amber-500' : 'text-primary')} />
        </div>
        <span className={tokens.kpi.label}>Budget</span>
      </div>
      {monthlyBudget > 0 ? (
        <>
          <span className={cn(tokens.kpi.value, status === 'over' && 'text-destructive', status === 'warn' && 'text-amber-500')}>
            {pct}%
          </span>
          <Progress
            value={Math.min(pct, 100)}
            className="h-1 mt-1"
            indicatorClassName={status === 'over' ? 'bg-destructive' : status === 'warn' ? 'bg-amber-500' : 'bg-primary'}
          />
        </>
      ) : (
        <span className={cn(tokens.kpi.value, 'text-muted-foreground')}>Not set</span>
      )}
      <span className="text-[10px] font-sans text-muted-foreground mt-1 block">
        {monthlyBudget > 0 ? 'Adjust →' : 'Set budget →'}
      </span>
    </button>
  );
}

function AlertRow({ alert, onNavigate, onSwitchTab }: { alert: ControlTowerAlert; onNavigate: (s: string) => void; onSwitchTab: (tab: string) => void }) {
  const handleClick = () => {
    const tabRoutes: Record<string, string> = { profitability: 'analytics', waste: 'analytics', staff: 'analytics' };
    const sectionRoutes: Record<string, string> = { inventory: 'inventory:stock', exception: 'alerts', reorder: 'inventory:reorder' };
    if (tabRoutes[alert.category]) {
      onSwitchTab(tabRoutes[alert.category]);
    } else {
      onNavigate(sectionRoutes[alert.category] ?? 'alerts');
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-start gap-2.5 p-2.5 rounded-lg border border-border/40 hover:bg-muted/50 transition-colors text-left"
    >
      <Badge className={cn('text-[10px] px-1.5 py-0 shrink-0 mt-0.5', PRIORITY_COLORS[alert.priority])}>
        {alert.priority}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-sans text-foreground leading-snug">{alert.title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{alert.description}</p>
      </div>
    </button>
  );
}

function StaffRow({ name, wasteRate, sessions, reweighPct, isBottom = false }: {
  name: string;
  wasteRate: number;
  sessions: number;
  reweighPct: number;
  isBottom?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5 text-xs font-sans">
      <span className="flex-1 truncate text-foreground">{name}</span>
      <span className={cn('tabular-nums', isBottom ? 'text-amber-500' : 'text-muted-foreground')}>
        {wasteRate.toFixed(1)}% waste
      </span>
      <span className="text-muted-foreground tabular-nums">{reweighPct.toFixed(0)}% reweigh</span>
    </div>
  );
}

function HealthStat({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="text-center py-3">
      <p className={cn('text-2xl font-display font-medium tabular-nums', count > 0 ? color : 'text-muted-foreground')}>
        {count}
      </p>
      <p className="text-[10px] font-sans text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}
