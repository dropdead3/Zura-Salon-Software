import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Target,
  Calendar,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useCoachAccountabilityItems, type AccountabilityItem } from '@/hooks/useAccountabilityItems';
import { parseISO, isPast, isToday } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { tokens } from '@/lib/design-tokens';

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'overdue';

export function AccountabilityOverview() {
  const { formatDate } = useFormatDate();
  const navigate = useNavigate();
  const { data: items = [], isLoading } = useCoachAccountabilityItems();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Calculate stats
  const activeItems = items.filter(i => i.status !== 'completed' && i.status !== 'cancelled');
  const overdueItems = activeItems.filter(i => i.due_date && isPast(parseISO(i.due_date)) && !isToday(parseISO(i.due_date)));
  const completedThisWeek = items.filter(i => {
    if (i.status !== 'completed' || !i.completed_at) return false;
    const completedDate = parseISO(i.completed_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return completedDate >= weekAgo;
  });

  // Filter items
  const filteredItems = items.filter(item => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'overdue') {
      return item.status !== 'completed' && item.status !== 'cancelled' && 
             item.due_date && isPast(parseISO(item.due_date)) && !isToday(parseISO(item.due_date));
    }
    return item.status === statusFilter;
  });

  // Group by team member
  const groupedByMember = filteredItems.reduce((acc, item) => {
    const memberId = item.team_member_id;
    if (!acc[memberId]) {
      acc[memberId] = {
        member: item.team_member,
        items: [],
      };
    }
    acc[memberId].items.push(item);
    return acc;
  }, {} as Record<string, { member: AccountabilityItem['team_member']; items: AccountabilityItem[] }>);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">High</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="text-xs">Medium</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-xs">Low</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (item: AccountabilityItem) => {
    const isOverdue = item.due_date && isPast(parseISO(item.due_date)) && !isToday(parseISO(item.due_date));
    
    if (item.status === 'completed') {
      return <CheckCircle2 className="h-4 w-4 text-chart-2" />;
    }
    if (isOverdue) {
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
    if (item.status === 'in_progress') {
      return <Clock className="h-4 w-4 text-chart-4" />;
    }
    return <Target className="h-4 w-4 text-muted-foreground" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <DashboardLoader size="md" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-medium tabular-nums">{activeItems.length}</div>
            <div className="text-sm text-muted-foreground">Active Items</div>
          </CardContent>
        </Card>
        <Card className={overdueItems.length > 0 ? 'border-destructive' : ''}>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-medium tabular-nums ${overdueItems.length > 0 ? 'text-destructive' : ''}`}>
              {overdueItems.length}
            </div>
            <div className="text-sm text-muted-foreground">Overdue</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-medium tabular-nums text-chart-2">{completedThisWeek.length}</div>
            <div className="text-sm text-muted-foreground">Completed This Week</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grouped Items */}
      {Object.keys(groupedByMember).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {statusFilter === 'all' 
              ? "No accountability items yet. Create some from meeting details."
              : `No ${statusFilter.replace('_', ' ')} items.`
            }
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedByMember).map(([memberId, { member, items: memberItems }]) => (
          <Card key={memberId}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member?.photo_url || ''} />
                  <AvatarFallback>
                    {(member?.full_name || 'U').charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-base">
                  {member?.display_name || member?.full_name || 'Unknown'}
                </CardTitle>
                <Badge variant="outline" className="ml-auto">
                  {memberItems.length} item{memberItems.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {memberItems.map(item => {
                  const isOverdue = item.due_date && isPast(parseISO(item.due_date)) && !isToday(parseISO(item.due_date));
                  
                  return (
                    <div 
                      key={item.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        isOverdue && item.status !== 'completed' ? 'border-destructive/50 bg-destructive/5' : ''
                      }`}
                    >
                      {getStatusIcon(item)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium text-sm ${
                            item.status === 'completed' ? 'line-through text-muted-foreground' : ''
                          }`}>
                            {item.title}
                          </span>
                          {getPriorityBadge(item.priority)}
                        </div>
                        {item.due_date && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span className={isOverdue && item.status !== 'completed' ? 'text-destructive' : ''}>
                              Due: {formatDate(parseISO(item.due_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        )}
                      </div>
                      {item.meeting_id && (
                        <Button
                          size={tokens.button.inline}
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => navigate(`/dashboard/meeting/${item.meeting_id}`)}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
