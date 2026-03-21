import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Plus,
  Search,
  CalendarIcon,
  Loader2,
  UserPlus,
  Trash2,
  Video,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface Assignment {
  id: string;
  video_id: string;
  user_id: string;
  assigned_by: string;
  due_date: string | null;
  is_required: boolean;
  notes: string | null;
  created_at: string;
}

interface TeamMember {
  user_id: string;
  display_name: string;
  email: string | null;
}

interface TrainingVideo {
  id: string;
  title: string;
  category: string;
}

export function IndividualAssignments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteAssignment, setDeleteAssignment] = useState<Assignment | null>(null);

  // Form state
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedVideo, setSelectedVideo] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState('');

  // Fetch team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members-for-assignment'],
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
    queryKey: ['training-videos-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_videos')
        .select('id, title, category')
        .eq('is_active', true)
        .order('title');
      if (error) throw error;
      return data as TrainingVideo[];
    },
  });

  // Fetch existing assignments
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['training-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_assignments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Assignment[];
    },
  });

  // Fetch progress to show completion status
  const { data: progress = [] } = useQuery({
    queryKey: ['training-progress-for-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_progress')
        .select('user_id, video_id, completed_at');
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('training_assignments').insert({
        video_id: selectedVideo,
        user_id: selectedUser,
        assigned_by: user.id,
        due_date: dueDate?.toISOString() || null,
        notes: notes || null,
        is_required: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-assignments'] });
      toast.success('Training assigned');
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('This training is already assigned to this user');
      } else {
        toast.error('Failed to assign training');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_assignments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-assignments'] });
      toast.success('Assignment removed');
      setDeleteAssignment(null);
    },
    onError: () => {
      toast.error('Failed to remove assignment');
    },
  });

  const resetForm = () => {
    setSelectedUser('');
    setSelectedVideo('');
    setDueDate(undefined);
    setNotes('');
  };

  const getTeamMemberName = (userId: string) => {
    return teamMembers.find((m) => m.user_id === userId)?.display_name || 'Unknown';
  };

  const getVideoTitle = (videoId: string) => {
    return videos.find((v) => v.id === videoId)?.title || 'Unknown Video';
  };

  const isCompleted = (userId: string, videoId: string) => {
    return progress.some(
      (p) => p.user_id === userId && p.video_id === videoId && p.completed_at
    );
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  // Filter assignments by search
  const filteredAssignments = assignments.filter((a) => {
    const memberName = getTeamMemberName(a.user_id).toLowerCase();
    const videoTitle = getVideoTitle(a.video_id).toLowerCase();
    return (
      memberName.includes(searchTerm.toLowerCase()) ||
      videoTitle.includes(searchTerm.toLowerCase())
    );
  });

  // Group by user
  const groupedByUser = filteredAssignments.reduce((acc, assignment) => {
    const userId = assignment.user_id;
    if (!acc[userId]) acc[userId] = [];
    acc[userId].push(assignment);
    return acc;
  }, {} as Record<string, Assignment[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl">Individual Assignments</h2>
          <p className="text-sm text-muted-foreground">
            Assign specific training to team members
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Assign Training
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name or video..."
          className="pl-9"
        />
      </div>

      {/* Assignments by User */}
      {Object.keys(groupedByUser).length === 0 ? (
        <Card className="p-12 text-center">
          <UserPlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No individual assignments yet</p>
          <Button
            onClick={() => setDialogOpen(true)}
            variant="outline"
            className="mt-4"
          >
            Assign your first training
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByUser).map(([userId, userAssignments]) => (
            <Card key={userId}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">
                  {getTeamMemberName(userId)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {userAssignments.map((assignment) => {
                  const completed = isCompleted(userId, assignment.video_id);
                  const overdue = !completed && isOverdue(assignment.due_date);

                  return (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            completed
                              ? 'bg-green-500/10 text-green-600'
                              : overdue
                              ? 'bg-red-500/10 text-red-600'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {completed ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Video className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {getVideoTitle(assignment.video_id)}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {assignment.due_date && (
                              <span
                                className={`flex items-center gap-1 ${
                                  overdue && !completed ? 'text-red-600' : ''
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                Due {format(new Date(assignment.due_date), 'MMM d')}
                              </span>
                            )}
                            {completed && (
                              <Badge variant="secondary" className="text-xs">
                                Completed
                              </Badge>
                            )}
                            {overdue && !completed && (
                              <Badge variant="destructive" className="text-xs">
                                Overdue
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteAssignment(assignment)}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Assignment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Training</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Team Member */}
            <div className="space-y-2">
              <Label>Team Member *</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Video */}
            <div className="space-y-2">
              <Label>Training Video *</Label>
              <Select value={selectedVideo} onValueChange={setSelectedVideo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select training video" />
                </SelectTrigger>
                <SelectContent>
                  {videos.map((video) => (
                    <SelectItem key={video.id} value={video.id}>
                      {video.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label>Due Date (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional context..."
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!selectedUser || !selectedVideo || createMutation.isPending}
              >
                {createMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteAssignment}
        onOpenChange={() => setDeleteAssignment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this training assignment. Any existing progress will
              be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteAssignment && deleteMutation.mutate(deleteAssignment.id)
              }
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
