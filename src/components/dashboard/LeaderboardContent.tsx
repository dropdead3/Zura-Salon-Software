import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Trophy, Flame, Target, Loader2, Crown, Medal, Award, Users, Repeat, ShoppingBag, Sparkles, Star, Info, History, BadgeCheck, RefreshCw, Settings } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useLeaderboardHistory } from '@/hooks/useLeaderboardHistory';
import { useLeaderboardAchievements } from '@/hooks/useLeaderboardAchievements';
import { usePhorestPerformanceMetrics, usePhorestConnection, useTriggerPhorestSync } from '@/hooks/usePhorestSync';
import { LeaderboardTrendIndicator } from '@/components/dashboard/LeaderboardTrendIndicator';
import { LeaderboardHistoryPanel } from '@/components/dashboard/LeaderboardHistoryPanel';
import { AchievementBadgeStack } from '@/components/dashboard/AchievementBadge';
import { AchievementsShowcase } from '@/components/dashboard/AchievementsShowcase';
import { Link } from 'react-router-dom';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { usePOSProviderLabel } from '@/hooks/usePOSProviderLabel';
import { formatCurrencyWhole as formatCurrencyWholeUtil } from '@/lib/formatCurrency';

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  display_name: string | null;
  current_day: number;
  streak_count: number;
  total_revenue: number;
  ring_count: number;
}

interface PhorestPerformer {
  id: string;
  name: string;
  photoUrl?: string;
  newClients: number;
  retentionRate: number;
  retailSales: number;
  extensionClients: number;
  _revenue: number;
}

interface ScoreWeights {
  newClients: number;
  retention: number;
  retail: number;
  extensions: number;
}

interface ScoreBreakdown {
  total: number;
  components: {
    newClients: { normalized: number; weighted: number; weight: number };
    retention: { normalized: number; weighted: number; weight: number };
    retail: { normalized: number; weighted: number; weight: number };
    extensions: { normalized: number; weighted: number; weight: number };
  };
}

type MetricType = 'day' | 'streak' | 'revenue' | 'bells';
type PhorestCategory = 'overall' | 'newClients' | 'retention' | 'retail' | 'extensions';

// Default weights (fallback)
const DEFAULT_WEIGHTS: ScoreWeights = {
  newClients: 0.30,
  retention: 0.25,
  retail: 0.20,
  extensions: 0.25,
};

// Calculate score with breakdown
const calculateScoreBreakdown = (
  performer: PhorestPerformer, 
  allPerformers: PhorestPerformer[],
  weights: ScoreWeights
): ScoreBreakdown => {
  const maxNewClients = Math.max(...allPerformers.map(p => p.newClients), 1);
  const maxRetention = 100;
  const maxRetail = Math.max(...allPerformers.map(p => p.retailSales), 1);
  const maxExtensions = Math.max(...allPerformers.map(p => p.extensionClients), 1);

  const normalizedNewClients = (performer.newClients / maxNewClients) * 100;
  const normalizedRetention = performer.retentionRate;
  const normalizedRetail = (performer.retailSales / maxRetail) * 100;
  const normalizedExtensions = (performer.extensionClients / maxExtensions) * 100;

  const weightedNewClients = normalizedNewClients * weights.newClients;
  const weightedRetention = normalizedRetention * weights.retention;
  const weightedRetail = normalizedRetail * weights.retail;
  const weightedExtensions = normalizedExtensions * weights.extensions;

  const total = Math.round((weightedNewClients + weightedRetention + weightedRetail + weightedExtensions) * 10) / 10;

  return {
    total,
    components: {
      newClients: { normalized: Math.round(normalizedNewClients), weighted: Math.round(weightedNewClients * 10) / 10, weight: weights.newClients },
      retention: { normalized: Math.round(normalizedRetention), weighted: Math.round(weightedRetention * 10) / 10, weight: weights.retention },
      retail: { normalized: Math.round(normalizedRetail), weighted: Math.round(weightedRetail * 10) / 10, weight: weights.retail },
      extensions: { normalized: Math.round(normalizedExtensions), weighted: Math.round(weightedExtensions * 10) / 10, weight: weights.extensions },
    },
  };
};

