import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Users, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Pause,
  RefreshCw,
  Flame,
  Loader2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Plus,
  Calendar,
  Trophy,
  Target,
  BookOpen,
  FileText
} from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { ClientEngineOverview } from '@/components/dashboard/ClientEngineOverview';
import { toast } from 'sonner';
import { useFormatDate } from '@/hooks/useFormatDate';
import { BentoGrid } from '@/components/ui/bento-grid';
import { PageExplainer } from '@/components/ui/PageExplainer';

interface TeamMember {
  user_id: string;
  enrollment_id: string;
  full_name: string;
  display_name: string | null;
  location_id: string | null;
  current_day: number;
  streak_count: number;
  status: string;
  restart_count: number;
  start_date: string;
  last_completion_date: string | null;
}

interface CoachNote {
  id: string;
  note_text: string;
  note_type: string | null;
  created_at: string;
}

interface WeeklyWin {
  id: string;
  week_number: number;
  wins_this_week: string | null;
  what_worked: string | null;
  bottleneck: string | null;
  adjustment_for_next_week: string | null;
  is_submitted: boolean;
  submitted_at: string | null;
}

interface HandbookStatus {
  total: number;
  acknowledged: number;
  pending: string[];
}

type FilterStatus = 'all' | 'active' | 'paused' | 'at-risk' | 'restarted';

