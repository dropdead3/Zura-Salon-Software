import { useState, useMemo, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, Clock, Loader2, Users, ChevronsUpDown, Check, AlertTriangle, Sparkles } from 'lucide-react';
import { cn, formatDisplayName } from '@/lib/utils';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuggestedBlocks } from '@/hooks/useAssistantTimeBlocks';
import { useAssistantsAtLocation } from '@/hooks/useAssistantAvailability';
import { useAssistantConflictCheck } from '@/hooks/useAssistantConflictCheck';
import { useAssistantAutoSuggest } from '@/hooks/useAssistantAutoSuggest';
import type { PhorestAppointment } from '@/hooks/usePhorestCalendar';

interface RequestAssistantPanelProps {
  date: Date;
  time: string;
  requestingUserId: string;
  requestingUserName: string;
  appointments: PhorestAppointment[];
  locationId: string;
  onBack: () => void;
  onSubmit: (params: {
    start_time: string;
    end_time: string;
    assistant_user_id?: string | null;
    notes?: string;
  }) => void;
  isSubmitting?: boolean;
}

interface DurationPreset {
  label: string;
  minutes: number;
}

const DURATION_PRESETS: DurationPreset[] = [
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: '3 hours', minutes: 180 },
];

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export function RequestAssistantPanel({
  date,
  time,
  requestingUserId,
  requestingUserName,
  appointments,
  locationId,
  onBack,
  onSubmit,
  isSubmitting = false,
}: RequestAssistantPanelProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const dateStr = format(date, 'yyyy-MM-dd');

  const [startTime, setStartTime] = useState(time.slice(0, 5));
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [notes, setNotes] = useState('');
  const [assistantUserId, setAssistantUserId] = useState<string | null>(null);
  const [assistantSearchOpen, setAssistantSearchOpen] = useState(false);
  const hasManuallySelected = useRef(false);

  const endTime = addMinutesToTime(startTime, selectedDuration);

  // Get smart suggestions
  const suggestedBlocks = useSuggestedBlocks(appointments, requestingUserId, dateStr);

  // Fetch eligible assistants (team members who aren't the requesting stylist)
  const { data: eligibleAssistants = [] } = useQuery({
    queryKey: ['eligible-assistants', effectiveOrganization?.id, requestingUserId],
    queryFn: async () => {
      if (!effectiveOrganization?.id) return [];
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url')
        .eq('organization_id', effectiveOrganization.id)
        .eq('is_active', true)
        .eq('is_approved', true)
        .neq('user_id', requestingUserId)
        .order('display_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveOrganization?.id,
  });

  // Availability-aware: get assistants scheduled at this location on this date
  const availableAssistants = useAssistantsAtLocation(locationId, date);
  const availableUserIds = useMemo(
    () => new Set(availableAssistants.map(a => a.user_id)),
    [availableAssistants]
  );

  // Conflict check for the selected time range
  const conflictMap = useAssistantConflictCheck(
    dateStr,
    `${startTime}:00`,
    `${endTime}:00`,
    'new-block', // placeholder ID since this is a new block
    true,
  );

  // Auto-suggestion algorithm
  const suggestions = useAssistantAutoSuggest(
    locationId, date, `${startTime}:00`, `${endTime}:00`, requestingUserId,
  );
  const topSuggestion = suggestions.length > 0 ? suggestions[0] : null;

  // Auto-select top suggestion if only one strong candidate and nothing manually selected
  useEffect(() => {
    if (topSuggestion && suggestions.length === 1 && !assistantUserId && !hasManuallySelected.current) {
      setAssistantUserId(topSuggestion.user_id);
    }
  }, [topSuggestion?.user_id, suggestions.length, assistantUserId]);

  const suggestedUserIds = useMemo(
    () => new Set(suggestions.map(s => s.user_id)),
    [suggestions]
  );

  const selectedAssistant = useMemo(() =>
    eligibleAssistants.find(a => a.user_id === assistantUserId),
    [eligibleAssistants, assistantUserId]
  );

  // Sort: suggested first, then available, then others
  const sortedAssistants = useMemo(() => {
    return [...eligibleAssistants].sort((a, b) => {
      const aSugg = suggestedUserIds.has(a.user_id) ? 0 : 1;
      const bSugg = suggestedUserIds.has(b.user_id) ? 0 : 1;
      if (aSugg !== bSugg) return aSugg - bSugg;
      const aAvail = availableUserIds.has(a.user_id) ? 0 : 1;
      const bAvail = availableUserIds.has(b.user_id) ? 0 : 1;
      return aAvail - bAvail;
    });
  }, [eligibleAssistants, availableUserIds, suggestedUserIds]);

  const handleSuggestionClick = (suggestion: { start_time: string; end_time: string }) => {
    setStartTime(suggestion.start_time.slice(0, 5));
    const startMin = parseTime(suggestion.start_time);
    const endMin = parseTime(suggestion.end_time);
    const dur = endMin - startMin;
    // Snap to nearest preset or use raw
    const closest = DURATION_PRESETS.reduce((prev, curr) =>
      Math.abs(curr.minutes - dur) < Math.abs(prev.minutes - dur) ? curr : prev
    );
    setSelectedDuration(closest.minutes);
  };

  const handleSubmit = () => {
    onSubmit({
      start_time: `${startTime}:00`,
      end_time: `${endTime}:00`,
      assistant_user_id: assistantUserId,
      notes: notes || undefined,
    });
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Request Assistant</span>
      </div>

      {/* Requesting for */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        <span>For <span className="text-foreground font-medium">{requestingUserName}</span></span>
        <span>·</span>
        <span>{format(date, 'EEE, MMM d')}</span>
      </div>

      {/* Suggested time blocks */}
      {suggestedBlocks.length > 0 && (
        <div>
          <span className="text-xs text-muted-foreground mb-1.5 block">Suggested blocks</span>
          <div className="flex flex-wrap gap-1.5">
            {suggestedBlocks.map((suggestion, i) => (
              <Badge
                key={i}
                variant="outline"
                className="cursor-pointer text-xs px-2.5 py-1 hover:bg-accent transition-colors"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion.start_time.slice(0, 5)} – {suggestion.end_time.slice(0, 5)}
                <span className="ml-1 opacity-60">({suggestion.label})</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Time display */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        <Clock className="h-3.5 w-3.5" />
        <span>{startTime} – {endTime}</span>
      </div>

      {/* Duration Presets */}
      <div>
        <span className="text-xs text-muted-foreground mb-1.5 block">Duration</span>
        <div className="flex flex-wrap gap-1.5">
          {DURATION_PRESETS.map(preset => (
            <Badge
              key={preset.label}
              variant={selectedDuration === preset.minutes ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer text-xs px-2.5 py-1 transition-colors',
                selectedDuration === preset.minutes
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              )}
              onClick={() => setSelectedDuration(preset.minutes)}
            >
              {preset.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Assistant picker */}
      <div>
        <span className="text-xs text-muted-foreground mb-1.5 block">Assign to (optional)</span>
        <Popover open={assistantSearchOpen} onOpenChange={setAssistantSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={assistantSearchOpen}
              className="w-full h-9 justify-between text-sm font-normal"
            >
              {selectedAssistant
                ? formatDisplayName(selectedAssistant.full_name, selectedAssistant.display_name)
                : 'Any available assistant'}
              <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search team member..." />
              <CommandList>
                <CommandEmpty>No team member found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="any-available"
                    onSelect={() => {
                      hasManuallySelected.current = true;
                      setAssistantUserId(null);
                      setAssistantSearchOpen(false);
                    }}
                  >
                    <Check className={cn('mr-2 h-3.5 w-3.5', !assistantUserId ? 'opacity-100' : 'opacity-0')} />
                    Any available assistant
                  </CommandItem>
                  {sortedAssistants.map(member => {
                    const isAvailable = availableUserIds.has(member.user_id);
                    const hasConflict = conflictMap.has(member.user_id);
                    return (
                      <CommandItem
                        key={member.user_id}
                        value={formatDisplayName(member.full_name || '', member.display_name)}
                        onSelect={() => {
                          hasManuallySelected.current = true;
                          setAssistantUserId(member.user_id);
                          setAssistantSearchOpen(false);
                        }}
                      >
                        <Check className={cn('mr-2 h-3.5 w-3.5', assistantUserId === member.user_id ? 'opacity-100' : 'opacity-0')} />
                        <span className="flex-1">{formatDisplayName(member.full_name, member.display_name)}</span>
                        {suggestedUserIds.has(member.user_id) && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 ml-1 shrink-0">
                            <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                            Suggested
                          </Badge>
                        )}
                        {hasConflict && (
                          <AlertTriangle className="h-3 w-3 text-amber-500 ml-1 shrink-0" />
                        )}
                        {!isAvailable && !suggestedUserIds.has(member.user_id) && (
                          <span className="text-[10px] text-muted-foreground ml-1 shrink-0">(not scheduled)</span>
                        )}
                        {isAvailable && !hasConflict && !suggestedUserIds.has(member.user_id) && (
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 ml-1 shrink-0" />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {topSuggestion && assistantUserId === topSuggestion.user_id && suggestions.length === 1 && (
          <p className="text-[10px] text-muted-foreground px-1 mt-1">
            Auto-suggested based on availability and history
          </p>
        )}
      </div>

      {/* Notes */}
      <Textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        className="min-h-[60px] text-sm resize-none"
      />

      {/* Submit */}
      <Button
        className="w-full h-9"
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Request Assistant
      </Button>
    </div>
  );
}

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
