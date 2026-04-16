import { useState, useMemo } from 'react';
import { format, addMinutes, parse } from 'date-fns';
import { useOrgNow } from '@/hooks/useOrgNow';
import { AnimatePresence, motion } from 'framer-motion';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  User,
  Handshake,
  GraduationCap,
  ClipboardList,
  CalendarIcon,
  MapPin,
  Video,
  Monitor,
  Check,
  Search,
  AlertTriangle,
  Loader2,
  X,
  Bookmark,
  BookmarkPlus,
  type LucideIcon,
} from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocations } from '@/hooks/useLocations';
import { useCreateMeeting, type MeetingType, type MeetingMode } from '@/hooks/useAdminMeetings';
import { useMeetingConflicts } from '@/hooks/useMeetingConflicts';
import { useMeetingTemplates, useCreateMeetingTemplate, type MeetingTemplate } from '@/hooks/useMeetingTemplates';
import { useOptimalMeetingTimes } from '@/hooks/useOptimalMeetingTimes';
import { AttendeeAvailabilityOverlay } from './AttendeeAvailabilityOverlay';

const MEETING_TYPES: { value: MeetingType; label: string; icon: LucideIcon; description: string }[] = [
  { value: 'one_on_one', label: '1-on-1', icon: User, description: 'Performance review, coaching, check-in' },
  { value: 'interview', label: 'Interview', icon: Handshake, description: 'New hire, candidate screening' },
  { value: 'manager_meeting', label: 'Team Meeting', icon: Users, description: 'Manager sync, team huddle' },
  { value: 'training', label: 'Training', icon: GraduationCap, description: 'Skills development, onboarding' },
  { value: 'other', label: 'Other', icon: ClipboardList, description: 'General scheduling' },
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

const TIME_SLOTS: string[] = [];
for (let h = 7; h < 21; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
}

type WizardStep = 'type' | 'attendees' | 'datetime' | 'location' | 'confirm';
const STEPS: WizardStep[] = ['type', 'attendees', 'datetime', 'location', 'confirm'];

interface MeetingSchedulerWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  defaultTime?: string;
}

