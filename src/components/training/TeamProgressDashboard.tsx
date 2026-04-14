import { useState } from 'react';
import { usePaginatedSort } from '@/hooks/usePaginatedSort';
import { TablePagination } from '@/components/ui/TablePagination';
import { SortableColumnHeader } from '@/components/ui/SortableColumnHeader';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Search, TrendingUp, Users, Video, CheckCircle } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';

interface TeamMember {
  user_id: string;
  display_name: string;
  email: string | null;
}

interface TrainingVideo {
  id: string;
  title: string;
  category: string;
  required_for_roles: string[] | null;
}

interface ProgressRecord {
  user_id: string;
  video_id: string;
  completed_at: string | null;
}

interface UserRole {
  user_id: string;
  role: string;
}

const categoryLabels: Record<string, string> = {
  onboarding: 'Onboarding',
  client_engine: 'Client Engine Program',
  technique: 'Technique',
  product: 'Product Knowledge',
  'client-service': 'Client Service',
};

export function TeamProgressDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Fetch team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members-progress'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, email')
        .eq('is_active', true)
        .order('display_name');
      if (error) throw error;
      return data as TeamMember[];
    },
  });

  // Fetch videos
  const { data: videos = [] } = useQuery({
    queryKey: ['training-videos-progress'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_videos')
        .select('id, title, category, required_for_roles')
        .eq('is_active', true)
        .order('order_index');
      if (error) throw error;
      return data as TrainingVideo[];
    },
  });

  // Fetch all progress
  const { data: progressData = [], isLoading } = useQuery({
    queryKey: ['training-progress-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_progress')
        .select('user_id, video_id, completed_at');
      if (error) throw error;
      return data as ProgressRecord[];
    },
  });

  // Fetch user roles
  const { data: userRoles = [] } = useQuery({
    queryKey: ['user-roles-progress'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (error) throw error;
      return data as UserRole[];
    },
  });

  // Calculate stats
  const getVideosForUser = (userId: string) => {
    const roles = userRoles.filter((ur) => ur.user_id === userId).map((ur) => ur.role);
    return videos.filter((v) => {
      if (!v.required_for_roles?.length) return true;
      return v.required_for_roles.some((r) => roles.includes(r));
    });
  };

  const getCompletedCount = (userId: string) => {
    return progressData.filter(
      (p) => p.user_id === userId && p.completed_at
    ).length;
  };

  const getMemberProgress = (userId: string) => {
    const userVideos = getVideosForUser(userId);
    const completed = progressData.filter(
      (p) =>
        p.user_id === userId &&
        p.completed_at &&
        userVideos.some((v) => v.id === p.video_id)
    ).length;
    return {
      total: userVideos.length,
      completed,
      percentage: userVideos.length > 0 ? (completed / userVideos.length) * 100 : 0,
    };
  };

  // Filter videos by category
  const filteredVideos =
    categoryFilter === 'all'
      ? videos
      : videos.filter((v) => v.category === categoryFilter);

  // Filter team members by search
  const filteredMembers = teamMembers.filter((m) =>
    m.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const membersWithProgress = filteredMembers.map((m) => ({
    ...m,
    ...getMemberProgress(m.user_id),
  }));

  const {
    paginatedData: paginatedMembers,
    currentPage: membersPage,
    setCurrentPage: setMembersPage,
    totalPages: membersTotalPages,
    totalItems: membersTotalItems,
    showingFrom: membersShowingFrom,
    showingTo: membersShowingTo,
    sortField: membersSortField,
    toggleSort: toggleMembersSort,
  } = usePaginatedSort({
    data: membersWithProgress,
    defaultPageSize: 25,
    defaultSortField: 'display_name' as any,
    defaultSortDirection: 'asc',
  });

  // Overall stats
  const totalCompletions = progressData.filter((p) => p.completed_at).length;
  const totalPossible = teamMembers.reduce((acc, m) => {
    return acc + getVideosForUser(m.user_id).length;
  }, 0);
  const overallPercentage = totalPossible > 0 ? (totalCompletions / totalPossible) * 100 : 0;

  // Category breakdown
  const categoryStats = Object.keys(categoryLabels).map((cat) => {
    const catVideos = videos.filter((v) => v.category === cat);
    const catCompletions = progressData.filter(
      (p) => p.completed_at && catVideos.some((v) => v.id === p.video_id)
    ).length;
    const catTotal = catVideos.length * teamMembers.length;
    return {
      category: cat,
      label: categoryLabels[cat],
      completed: catCompletions,
      total: catTotal,
      percentage: catTotal > 0 ? (catCompletions / catTotal) * 100 : 0,
    };
  });

  if (isLoading) {
    return <DashboardLoader size="lg" className="py-20" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-xl">Team Progress</h2>
        <p className="text-sm text-muted-foreground">
          Track training completion across the team
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-display">{Math.round(overallPercentage)}%</p>
                <p className="text-xs text-muted-foreground">Overall Completion</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10 text-green-600">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-display">{totalCompletions}</p>
                <p className="text-xs text-muted-foreground">Total Completions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-display">{teamMembers.length}</p>
                <p className="text-xs text-muted-foreground">Team Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-display">{videos.length}</p>
                <p className="text-xs text-muted-foreground">Training Videos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress by Category</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {categoryStats.map((stat) => (
            <div key={stat.category} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{stat.label}</span>
                <span className="text-muted-foreground">
                  {stat.completed} / {stat.total} ({Math.round(stat.percentage)}%)
                </span>
              </div>
              <Progress value={stat.percentage} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Individual Progress Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-base">Individual Progress</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="pl-9 w-48"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Member</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Completed</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => {
                const memberProgress = getMemberProgress(member.user_id);
                return (
                  <TableRow key={member.user_id}>
                    <TableCell className="font-medium">
                      {member.display_name}
                    </TableCell>
                    <TableCell className="text-center">
                      {memberProgress.total}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          memberProgress.completed === memberProgress.total
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {memberProgress.completed}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Progress
                          value={memberProgress.percentage}
                          className="h-2 flex-1 max-w-32"
                        />
                        <span className="text-sm text-muted-foreground w-12">
                          {Math.round(memberProgress.percentage)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