export default function TeamOverview() {
  const { formatDate } = useFormatDate();
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [memberNotes, setMemberNotes] = useState<Record<string, CoachNote[]>>({});
  const [memberWeeklyWins, setMemberWeeklyWins] = useState<Record<string, WeeklyWin[]>>({});
  const [memberHandbooks, setMemberHandbooks] = useState<Record<string, HandbookStatus>>({});
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('stylist_program_enrollment')
      .select('*');

    if (enrollmentError) {
      console.error('Error fetching enrollments:', enrollmentError);
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
      .select('user_id, full_name, display_name, location_id')
      .in('user_id', userIds);

    const team: TeamMember[] = (enrollments || []).map(enrollment => {
      const profile = profiles?.find(p => p.user_id === enrollment.user_id);
      return {
        user_id: enrollment.user_id,
        enrollment_id: enrollment.id,
        full_name: profile?.full_name || 'Unknown',
        display_name: profile?.display_name,
        location_id: profile?.location_id,
        current_day: enrollment.current_day,
        streak_count: enrollment.streak_count,
        status: enrollment.status,
        restart_count: enrollment.restart_count,
        start_date: enrollment.start_date,
        last_completion_date: enrollment.last_completion_date,
      };
    });

    setMembers(team);
    setLoading(false);
  };

  const fetchMemberDetails = async (enrollmentId: string, userId: string) => {
    // Fetch notes, weekly wins, and handbook status in parallel
    const [notesResult, weeklyWinsResult, handbooksResult, acknowledgementsResult] = await Promise.all([
      supabase
        .from('coach_notes')
        .select('*')
        .eq('enrollment_id', enrollmentId)
        .order('created_at', { ascending: false }),
      supabase
        .from('weekly_wins_reports')
        .select('*')
        .eq('enrollment_id', enrollmentId)
        .eq('is_submitted', true)
        .order('week_number', { ascending: false }),
      supabase
        .from('handbooks')
        .select('id, title, visible_to_roles')
        .eq('is_active', true),
      supabase
        .from('handbook_acknowledgments')
        .select('handbook_id')
        .eq('user_id', userId)
    ]);

    setMemberNotes(prev => ({ ...prev, [enrollmentId]: (notesResult.data || []) as CoachNote[] }));
    setMemberWeeklyWins(prev => ({ ...prev, [enrollmentId]: (weeklyWinsResult.data || []) as WeeklyWin[] }));

    // Get user's roles to filter handbooks
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    const roles = userRoles?.map(r => r.role) || [];
    const userHandbooks = (handbooksResult.data || []).filter((h: any) => {
      const visibleRoles = h.visible_to_roles || [];
      return roles.some(role => visibleRoles.includes(role));
    });
    
    const acknowledgedIds = (acknowledgementsResult.data || []).map(a => a.handbook_id);
    const pendingHandbooks = userHandbooks.filter(h => !acknowledgedIds.includes(h.id));
    
    setMemberHandbooks(prev => ({
      ...prev,
      [enrollmentId]: {
        total: userHandbooks.length,
        acknowledged: acknowledgedIds.filter(id => userHandbooks.some((h: any) => h.id === id)).length,
        pending: pendingHandbooks.map((h: any) => h.title)
      }
    }));
  };

  const handleExpandMember = (member: TeamMember) => {
    if (expandedMember === member.enrollment_id) {
      setExpandedMember(null);
    } else {
      setExpandedMember(member.enrollment_id);
      fetchMemberDetails(member.enrollment_id, member.user_id);
    }
    setNewNote('');
  };

  const addNote = async (enrollmentId: string, userId: string) => {
    if (!newNote.trim() || !user) return;

    setSavingNote(true);
    const { error } = await supabase
      .from('coach_notes')
      .insert({
        enrollment_id: enrollmentId,
        coach_user_id: user.id,
        note_text: newNote.trim(),
        note_type: 'general',
      });

    if (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    } else {
      toast.success('Note added');
      setNewNote('');
      fetchMemberDetails(enrollmentId, userId);
    }
    setSavingNote(false);
  };

  const getStatusBadge = (member: TeamMember) => {
    if (member.status === 'paused') {
      return (
        <span className="px-2 py-1 bg-yellow-500/10 text-yellow-600 text-xs font-display tracking-wide flex items-center gap-1">
          <Pause className="w-3 h-3" />
          PAUSED
        </span>
      );
    }
    if (member.restart_count > 0) {
      return (
        <span className="px-2 py-1 bg-orange-500/10 text-orange-600 text-xs font-display tracking-wide flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />
          RESTARTED {member.restart_count}x
        </span>
      );
    }
    if (member.streak_count >= 7) {
      return (
        <span className="px-2 py-1 bg-green-500/10 text-green-600 text-xs font-display tracking-wide flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          ON TRACK
        </span>
      );
    }
    if (member.streak_count < 3 && member.current_day > 3) {
      return (
        <span className="px-2 py-1 bg-red-500/10 text-red-600 text-xs font-display tracking-wide flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          AT RISK
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-foreground/5 text-foreground text-xs font-display tracking-wide">
        ACTIVE
      </span>
    );
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      member.full_name.toLowerCase().includes(search.toLowerCase()) ||
      member.display_name?.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;

    switch (statusFilter) {
      case 'active':
        return member.status === 'active';
      case 'paused':
        return member.status === 'paused';
      case 'at-risk':
        return member.streak_count < 3 && member.current_day > 3;
      case 'restarted':
        return member.restart_count > 0;
      default:
        return true;
    }
  });

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <DashboardPageHeader
            title="New-Client Engine Program Team Overview"
            description="Monitor stylist progress, view Weekly Wins, and add coaching notes."
          />
        <PageExplainer pageId="team-overview" />
        </div>

        {/* Client Engine Overview Card */}
        <ClientEngineOverview />

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stylists</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="at-risk">At Risk</SelectItem>
              <SelectItem value="restarted">Restarted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Overview */}
        <BentoGrid maxPerRow={4} gap="gap-4" className="mb-8">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground font-display tracking-wide mb-1">
              TOTAL ENROLLED
            </p>
            <p className="font-display text-2xl">{members.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground font-display tracking-wide mb-1">
              ACTIVE
            </p>
            <p className="font-display text-2xl text-green-600">
              {members.filter(m => m.status === 'active').length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground font-display tracking-wide mb-1">
              AT RISK
            </p>
            <p className="font-display text-2xl text-red-600">
              {members.filter(m => m.streak_count < 3 && m.current_day > 3).length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground font-display tracking-wide mb-1">
              PAUSED
            </p>
            <p className="font-display text-2xl text-yellow-600">
              {members.filter(m => m.status === 'paused').length}
            </p>
          </Card>
        </BentoGrid>

        {/* Team List */}
        {loading ? (
          <DashboardLoader size="lg" className="py-20" />
        ) : filteredMembers.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground font-sans">
              No team members found.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredMembers.map((member) => (
              <Collapsible 
                key={member.user_id} 
                open={expandedMember === member.enrollment_id}
                onOpenChange={() => handleExpandMember(member)}
              >
                <Card className="overflow-hidden">
                  <CollapsibleTrigger className="w-full p-4 lg:p-6 text-left">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-muted flex items-center justify-center font-display text-lg">
                        {member.full_name.charAt(0)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-sans font-medium truncate">
                          {formatName(member)}
                        </p>
                        <p className="text-xs text-muted-foreground font-sans">
                          Started {formatDate(new Date(member.start_date), 'MMM d, yyyy')}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="hidden lg:flex items-center gap-8">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground font-display tracking-wide">DAY</p>
                          <p className="font-display text-lg">{member.current_day}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground font-display tracking-wide">STREAK</p>
                          <p className="font-display text-lg flex items-center gap-1">
                            <Flame className="w-4 h-4 text-orange-500" />
                            {member.streak_count}
                          </p>
                        </div>
                      </div>

                      {/* Status */}
                      {getStatusBadge(member)}

                      {/* Expand Icon */}
                      <div className="ml-2">
                        {expandedMember === member.enrollment_id ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 lg:px-6 pb-6 border-t border-border pt-6">
                      <div className="grid lg:grid-cols-2 gap-6">
                        {/* Coach Notes Section */}
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <MessageSquare className="w-4 h-4" />
                            <h3 className="font-display text-sm tracking-wide">COACH NOTES</h3>
                          </div>

                          {/* Add Note Form */}
                          <div className="mb-4">
                            <Textarea
                              placeholder="Add a coaching note..."
                              value={newNote}
                              onChange={(e) => setNewNote(e.target.value)}
                              className="mb-2 min-h-[80px]"
                            />
                            <Button
                              size="sm"
                              onClick={() => addNote(member.enrollment_id, member.user_id)}
                              disabled={!newNote.trim() || savingNote}
                            >
                              {savingNote ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Plus className="w-4 h-4 mr-2" />
                              )}
                              Add Note
                            </Button>
                          </div>

                          {/* Notes List */}
                          <div className="space-y-3 max-h-[300px] overflow-y-auto">
                            {memberNotes[member.enrollment_id]?.length === 0 ? (
                              <p className="text-sm text-muted-foreground font-sans">
                                No notes yet.
                              </p>
                            ) : (
                              memberNotes[member.enrollment_id]?.map((note) => (
                                <div key={note.id} className="bg-muted/50 p-3 text-sm">
                                  <p className="font-sans">{note.note_text}</p>
                                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Weekly Wins Section */}
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <Trophy className="w-4 h-4" />
                            <h3 className="font-display text-sm tracking-wide">WEEKLY WINS REPORTS</h3>
                          </div>

                          <div className="space-y-4 max-h-[400px] overflow-y-auto">
                            {memberWeeklyWins[member.enrollment_id]?.length === 0 ? (
                              <p className="text-sm text-muted-foreground font-sans">
                                No Weekly Wins submitted yet.
                              </p>
                            ) : (
                              memberWeeklyWins[member.enrollment_id]?.map((report) => (
                                <div key={report.id} className="bg-muted/50 p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="font-display text-sm">WEEK {report.week_number}</span>
                                    {report.submitted_at && (
                                      <span className="text-xs text-muted-foreground">
                                        {formatDate(new Date(report.submitted_at), 'MMM d')}
                                      </span>
                                    )}
                                  </div>

                                  {report.wins_this_week && (
                                    <div className="mb-3">
                                      <p className="text-xs text-muted-foreground font-display tracking-wide mb-1">
                                        WINS
                                      </p>
                                      <p className="text-sm font-sans">{report.wins_this_week}</p>
                                    </div>
                                  )}

                                  {report.what_worked && (
                                    <div className="mb-3">
                                      <p className="text-xs text-muted-foreground font-display tracking-wide mb-1">
                                        WHAT WORKED
                                      </p>
                                      <p className="text-sm font-sans">{report.what_worked}</p>
                                    </div>
                                  )}

                                  {report.bottleneck && (
                                    <div className="mb-3">
                                      <p className="text-xs text-muted-foreground font-display tracking-wide mb-1">
                                        BOTTLENECK
                                      </p>
                                      <p className="text-sm font-sans">{report.bottleneck}</p>
                                    </div>
                                  )}

                                  {report.adjustment_for_next_week && (
                                    <div>
                                      <p className="text-xs text-muted-foreground font-display tracking-wide mb-1">
                                        ADJUSTMENT
                                      </p>
                                      <p className="text-sm font-sans">{report.adjustment_for_next_week}</p>
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Handbook Acknowledgments Section */}
                      {memberHandbooks[member.enrollment_id] && (
                        <div className="mt-6 pt-6 border-t border-border">
                          <div className="flex items-center gap-2 mb-4">
                            <BookOpen className="w-4 h-4" />
                            <h3 className="font-display text-sm tracking-wide">HANDBOOK ACKNOWLEDGMENTS</h3>
                          </div>
                          
                          {memberHandbooks[member.enrollment_id].total === 0 ? (
                            <p className="text-sm text-muted-foreground font-sans">
                              No handbooks assigned to this role.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex items-center gap-4">
                                <Progress 
                                  value={(memberHandbooks[member.enrollment_id].acknowledged / memberHandbooks[member.enrollment_id].total) * 100} 
                                  className="flex-1 h-2"
                                />
                                <span className="text-sm font-sans text-muted-foreground whitespace-nowrap">
                                  {memberHandbooks[member.enrollment_id].acknowledged} / {memberHandbooks[member.enrollment_id].total}
                                </span>
                              </div>
                              
                              {memberHandbooks[member.enrollment_id].pending.length > 0 ? (
                                <div className="bg-amber-500/10 p-3 rounded">
                                  <p className="text-xs font-display text-amber-600 mb-2">PENDING ACKNOWLEDGMENTS</p>
                                  <ul className="space-y-1">
                                    {memberHandbooks[member.enrollment_id].pending.map((title, idx) => (
                                      <li key={idx} className="text-sm font-sans flex items-center gap-2">
                                        <FileText className="w-3 h-3 text-amber-600" />
                                        {title}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : (
                                <div className="bg-green-500/10 p-3 rounded flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  <span className="text-sm font-sans text-green-600">All handbooks acknowledged</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quick Stats */}
                      <div className="mt-6 pt-6 border-t border-border">
                        <BentoGrid maxPerRow={5} gap="gap-4">
                          <div className="flex items-center gap-3">
                            <Target className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground font-display">PROGRESS</p>
                              <p className="font-sans">{Math.round((member.current_day / 75) * 100)}%</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <RefreshCw className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground font-display">RESTARTS</p>
                              <p className="font-sans">{member.restart_count}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground font-display">LAST ACTIVE</p>
                              <p className="font-sans">
                                {member.last_completion_date 
                                  ? formatDate(new Date(member.last_completion_date), 'MMM d')
                                  : 'Never'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Trophy className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground font-display">WEEKLY WINS</p>
                              <p className="font-sans">{memberWeeklyWins[member.enrollment_id]?.length || 0}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <BookOpen className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground font-display">HANDBOOKS</p>
                              <p className="font-sans">
                                {memberHandbooks[member.enrollment_id] 
                                  ? `${memberHandbooks[member.enrollment_id].acknowledged}/${memberHandbooks[member.enrollment_id].total}`
                                  : '—'}
                              </p>
                            </div>
                          </div>
                        </BentoGrid>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
