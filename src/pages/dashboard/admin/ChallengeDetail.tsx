import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { differenceInDays, isPast } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChallengeLeaderboard } from '@/components/challenges/ChallengeLeaderboard';
import { 
  ArrowLeft, Trophy, Clock, Target, Users, MapPin,
  Bell, DollarSign, UserPlus, Percent, GraduationCap,
  Play, Square, MoreVertical, Trash2, Edit, Loader2, Gift
} from 'lucide-react';
import { 
  useChallenge, 
  useChallengeParticipants, 
  useUpdateChallenge,
  useDeleteChallenge 
} from '@/hooks/useChallenges';
import { useAuth } from '@/contexts/AuthContext';

const metricIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  bells: Bell,
  retail: DollarSign,
  new_clients: UserPlus,
  retention: Percent,
  training: GraduationCap,
  tips: DollarSign,
};

const metricLabels: Record<string, string> = {
  bells: 'Bells Rung',
  retail: 'Retail Sales',
  new_clients: 'New Clients',
  retention: 'Retention Rate',
  training: 'Trainings Completed',
  tips: 'Tips Earned',
};

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  individual: Trophy,
  team: Users,
  location: MapPin,
};

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-green-500/10 text-green-600 dark:text-green-400',
  completed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

export default function ChallengeDetail() {
  const { formatDate } = useFormatDate();
  const { formatNumber } = useFormatNumber();
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { data: challenge, isLoading } = useChallenge(challengeId);
  const { data: participants = [] } = useChallengeParticipants(challengeId);
  const updateChallenge = useUpdateChallenge();
  const deleteChallenge = useDeleteChallenge();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!challenge) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium mb-2">Challenge not found</h2>
          <Button onClick={() => navigate('/dashboard/admin/challenges')}>Back to Challenges</Button>
        </div>
      </DashboardLayout>
    );
  }

  const MetricIcon = metricIcons[challenge.metric_type] || Target;
  const TypeIcon = typeIcons[challenge.challenge_type] || Trophy;
  const daysRemaining = differenceInDays(new Date(challenge.end_date), new Date());
  const isEnded = isPast(new Date(challenge.end_date));

  const handleStatusChange = async (newStatus: 'active' | 'completed' | 'cancelled') => {
    await updateChallenge.mutateAsync({
      id: challenge.id,
      updates: { status: newStatus },
    });
  };

  const handleDelete = async () => {
    await deleteChallenge.mutateAsync(challenge.id);
    navigate('/dashboard/admin/challenges');
  };

  // Calculate totals
  const totalValue = participants.reduce((sum, p) => sum + (p.current_value || 0), 0);
  const topParticipant = participants[0];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        <DashboardPageHeader
          title={challenge.title}
          description={`${metricLabels[challenge.metric_type]} · ${challenge.challenge_type}`}
          actions={
            <div className="flex items-center gap-3">
              <Badge className={statusColors[challenge.status]}>
                {challenge.status}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {challenge.status === 'draft' && (
                    <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                      <Play className="w-4 h-4 mr-2" />
                      Start Challenge
                    </DropdownMenuItem>
                  )}
                  {challenge.status === 'active' && (
                    <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
                      <Square className="w-4 h-4 mr-2" />
                      End Challenge
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {challenge.description && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-muted-foreground">{challenge.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Leaderboard */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChallengeLeaderboard
                  challenge={challenge}
                  participants={participants}
                  currentUserId={user?.id}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Challenge Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Challenge Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Dates */}
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Duration</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(new Date(challenge.start_date), 'MMM d')} - {formatDate(new Date(challenge.end_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                {/* Time remaining */}
                {challenge.status === 'active' && !isEnded && (
                  <div className="bg-primary/5 rounded-lg p-3">
                    <p className="text-sm font-medium">{daysRemaining} days remaining</p>
                    <Progress 
                      value={100 - (daysRemaining / differenceInDays(new Date(challenge.end_date), new Date(challenge.start_date)) * 100)} 
                      className="h-1.5 mt-2"
                    />
                  </div>
                )}

                {/* Goal */}
                {challenge.goal_value && (
                  <div className="flex items-center gap-3">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Goal</p>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(challenge.goal_value)} {metricLabels[challenge.metric_type]}
                      </p>
                    </div>
                  </div>
                )}

                {/* Participants */}
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Participants</p>
                    <p className="text-xs text-muted-foreground">
                      {participants.length} team member{participants.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Stats */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Challenge Stats</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-lg font-display">{formatNumber(totalValue)}</p>
                      <p className="text-[10px] text-muted-foreground">Total Progress</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-lg font-display">
                        {topParticipant?.current_value != null ? formatNumber(topParticipant.current_value) : 0}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Top Score</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Prize */}
            {challenge.prize_description && (
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Gift className="w-5 h-5 text-amber-500" />
                    Prize
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{challenge.prize_description}</p>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            {challenge.status === 'draft' && (
              <Button 
                className="w-full" 
                onClick={() => handleStatusChange('active')}
                disabled={updateChallenge.isPending}
              >
                {updateChallenge.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Play className="w-4 h-4 mr-2" />
                Start Challenge
              </Button>
            )}
            {challenge.status === 'active' && (
              <Button 
                variant="outline"
                className="w-full" 
                onClick={() => handleStatusChange('completed')}
                disabled={updateChallenge.isPending}
              >
                {updateChallenge.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Square className="w-4 h-4 mr-2" />
                End Challenge
              </Button>
            )}
          </div>
        </div>

        {/* Delete Confirmation */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Challenge</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{challenge.title}"? This will remove all participant data and cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteChallenge.isPending}
              >
                {deleteChallenge.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
