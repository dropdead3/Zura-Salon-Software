import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus } from 'lucide-react';
import { useCreateMeetingRequest } from '@/hooks/useMeetingRequests';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function ManagerMeetingRequest() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [teamMemberId, setTeamMemberId] = useState('');
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [expiresAt, setExpiresAt] = useState('');
  
  const createRequest = useCreateMeetingRequest();

  // Fetch team members (all active employees except self)
  const { data: teamMembers = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['team-members', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name, photo_url')
        .eq('is_active', true)
        .neq('user_id', user!.id)
        .order('full_name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamMemberId || !reason.trim()) return;

    createRequest.mutate({
      team_member_id: teamMemberId,
      reason: reason.trim(),
      priority,
      expires_at: expiresAt || undefined,
    }, {
      onSuccess: () => {
        setTeamMemberId('');
        setReason('');
        setPriority('medium');
        setExpiresAt('');
        setOpen(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Request Meeting
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a Meeting</DialogTitle>
          <DialogDescription>
            Send a request to a team member asking them to schedule a 1:1 with you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-member">Team Member</Label>
            <Select value={teamMemberId} onValueChange={setTeamMemberId}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member..." />
              </SelectTrigger>
              <SelectContent>
                {loadingMembers ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : teamMembers.length === 0 ? (
                  <SelectItem value="none" disabled>No team members found</SelectItem>
                ) : (
                  teamMembers.map(member => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {formatName(member)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What would you like to discuss?"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires">Schedule By (Optional)</Label>
              <Input
                id="expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!teamMemberId || !reason.trim() || createRequest.isPending}
          >
            {createRequest.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Request'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