// Mock data - fallback when Phorest is not connected
const mockPhorestData: PhorestPerformer[] = [
  { id: '1', name: 'Jessica Martinez', newClients: 12, retentionRate: 94, retailSales: 580, extensionClients: 8, _revenue: 4850 },
  { id: '2', name: 'Amanda Chen', newClients: 8, retentionRate: 91, retailSales: 420, extensionClients: 11, _revenue: 4320 },
  { id: '3', name: 'Sarah Johnson', newClients: 15, retentionRate: 88, retailSales: 350, extensionClients: 5, _revenue: 3980 },
  { id: '4', name: 'Taylor Williams', newClients: 6, retentionRate: 96, retailSales: 680, extensionClients: 9, _revenue: 3650 },
  { id: '5', name: 'Morgan Davis', newClients: 10, retentionRate: 85, retailSales: 290, extensionClients: 12, _revenue: 3200 },
  { id: '6', name: 'Ashley Brown', newClients: 7, retentionRate: 92, retailSales: 510, extensionClients: 6, _revenue: 2890 },
];

// Score Breakdown Tooltip Component
function ScoreBreakdownTooltip({ breakdown, children }: { breakdown: ScoreBreakdown; children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side="left" className="w-64 p-0">
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between border-b pb-2 mb-2">
              <span className="font-display text-xs tracking-wide">SCORE BREAKDOWN</span>
              <span className="font-display text-lg">{breakdown.total} pts</span>
            </div>
            <div className="space-y-1.5 text-xs font-sans">
              <div className="flex justify-between">
                <span className="text-muted-foreground">New Clients ({Math.round(breakdown.components.newClients.weight * 100)}%)</span>
                <span>{breakdown.components.newClients.weighted} pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Retention ({Math.round(breakdown.components.retention.weight * 100)}%)</span>
                <span>{breakdown.components.retention.weighted} pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Retail ({Math.round(breakdown.components.retail.weight * 100)}%)</span>
                <span>{breakdown.components.retail.weighted} pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Extensions ({Math.round(breakdown.components.extensions.weight * 100)}%)</span>
                <span>{breakdown.components.extensions.weighted} pts</span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function LeaderboardContent() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { providerLabel } = usePOSProviderLabel();
  const { formatDate } = useFormatDate();
  const [metric, setMetric] = useState<MetricType>('day');
  const [phorestCategory, setPhorestCategory] = useState<PhorestCategory>('overall');
  const [weights, setWeights] = useState<ScoreWeights>(DEFAULT_WEIGHTS);
  const [showHistory, setShowHistory] = useState(false);

  const { getTrendForUser } = useLeaderboardHistory();
  const { getUserAchievements } = useLeaderboardAchievements();
  
  // Get current week's Monday for performance data
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  
  // Fetch Phorest data
  const { data: phorestConnection } = usePhorestConnection();
  const { data: phorestMetrics, isLoading: phorestLoading, refetch: refetchPhorest } = usePhorestPerformanceMetrics(weekStartStr);
  const triggerSync = useTriggerPhorestSync();

  // Transform Phorest metrics to display format
  const phorestData: PhorestPerformer[] = useMemo(() => {
    if (!phorestMetrics || phorestMetrics.length === 0) {
      return mockPhorestData;
    }
    
    return phorestMetrics.map((metric: any) => ({
      id: metric.user_id,
      name: metric.employee_profiles?.display_name || metric.employee_profiles?.full_name || 'Unknown',
      photoUrl: metric.employee_profiles?.photo_url,
      newClients: metric.new_clients || 0,
      retentionRate: Number(metric.retention_rate) || 0,
      retailSales: Number(metric.retail_sales) || 0,
      extensionClients: metric.extension_clients || 0,
      _revenue: Number(metric.total_revenue) || 0,
    }));
  }, [phorestMetrics]);
  
  const isUsingLiveData = phorestMetrics && phorestMetrics.length > 0;

  useEffect(() => {
    fetchWeights();
    fetchLeaderboard();
  }, []);

  const fetchWeights = async () => {
    const { data, error } = await supabase
      .from('leaderboard_weights')
      .select('*')
      .limit(1)
      .single();

    if (!error && data) {
      setWeights({
        newClients: Number(data.new_clients_weight),
        retention: Number(data.retention_weight),
        retail: Number(data.retail_weight),
        extensions: Number(data.extensions_weight),
      });
    }
  };

  const getScoreBreakdown = (performer: PhorestPerformer): ScoreBreakdown => {
    return calculateScoreBreakdown(performer, phorestData, weights);
  };

  const categoryConfig: Record<PhorestCategory, { 
    label: string; 
    icon: React.ComponentType<{ className?: string }>; 
    getValue: (p: PhorestPerformer) => number;
    formatValue: (v: number) => string;
    description: string;
  }> = {
    overall: {
      label: 'Overall Score',
      icon: Star,
      getValue: (p) => getScoreBreakdown(p).total,
      formatValue: (v) => `${v} pts`,
      description: 'Weighted composite score across all performance metrics',
    },
    newClients: {
      label: 'New Clients',
      icon: Users,
      getValue: (p) => p.newClients,
      formatValue: (v) => `${v} new`,
      description: 'Most new clients booked this week',
    },
    retention: {
      label: 'Retention',
      icon: Repeat,
      getValue: (p) => p.retentionRate,
      formatValue: (v) => `${v}%`,
      description: 'Highest client return rate',
    },
    retail: {
      label: 'Retail Sales',
      icon: ShoppingBag,
      getValue: (p) => p.retailSales,
      formatValue: (v) => formatCurrencyWhole(v),
      description: 'Top retail product sales',
    },
    extensions: {
      label: 'Extensions',
      icon: Sparkles,
      getValue: (p) => p.extensionClients,
      formatValue: (v) => `${v} clients`,
      description: 'Most extension clients served',
    },
  };

  const currentConfig = categoryConfig[phorestCategory];
  const sortedPhorestData = [...phorestData].sort(
    (a, b) => currentConfig.getValue(b) - currentConfig.getValue(a)
  );

  const fetchLeaderboard = async () => {
    const { data: enrollments, error } = await supabase
      .from('stylist_program_enrollment')
      .select(`user_id, current_day, streak_count`)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching leaderboard:', error);
      setLoading(false);
      return;
    }

    const userIds = enrollments?.map(e => e.user_id) || [];
    
    if (userIds.length === 0) {
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from('employee_profiles')
      .select('user_id, full_name, display_name')
      .in('user_id', userIds);

    const { data: bellTotals } = await supabase
      .from('ring_the_bell_entries')
      .select('user_id, ticket_value')
      .in('user_id', userIds);

    const leaderboard: LeaderboardEntry[] = (enrollments || []).map(enrollment => {
      const profile = profiles?.find(p => p.user_id === enrollment.user_id);
      const userBells = bellTotals?.filter(b => b.user_id === enrollment.user_id) || [];
      const totalRevenue = userBells.reduce((sum, b) => sum + (b.ticket_value || 0), 0);

      return {
        user_id: enrollment.user_id,
        full_name: profile?.full_name || 'Unknown',
        display_name: profile?.display_name,
        current_day: enrollment.current_day,
        streak_count: enrollment.streak_count,
        total_revenue: totalRevenue,
        ring_count: userBells.length,
      };
    });

    setEntries(leaderboard);
    setLoading(false);
  };

  const sortedEntries = [...entries].sort((a, b) => {
    switch (metric) {
      case 'day': return b.current_day - a.current_day;
      case 'streak': return b.streak_count - a.streak_count;
      case 'revenue': return b.total_revenue - a.total_revenue;
      case 'bells': return b.ring_count - a.ring_count;
      default: return 0;
    }
  });

  const metrics: { key: MetricType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'day', label: 'Progress', icon: Target },
    { key: 'streak', label: 'Streak', icon: Flame },
    { key: 'bells', label: 'Bells', icon: Trophy },
  ];

  const getValue = (entry: LeaderboardEntry): string => {
    switch (metric) {
      case 'day': return `Day ${entry.current_day}`;
      case 'streak': return `${entry.streak_count} days`;
      case 'revenue': return formatCurrencyWhole(entry.total_revenue);
      case 'bells': return `${entry.ring_count} bells`;
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-600" />;
    return null;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="phorest" className="space-y-6">
        <ResponsiveTabsList>
          <TabsTrigger value="phorest" className="font-display text-xs tracking-wide">
            <Trophy className="w-4 h-4 mr-2" />
            Weekly Rankings
          </TabsTrigger>
          <TabsTrigger value="achievements" className="font-display text-xs tracking-wide">
            <BadgeCheck className="w-4 h-4 mr-2" />
            Achievements
          </TabsTrigger>
          <TabsTrigger value="program" className="font-display text-xs tracking-wide">
            <Target className="w-4 h-4 mr-2" />
            Program Progress
          </TabsTrigger>
        </ResponsiveTabsList>

        {/* Phorest Weekly Rankings Tab */}
        <TabsContent value="phorest" className="space-y-6">
          {/* Week Info Banner */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-display mb-1">
                  This Week
                </p>
                <p className="font-sans font-medium">
                  {formatDate(weekStart, 'MMM d')} - {formatDate(weekEnd, 'MMM d, yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => triggerSync.mutate('reports')}
                  disabled={triggerSync.isPending || phorestLoading}
                  className="font-display text-xs tracking-wide"
                >
                  {triggerSync.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">Sync</span>
                </Button>
                <Button
                  variant={showHistory ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                  className="font-display text-xs tracking-wide"
                >
                  <History className="w-4 h-4 mr-2" />
                  History
                </Button>
                <Link to="/dashboard/admin/phorest">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-display text-xs tracking-wide"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </Link>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-display mb-1">
                    Category
                  </p>
                  <p className="font-display text-lg">{currentConfig.label}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Category Selector */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(categoryConfig) as PhorestCategory[]).map((key) => {
              const config = categoryConfig[key];
              const Icon = config.icon;
              return (
                <Button
                  key={key}
                  variant={phorestCategory === key ? 'default' : 'outline'}
                  onClick={() => setPhorestCategory(key)}
                  className="font-display text-xs tracking-wide"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {config.label}
                </Button>
              );
            })}
          </div>

          {/* Category Description */}
          <p className="text-sm text-muted-foreground font-sans">
            {currentConfig.description}
          </p>

          {/* Data Source Notice */}
          {isUsingLiveData ? (
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-xs text-primary font-sans text-center flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                Live data from {providerLabel} • {phorestData.length} team members
              </p>
            </div>
          ) : (
            <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
              <p className="text-xs text-muted-foreground font-sans text-center">
                📊 Showing sample data • <Link to="/dashboard/admin/phorest" className="underline hover:text-foreground">Connect {providerLabel}</Link> to see live rankings
              </p>
            </div>
          )}

          {/* Top 3 Podium */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {sortedPhorestData.slice(0, 3).map((performer, index) => {
              const order = index === 0 ? 'order-2' : index === 1 ? 'order-1' : 'order-3';
              const height = index === 0 ? 'pt-0' : index === 1 ? 'pt-6' : 'pt-8';
              
              return (
                <div key={performer.id} className={`${order} ${height}`}>
                  <Card className={`p-4 text-center ${index === 0 ? 'border-2 border-primary bg-primary/5' : ''}`}>
                    <div className="flex justify-center mb-2">
                      {getRankIcon(index)}
                    </div>
                    <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-2 flex items-center justify-center font-display text-lg">
                      {performer.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <p className="font-sans text-sm font-medium truncate mb-1">
                      {performer.name.split(' ')[0]}
                    </p>
                    <p className="font-display text-lg">
                      {currentConfig.formatValue(currentConfig.getValue(performer))}
                    </p>
                  </Card>
                </div>
              );
            })}
          </div>

          {/* Main content grid */}
          <div className={`grid gap-6 ${showHistory ? 'lg:grid-cols-[1fr,300px]' : ''}`}>
            {/* Full Leaderboard */}
            <div className="space-y-3">
              {sortedPhorestData.map((performer, index) => {
                const trend = getTrendForUser(performer.id);
                
                return (
                  <Card 
                    key={performer.id}
                    className={`p-4 ${index < 3 ? 'border-primary/30' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className={`
                        w-10 h-10 flex items-center justify-center font-display text-lg rounded
                        ${index === 0 ? 'bg-primary text-primary-foreground' : 
                          index === 1 ? 'bg-muted' : 
                          index === 2 ? 'bg-muted' : 'bg-muted/50'}
                      `}>
                        {index + 1}
                      </div>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-display text-sm">
                        {performer.name.split(' ').map(n => n[0]).join('')}
                      </div>

                      {/* Name + Trend + Badges */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-sans font-medium truncate">{performer.name}</p>
                          {phorestCategory === 'overall' && (
                            <LeaderboardTrendIndicator trend={trend} />
                          )}
                          {/* Achievement badges */}
                          {getUserAchievements(performer.id).length > 0 && (
                            <AchievementBadgeStack
                              achievements={getUserAchievements(performer.id)
                                .filter(ua => ua.achievement)
                                .map(ua => ({
                                  achievement: ua.achievement!,
                                  earnedAt: ua.earned_at,
                                }))}
                              maxVisible={3}
                              size="sm"
                            />
                          )}
                        </div>
                        {index === 0 && (
                          <p className="text-xs text-primary font-display tracking-wide">
                            THIS WEEK'S LEADER
                          </p>
                        )}
                      </div>

                      <div className="text-right flex items-center gap-2">
                        {phorestCategory === 'overall' && (
                          <ScoreBreakdownTooltip breakdown={getScoreBreakdown(performer)}>
                            <button className="p-1 hover:bg-muted rounded transition-colors">
                              <Info className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </ScoreBreakdownTooltip>
                        )}
                        <p className="font-display text-lg">
                          {currentConfig.formatValue(currentConfig.getValue(performer))}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* History Panel */}
            {showHistory && (
              <div className="hidden lg:block">
                <LeaderboardHistoryPanel
                  currentRankings={sortedPhorestData.map((p, idx) => ({
                    userId: p.id,
                    name: p.name,
                    rank: idx + 1,
                    score: getScoreBreakdown(p).total,
                    newClients: { rank: [...phorestData].sort((a, b) => b.newClients - a.newClients).findIndex(x => x.id === p.id) + 1, value: p.newClients },
                    retention: { rank: [...phorestData].sort((a, b) => b.retentionRate - a.retentionRate).findIndex(x => x.id === p.id) + 1, value: p.retentionRate },
                    retail: { rank: [...phorestData].sort((a, b) => b.retailSales - a.retailSales).findIndex(x => x.id === p.id) + 1, value: p.retailSales },
                    extensions: { rank: [...phorestData].sort((a, b) => b.extensionClients - a.extensionClients).findIndex(x => x.id === p.id) + 1, value: p.extensionClients },
                  }))}
                  canSaveSnapshot={true}
                />
              </div>
            )}
          </div>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-6">
          <AchievementsShowcase />
        </TabsContent>

        {/* Program Progress Tab */}
        <TabsContent value="program" className="space-y-6">
          {/* Metric Selector */}
          <div className="flex flex-wrap gap-2">
            {metrics.map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={metric === key ? 'default' : 'outline'}
                onClick={() => setMetric(key)}
                className="font-display text-xs tracking-wide"
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </Button>
            ))}
          </div>

          {/* Leaderboard */}
          {loading ? (
            <DashboardLoader size="lg" className="py-20" />
          ) : sortedEntries.length === 0 ? (
            <Card className="p-12 text-center">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground font-sans">
                No active participants yet.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedEntries.map((entry, index) => (
                <Card 
                  key={entry.user_id}
                  className={`p-4 lg:p-6 flex items-center gap-4 ${
                    index === 0 ? 'border-2 border-foreground' : ''
                  }`}
                >
                  {/* Rank */}
                  <div className={`
                    w-10 h-10 flex items-center justify-center font-display text-lg
                    ${index === 0 ? 'bg-foreground text-background' : 'bg-muted'}
                  `}>
                    {index + 1}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="font-sans font-medium truncate">
                      {entry.display_name || entry.full_name}
                    </p>
                    {index === 0 && (
                      <p className="text-xs text-muted-foreground font-display tracking-wide">
                        LEADER
                      </p>
                    )}
                  </div>

                  {/* Value */}
                  <div className="text-right">
                    <p className="font-display text-lg">{getValue(entry)}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
