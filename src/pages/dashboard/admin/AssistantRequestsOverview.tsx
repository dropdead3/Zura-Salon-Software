import { useState, useMemo } from 'react';
import { parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Users, CheckCircle2, XCircle, Clock, CalendarDays, TrendingUp, AlertCircle, MapPin, UserCheck, UserPlus } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@/components/ui/tabs';
import { useAssistantRequests, type AssistantRequest } from '@/hooks/useAssistantRequests';
import { useActiveLocations } from '@/hooks/useLocations';
import { useActiveAssistants, useAssistantCoverageSummary } from '@/hooks/useAssistantAvailability';
import { ManualAssignmentDialog } from '@/components/dashboard/ManualAssignmentDialog';
import { AssistantPerformanceMetrics } from '@/components/dashboard/AssistantPerformanceMetrics';
import { AssistantWorkloadChart } from '@/components/dashboard/AssistantWorkloadChart';
import { AssistantActivityCard } from '@/components/dashboard/AssistantActivityCard';
import { AssistantRequestsCalendar } from '@/components/dashboard/AssistantRequestsCalendar';
import { cn } from '@/lib/utils';
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description,
  variant = 'default' 
}: { 
  title: string; 
  value: number | string; 
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const variantStyles = {
    default: 'bg-card',
    success: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900',
    warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900',
    danger: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900',
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
  };

  return (
    <Card className={cn('transition-all', variantStyles[variant])}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn('h-4 w-4', iconStyles[variant])} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-medium">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function RequestRow({ request, onManualAssign }: { request: AssistantRequest; onManualAssign?: (req: AssistantRequest) => void }) {
  const { formatDate } = useFormatDate();
  const isAccepted = !!request.accepted_at;
  const declinedCount = request.declined_by?.length || 0;
  const needsAssignment = request.status === 'pending' || (request.status === 'assigned' && !request.accepted_at);

  const statusBadge = () => {
    if (request.status === 'completed') {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Completed</Badge>;
    }
    if (request.status === 'cancelled') {
      return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>;
    }
    if (request.status === 'pending') {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending Assignment</Badge>;
    }
    if (isAccepted) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Accepted</Badge>;
    }
    return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Awaiting Response</Badge>;
  };

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{request.client_name}</span>
          {statusBadge()}
          {declinedCount > 0 && (
            <Badge variant="outline" className="text-destructive border-destructive/30">
              {declinedCount} decline{declinedCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          <span>{formatDate(parseISO(request.request_date), 'MMM d')} • </span>
          <span>{request.salon_services?.name}</span>
          {request.locations?.name && (
            <span className="flex items-center gap-1 inline-flex ml-2">
              <MapPin className="h-3 w-3" />
              {request.locations.name}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right text-sm">
          <div className="font-medium">
            {request.stylist_profile?.display_name || request.stylist_profile?.full_name || 'Unknown'}
          </div>
          {request.assistant_profile && (
            <div className="text-muted-foreground">
              → {request.assistant_profile.display_name || request.assistant_profile.full_name}
            </div>
          )}
        </div>
        {needsAssignment && onManualAssign && (
          <Button size={tokens.button.inline} variant="outline" onClick={() => onManualAssign(request)}>
            <UserPlus className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AssistantRequestsOverview() {
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'assistants' | 'pending' | 'all'>('overview');
  const [selectedRequest, setSelectedRequest] = useState<AssistantRequest | null>(null);
  const [manualAssignOpen, setManualAssignOpen] = useState(false);
  
  const { data: locations = [] } = useActiveLocations();
  const { data: assistants = [], isLoading: assistantsLoading } = useActiveAssistants();
  const { data: coverageSummary } = useAssistantCoverageSummary();
  const effectiveLocationFilter = locationFilter === 'all' ? undefined : locationFilter;
  const { data: allRequests = [], isLoading } = useAssistantRequests('all', effectiveLocationFilter);

  // Filter assistants by location if filter is applied
  const filteredAssistants = useMemo(() => {
    if (locationFilter === 'all') return assistants;
    return assistants.filter(assistant =>
      assistant.schedules.some(s => s.location_id === locationFilter)
    );
  }, [assistants, locationFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
    
    const thisWeekRequests = allRequests.filter(r => {
      const requestDate = parseISO(r.request_date);
      return isWithinInterval(requestDate, { start: weekStart, end: weekEnd });
    });

    const total = allRequests.length;
    const thisWeek = thisWeekRequests.length;
    const pending = allRequests.filter(r => r.status === 'pending').length;
    const awaitingResponse = allRequests.filter(r => r.status === 'assigned' && !r.accepted_at).length;
    const accepted = allRequests.filter(r => r.accepted_at).length;
    const completed = allRequests.filter(r => r.status === 'completed').length;
    const cancelled = allRequests.filter(r => r.status === 'cancelled').length;
    
    // Calculate total declines
    const totalDeclines = allRequests.reduce((sum, r) => sum + (r.declined_by?.length || 0), 0);
    
    // Acceptance rate (accepted / (accepted + still awaiting + cancelled due to no accept))
    const assignedRequests = allRequests.filter(r => r.status === 'assigned' || r.status === 'completed');
    const acceptanceRate = assignedRequests.length > 0 
      ? Math.round((accepted / assignedRequests.length) * 100) 
      : 0;

    return {
      total,
      thisWeek,
      pending,
      awaitingResponse,
      accepted,
      completed,
      cancelled,
      totalDeclines,
      acceptanceRate,
    };
  }, [allRequests]);

  // Filter requests for different views
  const pendingRequests = useMemo(() => 
    allRequests.filter(r => r.status === 'pending' || (r.status === 'assigned' && !r.accepted_at)),
    [allRequests]
  );

  const recentRequests = useMemo(() => 
    [...allRequests]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10),
    [allRequests]
  );

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display">Assistant Requests</h1>
            <p className="text-muted-foreground">Overview of all assistant request activity</p>
          </div>
          
          {locations.length > 1 && (
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[180px]">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <ResponsiveTabsList onTabChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="assistants">
                <UserCheck className="h-4 w-4 mr-1" />
                Assistants ({filteredAssistants.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Needs Attention
                {pendingRequests.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{pendingRequests.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all">All Requests</TabsTrigger>
            </ResponsiveTabsList>

            {/* Assistants Tab */}
            <TabsContent value="assistants">
              <Card>
                <CardHeader>
                  <CardTitle>Active Assistants</CardTitle>
                  <CardDescription>Assistants and their location schedules</CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredAssistants.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No active assistants found</p>
                  ) : (
                    <div className="space-y-4">
                      {filteredAssistants.map((assistant) => (
                        <div key={assistant.user_id} className="flex items-start gap-4 p-4 border rounded-lg">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={assistant.photo_url || undefined} />
                            <AvatarFallback>{(assistant.display_name || assistant.full_name).charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h4 className="font-medium">{assistant.display_name || assistant.full_name}</h4>
                            {assistant.schedules.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No schedule set</p>
                            ) : (
                              <div className="mt-2 space-y-2">
                                {assistant.schedules.map((schedule) => {
                                  const location = locations.find(l => l.id === schedule.location_id);
                                  return (
                                    <div key={schedule.location_id} className="flex items-center gap-2 text-sm">
                                      <MapPin className="h-3 w-3 text-muted-foreground" />
                                      <span className="font-medium">{location?.name || schedule.location_id}:</span>
                                      <div className="flex gap-1">
                                        {DAYS_OF_WEEK.map(day => (
                                          <span
                                            key={day}
                                            className={cn(
                                              "px-1.5 py-0.5 rounded text-xs",
                                              schedule.work_days?.includes(day)
                                                ? "bg-primary/10 text-primary font-medium"
                                                : "text-muted-foreground/50"
                                            )}
                                          >
                                            {day}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="overview" className="space-y-6">
              {/* Stats Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                  title="This Week" 
                  value={stats.thisWeek}
                  icon={CalendarDays}
                  description="Requests this week"
                />
                <StatCard 
                  title="Pending Assignment" 
                  value={stats.pending}
                  icon={Clock}
                  description="Waiting for assistant"
                  variant={stats.pending > 0 ? 'warning' : 'default'}
                />
                <StatCard 
                  title="Awaiting Response" 
                  value={stats.awaitingResponse}
                  icon={AlertCircle}
                  description="Assistant hasn't responded"
                  variant={stats.awaitingResponse > 0 ? 'warning' : 'default'}
                />
                <StatCard 
                  title="Acceptance Rate" 
                  value={`${stats.acceptanceRate}%`}
                  icon={TrendingUp}
                  description={`${stats.accepted} accepted`}
                  variant={stats.acceptanceRate >= 80 ? 'success' : stats.acceptanceRate >= 50 ? 'warning' : 'danger'}
                />
              </div>

              {/* Summary Stats */}
              <div className="grid gap-4 md:grid-cols-4">
                <StatCard 
                  title="Total Requests" 
                  value={stats.total}
                  icon={Users}
                />
                <StatCard 
                  title="Completed" 
                  value={stats.completed}
                  icon={CheckCircle2}
                  variant="success"
                />
                <StatCard 
                  title="Total Declines" 
                  value={stats.totalDeclines}
                  icon={XCircle}
                  variant={stats.totalDeclines > 5 ? 'danger' : 'default'}
                />
                <StatCard 
                  title="Cancelled" 
                  value={stats.cancelled}
                  icon={XCircle}
                />
              </div>

              {/* Assistant Activity (appointment-level assists) */}
              <AssistantActivityCard />

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Requests</CardTitle>
                  <CardDescription>Latest assistant request activity</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentRequests.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No requests yet</p>
                  ) : (
                    <div className="divide-y">
                      {recentRequests.map((request) => (
                        <RequestRow key={request.id} request={request} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle>Requests Needing Attention</CardTitle>
                  <CardDescription>Pending assignments and awaiting responses</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingRequests.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                      <p className="text-muted-foreground">All caught up! No pending requests.</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {pendingRequests.map((request) => (
                        <RequestRow key={request.id} request={request} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="all">
              <Card>
                <CardHeader>
                  <CardTitle>All Requests</CardTitle>
                  <CardDescription>Complete history of assistant requests</CardDescription>
                </CardHeader>
                <CardContent>
                  {allRequests.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No requests yet</p>
                  ) : (
                    <div className="divide-y">
                      {allRequests.map((request) => (
                        <RequestRow key={request.id} request={request} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
