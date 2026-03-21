import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, X, Users } from 'lucide-react';
import { useAvailableCoaches, useCreateMeeting } from '@/hooks/useOneOnOneMeetings';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const meetingTypes = [
  { value: 'coaching', label: 'Coaching Session' },
  { value: 'check_in', label: 'Check-in' },
  { value: 'feedback', label: 'Feedback Review' },
  { value: 'sas', label: 'Success Alignment Session (SAS)' },
  { value: 'other', label: 'Other' },
];

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00',
];

export default function ScheduleNewMeeting() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: coaches = [], isLoading: loadingCoaches } = useAvailableCoaches();
  const createMeeting = useCreateMeeting();

  // Coach mode: when a manager clicks "Schedule" for a specific staff member
  const preselectedStaffId = searchParams.get('staffId');

  // Fetch the staff member's profile if in coach mode
  const { data: staffProfile } = useQuery({
    queryKey: ['staff-profile-for-meeting', preselectedStaffId],
    queryFn: async () => {
      if (!preselectedStaffId) return null;
      const { data } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name')
        .eq('user_id', preselectedStaffId)
        .maybeSingle();
      return data;
    },
    enabled: !!preselectedStaffId,
  });

  const isCoachMode = !!preselectedStaffId;
  const staffName = staffProfile?.display_name || staffProfile?.full_name || 'Team Member';

  const [selectedCoach, setSelectedCoach] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [meetingType, setMeetingType] = useState('coaching');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isCoachMode) {
      // Coach mode: manager is the coach, staff member is the requester
      if (!meetingDate || !startTime) return;

      const [hours, minutes] = startTime.split(':').map(Number);
      const endHours = minutes >= 30 ? hours + 1 : hours;
      const endMinutes = minutes >= 30 ? '00' : '30';
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes}`;

      // Insert directly with correct roles
      supabase
        .from('one_on_one_meetings')
        .insert({
          requester_id: preselectedStaffId!,
          coach_id: user!.id,
          meeting_date: meetingDate,
          start_time: startTime,
          end_time: endTime,
          meeting_type: meetingType,
          notes: notes || null,
          status: 'confirmed', // Manager-scheduled = auto-confirmed
        })
        .select()
        .single()
        .then(({ error }) => {
          if (error) {
            console.error('Error creating meeting:', error);
          } else {
            navigate('/dashboard/schedule-meeting');
          }
        });

      return;
    }

    // Normal mode: staff requests meeting with a coach
    if (!selectedCoach || !meetingDate || !startTime) return;

    // Calculate end time (30 min meeting)
    const [hours, minutes] = startTime.split(':').map(Number);
    const endHours = minutes >= 30 ? hours + 1 : hours;
    const endMinutes = minutes >= 30 ? '00' : '30';
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes}`;

    createMeeting.mutate({
      coach_id: selectedCoach,
      meeting_date: meetingDate,
      start_time: startTime,
      end_time: endTime,
      meeting_type: meetingType,
      notes: notes || undefined,
    }, {
      onSuccess: () => {
        setSelectedCoach('');
        setMeetingDate('');
        setStartTime('');
        setMeetingType('coaching');
        setNotes('');
      },
    });
  };

  return (
    <DashboardLayout>
      <PlatformPageContainer maxWidth="narrow">
        <div className="space-y-6">
          <div>
            <Link to="/dashboard/schedule-meeting">
              <Button variant="ghost" size={tokens.button.card} className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Meetings Hub
              </Button>
            </Link>
            <h1 className="font-display text-3xl lg:text-4xl">Schedule Meeting</h1>
            <p className="text-muted-foreground mt-1">
              Request a 1:1 with a coach or manager.
            </p>
          </div>

          <Card className="relative">
            <button
              onClick={() => navigate('/dashboard/schedule-meeting')}
              className="absolute top-4 right-4 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <CardHeader>
              <CardTitle>{isCoachMode ? 'Schedule 1:1 Meeting' : 'Request a Meeting'}</CardTitle>
              <CardDescription>
                {isCoachMode
                  ? `Schedule a meeting with ${staffName}. This will be auto-confirmed.`
                  : 'Select a coach and time that works for you.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {isCoachMode ? (
                  <div className="space-y-2">
                    <Label>Meeting With</Label>
                    <div className="flex items-center gap-2 rounded-md border px-3 py-2 bg-muted/50">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{staffName}</span>
                      <Badge variant="outline" className="text-[10px] ml-auto">Auto-confirmed</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="coach">Select Coach</Label>
                    <Select value={selectedCoach} onValueChange={setSelectedCoach}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a coach or manager..." />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingCoaches ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : coaches.length === 0 ? (
                          <SelectItem value="none" disabled>No coaches available</SelectItem>
                        ) : (
                          coaches.map(coach => (
                            <SelectItem key={coach.user_id} value={coach.user_id}>
                              {coach.display_name || coach.full_name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Select value={startTime} onValueChange={setStartTime}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time..." />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map(time => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Meeting Type</Label>
                  <Select value={meetingType} onValueChange={setMeetingType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {meetingTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="What would you like to discuss?"
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={(isCoachMode ? false : !selectedCoach) || !meetingDate || !startTime || createMeeting.isPending}
                  className="w-full"
                >
                  {createMeeting.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    isCoachMode ? 'Schedule Meeting' : 'Request Meeting'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </PlatformPageContainer>
    </DashboardLayout>
  );
}
