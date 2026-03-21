import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  Loader2,
  Target,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Trophy,
  Download,
  RefreshCcw,
} from 'lucide-react';
import { format, subDays, startOfWeek, differenceInDays } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { cn } from '@/lib/utils';

interface EnrollmentData {
  id: string;
  user_id: string;
  current_day: number;
  streak_count: number;
  status: string;
  start_date: string;
  restart_count: number;
  completed_at: string | null;
}

interface CompletionData {
  enrollment_id: string;
  day_number: number;
  is_complete: boolean;
  completion_date: string;
}

interface CohortData {
  weekStart: string;
  count: number;
  active: number;
  completed: number;
  avgProgress: number;
}

const FUNNEL_STAGES = [
  { day: 1, label: 'Day 1' },
  { day: 7, label: 'Week 1' },
  { day: 14, label: 'Week 2' },
  { day: 21, label: 'Week 3' },
  { day: 30, label: 'Month 1' },
  { day: 45, label: 'Halfway' },
  { day: 60, label: 'Week 9' },
  { day: 75, label: 'Complete' },
];

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function ProgramAnalytics() {
  const { formatDate } = useFormatDate();
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);
  const [completions, setCompletions] = useState<CompletionData[]>([]);
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | '7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [enrollmentsRes, completionsRes] = await Promise.all([
        supabase.from('stylist_program_enrollment').select('*'),
        supabase.from('daily_completions').select('enrollment_id, day_number, is_complete, completion_date').eq('is_complete', true),
      ]);

      if (enrollmentsRes.data) setEnrollments(enrollmentsRes.data as EnrollmentData[]);
      if (completionsRes.data) setCompletions(completionsRes.data as CompletionData[]);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
    setLoading(false);
  };

  // Calculate funnel data
  const funnelData = useMemo(() => {
    return FUNNEL_STAGES.map(stage => {
      const reached = enrollments.filter(e => e.current_day >= stage.day || e.status === 'completed').length;
      const percentage = enrollments.length > 0 ? Math.round((reached / enrollments.length) * 100) : 0;
      return {
        ...stage,
        reached,
        percentage,
        total: enrollments.length,
      };
    });
  }, [enrollments]);

  // Calculate drop-off points
  const dropOffData = useMemo(() => {
    const dayGroups: Record<number, number> = {};
    
    enrollments.forEach(e => {
      if (e.status !== 'completed' && e.status !== 'active') {
        const day = e.current_day;
        dayGroups[day] = (dayGroups[day] || 0) + 1;
      }
    });

    return Object.entries(dayGroups)
      .map(([day, count]) => ({ day: parseInt(day), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [enrollments]);

  // Cohort analysis by start week
  const cohortData = useMemo(() => {
    const cohorts: Record<string, EnrollmentData[]> = {};
    
    enrollments.forEach(e => {
      const weekStart = format(startOfWeek(new Date(e.start_date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      if (!cohorts[weekStart]) cohorts[weekStart] = [];
      cohorts[weekStart].push(e);
    });

    return Object.entries(cohorts)
      .map(([weekStart, members]) => ({
        weekStart,
        weekLabel: formatDate(new Date(weekStart), 'MMM d'),
        count: members.length,
        active: members.filter(m => m.status === 'active').length,
        completed: members.filter(m => m.status === 'completed').length,
        avgProgress: Math.round(members.reduce((sum, m) => sum + (m.current_day / 75) * 100, 0) / members.length),
      }))
      .sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime())
      .slice(-12);
  }, [enrollments]);

  // Daily completion trend
  const completionTrend = useMemo(() => {
    const days = dateRange === 'today' ? 1 : dateRange === 'yesterday' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365;
    const trendData: { date: string; completions: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const count = completions.filter(c => c.completion_date?.split('T')[0] === date).length;
      trendData.push({ date: formatDate(new Date(date), 'MMM d'), completions: count });
    }

    return trendData;
  }, [completions, dateRange]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    const statuses: Record<string, number> = {};
    enrollments.forEach(e => {
      statuses[e.status] = (statuses[e.status] || 0) + 1;
    });

    return Object.entries(statuses).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
    }));
  }, [enrollments]);

  // Summary stats
  const stats = useMemo(() => {
    const total = enrollments.length;
    const active = enrollments.filter(e => e.status === 'active').length;
    const completed = enrollments.filter(e => e.status === 'completed').length;
    const avgStreak = total > 0 ? Math.round(enrollments.reduce((sum, e) => sum + e.streak_count, 0) / total) : 0;
    const avgProgress = total > 0 ? Math.round(enrollments.reduce((sum, e) => sum + (e.current_day / 75) * 100, 0) / total) : 0;
    const totalRestarts = enrollments.reduce((sum, e) => sum + e.restart_count, 0);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // At-risk count (no activity in 2+ days)
    const atRisk = enrollments.filter(e => {
      if (e.status !== 'active') return false;
      const lastActivity = e.start_date; // Could use last_completion_date if available
      const daysSince = differenceInDays(new Date(), new Date(lastActivity));
      return daysSince > 2;
    }).length;

    return { total, active, completed, avgStreak, avgProgress, totalRestarts, completionRate, atRisk };
  }, [enrollments]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-foreground text-background flex items-center justify-center rounded-lg">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-display">PROGRAM ANALYTICS</h1>
              <p className="text-muted-foreground text-sm">75-Day Client Engine performance insights</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
              <SelectTrigger className="w-[130px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchData}>
              <RefreshCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-display">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Enrolled</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-display">{stats.completionRate}%</p>
                  <p className="text-xs text-muted-foreground">Completion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-display">{stats.avgStreak}</p>
                  <p className="text-xs text-muted-foreground">Avg Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  stats.atRisk > 0 ? "bg-red-500/10" : "bg-muted"
                )}>
                  <AlertTriangle className={cn("w-5 h-5", stats.atRisk > 0 ? "text-red-600" : "text-muted-foreground")} />
                </div>
                <div>
                  <p className="text-2xl font-display">{stats.atRisk}</p>
                  <p className="text-xs text-muted-foreground">At Risk</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="funnel" className="space-y-6">
          <TabsList>
            <TabsTrigger value="funnel">Completion Funnel</TabsTrigger>
            <TabsTrigger value="trends">Daily Trends</TabsTrigger>
            <TabsTrigger value="cohorts">Cohort Analysis</TabsTrigger>
            <TabsTrigger value="dropoff">Drop-off Points</TabsTrigger>
          </TabsList>

          {/* Completion Funnel */}
          <TabsContent value="funnel" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Progress Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {funnelData.map((stage, index) => (
                    <div key={stage.day} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{stage.label}</span>
                        <span className="text-muted-foreground">
                          {stage.reached} / {stage.total} ({stage.percentage}%)
                        </span>
                      </div>
                      <Progress value={stage.percentage} className="h-3" />
                      {index < funnelData.length - 1 && (
                        <div className="flex justify-end">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              funnelData[index + 1].percentage < stage.percentage * 0.7
                                ? "text-red-600 border-red-500/30"
                                : "text-muted-foreground"
                            )}
                          >
                            {stage.percentage > 0 
                              ? `-${stage.percentage - funnelData[index + 1].percentage}%`
                              : '0%'
                            }
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Daily Trends */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Daily Completions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={completionTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="completions" 
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary) / 0.2)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cohort Analysis */}
          <TabsContent value="cohorts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Cohort Performance by Start Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cohortData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="weekLabel" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }} 
                      />
                      <Bar dataKey="active" name="Active" fill="hsl(var(--chart-2))" stackId="a" />
                      <Bar dataKey="completed" name="Completed" fill="hsl(var(--chart-1))" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Cohort Table */}
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-display">Week</th>
                        <th className="text-right py-2">Enrolled</th>
                        <th className="text-right py-2">Active</th>
                        <th className="text-right py-2">Completed</th>
                        <th className="text-right py-2">Avg Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cohortData.map(cohort => (
                        <tr key={cohort.weekStart} className="border-b border-border/50">
                          <td className="py-2">{cohort.weekLabel}</td>
                          <td className="text-right">{cohort.count}</td>
                          <td className="text-right">{cohort.active}</td>
                          <td className="text-right">{cohort.completed}</td>
                          <td className="text-right">{cohort.avgProgress}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Drop-off Points */}
          <TabsContent value="dropoff" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Common Drop-off Points</CardTitle>
              </CardHeader>
              <CardContent>
                {dropOffData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No significant drop-off points detected</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dropOffData.map((item, index) => (
                      <div key={item.day} className="flex items-center gap-4">
                        <Badge variant="outline" className="w-16 justify-center">
                          Day {item.day}
                        </Badge>
                        <div className="flex-1">
                          <Progress 
                            value={(item.count / Math.max(...dropOffData.map(d => d.count))) * 100} 
                            className="h-6"
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={0}
                        stroke="hsl(var(--border) / 0.4)"
                        strokeWidth={1}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Restart Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Restart Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-display">{stats.totalRestarts}</p>
                <p className="text-sm text-muted-foreground">Total Restarts</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-display">
                  {stats.total > 0 ? (stats.totalRestarts / stats.total).toFixed(1) : 0}
                </p>
                <p className="text-sm text-muted-foreground">Avg per User</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-display">
                  {enrollments.filter(e => e.restart_count === 0).length}
                </p>
                <p className="text-sm text-muted-foreground">First Attempt</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-display">
                  {enrollments.filter(e => e.restart_count >= 3).length}
                </p>
                <p className="text-sm text-muted-foreground">3+ Restarts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