export function MeetingSchedulerWizard({ open, onOpenChange, defaultDate, defaultTime }: MeetingSchedulerWizardProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const { user } = useAuth();
  const orgId = effectiveOrganization?.id;
  const { data: locations = [] } = useLocations();
  const createMeeting = useCreateMeeting();
  const { data: templates = [] } = useMeetingTemplates();
  const createTemplate = useCreateMeetingTemplate();

  // Wizard state
  const { todayStr, todayDate } = useOrgNow();
  const [step, setStep] = useState<WizardStep>('type');
  const [meetingType, setMeetingType] = useState<MeetingType | null>(null);
  const [title, setTitle] = useState('');
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate || todayDate);
  const [startTime, setStartTime] = useState(defaultTime || '10:00');
  const [duration, setDuration] = useState(30);
  const [meetingMode, setMeetingMode] = useState<MeetingMode>('in_person');
  const [locationId, setLocationId] = useState<string>('');
  const [videoLink, setVideoLink] = useState('');
  const [notes, setNotes] = useState('');
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  // Calculate end time
  const endTime = useMemo(() => {
    try {
      const start = parse(startTime, 'HH:mm', new Date());
      const end = addMinutes(start, duration);
      return format(end, 'HH:mm');
    } catch {
      return startTime;
    }
  }, [startTime, duration]);

  // Fetch team members for attendee selection
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['meeting-team-members', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url, email')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('is_approved', true)
        .order('display_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Filter team members (exclude self)
  const filteredMembers = useMemo(() => {
    return teamMembers.filter(m => {
      if (m.user_id === user?.id) return false;
      if (!attendeeSearch) return true;
      const name = (m.display_name || m.full_name || '').toLowerCase();
      return name.includes(attendeeSearch.toLowerCase());
    });
  }, [teamMembers, attendeeSearch, user?.id]);

  // Conflict detection
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const { conflicts, getConflictsForUser, hasConflicts } = useMeetingConflicts(
    dateStr,
    startTime,
    endTime,
    selectedAttendees,
    step === 'datetime' || step === 'confirm',
  );

  // Optimal time suggestions
  const { suggestions } = useOptimalMeetingTimes(
    dateStr,
    selectedAttendees,
    duration,
    step === 'datetime' && selectedAttendees.length > 0,
  );

  const stepIndex = STEPS.indexOf(step);

  const canProceed = () => {
    switch (step) {
      case 'type': return !!meetingType;
      case 'attendees': return selectedAttendees.length > 0;
      case 'datetime': return !!selectedDate && !!startTime;
      case 'location': return meetingMode === 'video' ? true : !!locationId;
      case 'confirm': return !!title;
      default: return false;
    }
  };

  const goNext = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const handleSubmit = async () => {
    if (!title || !meetingType) return;

    createMeeting.mutate({
      title,
      meeting_type: meetingType,
      start_date: dateStr,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: duration,
      meeting_mode: meetingMode,
      location_id: meetingMode !== 'video' ? locationId : null,
      video_link: meetingMode !== 'in_person' ? videoLink : null,
      notes: notes || null,
      attendee_user_ids: selectedAttendees,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        resetWizard();
      },
    });
  };

  const resetWizard = () => {
    setStep('type');
    setMeetingType(null);
    setTitle('');
    setSelectedAttendees([]);
    setSelectedDate(defaultDate || todayDate);
    setStartTime('10:00');
    setDuration(30);
    setMeetingMode('in_person');
    setLocationId('');
    setVideoLink('');
    setNotes('');
    setAttendeeSearch('');
    setShowTemplates(false);
    setShowSaveTemplate(false);
    setTemplateName('');
  };

  const toggleAttendee = (userId: string) => {
    setSelectedAttendees(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const getAttendeeNames = () => {
    return selectedAttendees.map(id => {
      const m = teamMembers.find(t => t.user_id === id);
      return m?.display_name || m?.full_name || 'Unknown';
    });
  };

  const formatTime12 = (t: string) => {
    try {
      return format(parse(t, 'HH:mm', new Date()), 'h:mm a');
    } catch { return t; }
  };

  const applyTemplate = (template: MeetingTemplate) => {
    setMeetingType(template.meeting_type);
    setTitle(template.title_template);
    setDuration(template.duration_minutes);
    setMeetingMode(template.meeting_mode);
    if (template.location_id) setLocationId(template.location_id);
    if (template.video_link) setVideoLink(template.video_link);
    if (template.notes) setNotes(template.notes);
    if (template.attendee_user_ids?.length > 0) {
      setSelectedAttendees(template.attendee_user_ids);
    }
    setShowTemplates(false);
    toast.success(`Template "${template.name}" applied`);
    // Skip to datetime step since type + attendees are pre-filled
    if (template.attendee_user_ids?.length > 0) {
      setStep('datetime');
    } else {
      setStep('attendees');
    }
  };

  const handleSaveTemplate = () => {
    if (!templateName || !meetingType) return;
    createTemplate.mutate({
      name: templateName,
      meeting_type: meetingType,
      title_template: title,
      duration_minutes: duration,
      meeting_mode: meetingMode,
      location_id: locationId || null,
      video_link: videoLink || null,
      attendee_user_ids: selectedAttendees,
      notes: notes || null,
    }, {
      onSuccess: () => {
        setShowSaveTemplate(false);
        setTemplateName('');
      },
    });
  };

  return (
    <PremiumFloatingPanel open={open} onOpenChange={(o) => { if (!o) resetWizard(); onOpenChange(o); }} maxWidth="28rem" showCloseButton={false}>
      <div className="flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base tracking-wide">
              Schedule Meeting
            </h2>
            <div className="flex items-center gap-2">
              {templates.length > 0 && step === 'type' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-sans text-xs gap-1 h-7"
                  onClick={() => setShowTemplates(!showTemplates)}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  Templates
                </Button>
              )}
              <div className="flex items-center gap-1.5">
                {STEPS.map((s, i) => (
                  <div
                    key={s}
                    className={cn(
                      'w-2 h-2 rounded-full transition-colors',
                      i <= stepIndex ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step + (showTemplates ? '-templates' : '')}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
            >
              {/* Templates popover */}
              {showTemplates && step === 'type' && (
                <div className="space-y-3 mb-6">
                  <p className="text-sm text-muted-foreground font-sans">Load from template</p>
                  <div className="space-y-2">
                    {templates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => applyTemplate(t)}
                        className="flex items-center gap-3 w-full p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-colors text-left"
                      >
                        <Bookmark className="w-4 h-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-sans text-foreground truncate">{t.name}</p>
                          <p className="text-xs font-sans text-muted-foreground">
                            {MEETING_TYPES.find(m => m.value === t.meeting_type)?.label} · {t.duration_minutes} min
                            {t.attendee_user_ids?.length > 0 && ` · ${t.attendee_user_ids.length} attendees`}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowTemplates(false)}
                    className="text-xs font-sans text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 inline mr-1" />Back to meeting types
                  </button>
                </div>
              )}

              {/* Step 1: Meeting Type */}
              {step === 'type' && !showTemplates && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground font-sans">What type of meeting?</p>
                  <div className="grid gap-3">
                    {MEETING_TYPES.map(mt => (
                      <button
                        key={mt.value}
                        onClick={() => {
                          setMeetingType(mt.value);
                          if (!title) {
                            setTitle(mt.label === 'Other' ? '' : mt.label);
                          }
                        }}
                        className={cn(
                          'flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
                          meetingType === mt.value
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border hover:border-primary/30 hover:bg-muted/50'
                        )}
                      >
                        <div className={tokens.card.iconBox}>
                          <mt.icon className={tokens.card.icon} />
                        </div>
                        <div>
                          <p className="font-sans text-sm text-foreground">{mt.label}</p>
                          <p className="font-sans text-xs text-muted-foreground">{mt.description}</p>
                        </div>
                        {meetingType === mt.value && (
                          <Check className="w-4 h-4 text-primary ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Attendees */}
              {step === 'attendees' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground font-sans">Who should attend?</p>

                  {selectedAttendees.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedAttendees.map(id => {
                        const m = teamMembers.find(t => t.user_id === id);
                        return (
                          <Badge key={id} variant="secondary" className="gap-1 pr-1 font-sans">
                            {m?.display_name || m?.full_name}
                            <button onClick={() => toggleAttendee(id)} className="ml-1 hover:text-destructive">
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search team members..."
                      value={attendeeSearch}
                      onChange={e => setAttendeeSearch(e.target.value)}
                      className="pl-9 font-sans"
                    />
                  </div>

                  <div className="space-y-1 max-h-[360px] overflow-y-auto">
                    {filteredMembers.map(m => {
                      const isSelected = selectedAttendees.includes(m.user_id);
                      return (
                        <button
                          key={m.user_id}
                          onClick={() => toggleAttendee(m.user_id)}
                          className={cn(
                            'flex items-center gap-3 w-full p-3 rounded-lg transition-colors text-left',
                            isSelected ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/50'
                          )}
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={m.photo_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {(m.display_name || m.full_name || '?').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-sans text-foreground truncate">
                              {m.display_name || m.full_name}
                            </p>
                            {m.email && (
                              <p className="text-xs font-sans text-muted-foreground truncate">{m.email}</p>
                            )}
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Date & Time */}
              {step === 'datetime' && (
                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground font-sans">When should this meeting happen?</p>

                  {/* Calendar */}
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) => d && setSelectedDate(d)}
                      className="p-3 pointer-events-auto"
                      disabled={(d) => format(d, 'yyyy-MM-dd') < todayStr}
                    />
                  </div>

                  {/* Availability Overlay */}
                  {selectedAttendees.length > 0 && (
                    <AttendeeAvailabilityOverlay
                      date={dateStr}
                      attendeeUserIds={selectedAttendees}
                      teamMembers={teamMembers}
                      startTime={startTime}
                      endTime={endTime}
                    />
                  )}

                  {/* Suggested times */}
                  {suggestions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-sans text-muted-foreground">Suggested times (all attendees free)</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map(s => (
                          <button
                            key={s.startTime}
                            onClick={() => setStartTime(s.startTime)}
                            className={cn(
                              'px-3 py-1.5 rounded-full border text-xs font-sans transition-colors',
                              startTime === s.startTime
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:border-primary/40 text-foreground'
                            )}
                          >
                            {formatTime12(s.startTime)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Time and Duration */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-sans text-muted-foreground mb-1.5 block">Start Time</label>
                      <Select value={startTime} onValueChange={setStartTime}>
                        <SelectTrigger className="font-sans">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SLOTS.map(t => (
                            <SelectItem key={t} value={t} className="font-sans">
                              {formatTime12(t)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-sans text-muted-foreground mb-1.5 block">Duration</label>
                      <Select value={duration.toString()} onValueChange={v => setDuration(Number(v))}>
                        <SelectTrigger className="font-sans">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DURATION_OPTIONS.map(d => (
                            <SelectItem key={d} value={d.toString()} className="font-sans">
                              {d} min
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground font-sans">
                    {formatTime12(startTime)} — {formatTime12(endTime)}
                  </p>

                  {/* Conflicts */}
                  {hasConflicts && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs font-sans">Scheduling conflicts detected</span>
                      </div>
                      {selectedAttendees.map(uid => {
                        const userConflicts = getConflictsForUser(uid);
                        if (userConflicts.length === 0) return null;
                        const member = teamMembers.find(t => t.user_id === uid);
                        return (
                          <div key={uid} className="text-xs font-sans text-muted-foreground pl-6">
                            <span className="text-foreground">{member?.display_name || member?.full_name}</span>
                            {' has '}
                            {userConflicts.map((c, i) => (
                              <span key={i}>
                                {i > 0 && ', '}
                                {c.type === 'appointment' ? 'a client' : 'a meeting'}
                                {' '}
                                {formatTime12(c.startTime)}–{formatTime12(c.endTime)}
                              </span>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Location / Mode */}
              {step === 'location' && (
                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground font-sans">How will this meeting take place?</p>

                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: 'in_person' as const, label: 'In Person', icon: MapPin },
                      { value: 'video' as const, label: 'Video Call', icon: Video },
                      { value: 'hybrid' as const, label: 'Hybrid', icon: Monitor },
                    ]).map(mode => (
                      <button
                        key={mode.value}
                        onClick={() => setMeetingMode(mode.value)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                          meetingMode === mode.value
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border hover:border-primary/30'
                        )}
                      >
                        <mode.icon className="w-5 h-5" />
                        <span className="text-xs font-sans">{mode.label}</span>
                      </button>
                    ))}
                  </div>

                  {meetingMode !== 'video' && (
                    <div>
                      <label className="text-xs font-sans text-muted-foreground mb-1.5 block">Location</label>
                      <Select value={locationId} onValueChange={setLocationId}>
                        <SelectTrigger className="font-sans">
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map(loc => (
                            <SelectItem key={loc.id} value={loc.id} className="font-sans">
                              {loc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {meetingMode !== 'in_person' && (
                    <div>
                      <label className="text-xs font-sans text-muted-foreground mb-1.5 block">Video Link</label>
                      <Input
                        placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                        value={videoLink}
                        onChange={e => setVideoLink(e.target.value)}
                        className="font-sans"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Confirm */}
              {step === 'confirm' && (
                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground font-sans">Review and confirm your meeting.</p>

                  <div>
                    <label className="text-xs font-sans text-muted-foreground mb-1.5 block">Meeting Title</label>
                    <Input
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. 1-on-1 with Sarah"
                      className="font-sans"
                    />
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-sans">
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      <span>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-sans">
                      <span className="w-4 h-4 text-center text-muted-foreground">🕐</span>
                      <span>{formatTime12(startTime)} — {formatTime12(endTime)} ({duration} min)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-sans">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{getAttendeeNames().join(', ')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-sans">
                      {meetingMode === 'video' ? (
                        <Video className="w-4 h-4 text-muted-foreground" />
                      ) : meetingMode === 'hybrid' ? (
                        <Monitor className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span>
                        {meetingMode === 'video' ? 'Video Call' :
                         meetingMode === 'hybrid' ? 'Hybrid' : 'In Person'}
                        {locationId && ` — ${locations.find(l => l.id === locationId)?.name || ''}`}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-sans text-muted-foreground mb-1.5 block">Notes (optional)</label>
                    <Textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Agenda, talking points..."
                      rows={3}
                      className="font-sans"
                    />
                  </div>

                  {/* Save as template */}
                  {!showSaveTemplate ? (
                    <button
                      onClick={() => setShowSaveTemplate(true)}
                      className="flex items-center gap-1.5 text-xs font-sans text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      Save as template
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        value={templateName}
                        onChange={e => setTemplateName(e.target.value)}
                        placeholder="Template name..."
                        className="font-sans text-sm h-8 flex-1"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        className="font-sans h-8 text-xs"
                        disabled={!templateName || createTemplate.isPending}
                        onClick={handleSaveTemplate}
                      >
                        {createTemplate.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="font-sans h-8 text-xs"
                        onClick={() => { setShowSaveTemplate(false); setTemplateName(''); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  {hasConflicts && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs font-sans">
                          {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} detected — meeting can still be scheduled
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={stepIndex === 0 ? () => onOpenChange(false) : goBack}
            className="font-sans"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {stepIndex === 0 ? 'Cancel' : 'Back'}
          </Button>

          {step === 'confirm' ? (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!canProceed() || createMeeting.isPending}
              className="font-sans"
            >
              {createMeeting.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-1" />
              )}
              Schedule Meeting
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={goNext}
              disabled={!canProceed()}
              className="font-sans"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </PremiumFloatingPanel>
  );
}
