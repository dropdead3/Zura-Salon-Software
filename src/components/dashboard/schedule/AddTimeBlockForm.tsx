import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, Clock, Loader2, Coffee, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useEffectiveRoles } from '@/hooks/useEffectiveUser';
import { useCreateBreakRequest } from '@/hooks/useTimeOffRequests';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AddTimeBlockFormProps {
  date: Date;
  time: string;
  onBack: () => void;
  onComplete: () => void;
  defaultStylistId?: string;
}

type BlockMode = 'Break' | 'Block';

interface SubReason {
  value: string;
  label: string;
}

const BREAK_REASONS: SubReason[] = [
  { value: 'lunch', label: 'Lunch' },
  { value: 'rest_break', label: 'Rest Break' },
  { value: 'personal_break', label: 'Personal Break' },
];

const BLOCK_REASONS: SubReason[] = [
  { value: 'admin', label: 'Admin Tasks' },
  { value: 'training', label: 'Training' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'personal', label: 'Personal Time' },
  { value: 'other', label: 'Other' },
];

interface DurationPreset {
  label: string;
  minutes: number;
}

const BREAK_DURATION_PRESETS: DurationPreset[] = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
];

const BLOCK_DURATION_PRESETS: DurationPreset[] = [
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: 'Half Day', minutes: 240 },
  { label: 'Full Day', minutes: 0 },
];

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export function AddTimeBlockForm({ date, time, onBack, onComplete, defaultStylistId }: AddTimeBlockFormProps) {
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const roles = useEffectiveRoles();
  const createBreak = useCreateBreakRequest();

  const isAdmin = roles.some(r => ['admin', 'manager', 'super_admin', 'front_desk', 'receptionist'].includes(r));

  const [blockMode, setBlockMode] = useState<BlockMode>('Break');
  const [reason, setReason] = useState<string>('lunch');
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [notes, setNotes] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(defaultStylistId || user?.id || '');
  const [staffSearchOpen, setStaffSearchOpen] = useState(false);

  const reasons = blockMode === 'Break' ? BREAK_REASONS : BLOCK_REASONS;
  const durationPresets = blockMode === 'Break' ? BREAK_DURATION_PRESETS : BLOCK_DURATION_PRESETS;

  // Reset reason and duration when mode changes
  const handleModeChange = (mode: BlockMode) => {
    setBlockMode(mode);
    if (mode === 'Break') {
      setReason('lunch');
      setSelectedDuration(30);
    } else {
      setReason('admin');
      setSelectedDuration(60);
    }
  };

  // Fetch team members for admin dropdown
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members-break', effectiveOrganization?.id],
    queryFn: async () => {
      if (!effectiveOrganization?.id) return [];
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url')
        .eq('organization_id', effectiveOrganization.id)
        .eq('is_active', true)
        .eq('is_approved', true)
        .order('display_name');
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin && !!effectiveOrganization?.id,
  });

  const isFullDay = selectedDuration === 0;
  const startTime = time.length === 5 ? time : time.substring(0, 5);
  const endTime = isFullDay ? '' : addMinutesToTime(startTime, selectedDuration);

  const handleSubmit = () => {
    if (!effectiveOrganization?.id || !selectedUserId) return;

    const dateStr = format(date, 'yyyy-MM-dd');

    createBreak.mutate({
      user_id: selectedUserId,
      organization_id: effectiveOrganization.id,
      start_date: dateStr,
      end_date: dateStr,
      start_time: isFullDay ? undefined : `${startTime}:00`,
      end_time: isFullDay ? undefined : `${endTime}:00`,
      is_full_day: isFullDay,
      reason: reason,
      notes: notes || undefined,
      blocks_online_booking: true,
      block_mode: blockMode,
    }, {
      onSuccess: () => onComplete(),
    });
  };

  const ModeIcon = blockMode === 'Break' ? Coffee : Clock;
  const modeLabel = blockMode === 'Break' ? 'Break' : 'Block';

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <ModeIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Add {modeLabel}</span>
      </div>

      {/* Mode Toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          className={cn(
            'flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors text-xs',
            blockMode === 'Break'
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border hover:border-muted-foreground/50 text-muted-foreground'
          )}
          onClick={() => handleModeChange('Break')}
        >
          <Coffee className="h-5 w-5" />
          <span className="font-medium">Break</span>
          <span className="text-[10px] text-muted-foreground leading-tight">Rest periods</span>
        </button>
        <button
          className={cn(
            'flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors text-xs',
            blockMode === 'Block'
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border hover:border-muted-foreground/50 text-muted-foreground'
          )}
          onClick={() => handleModeChange('Block')}
        >
          <Clock className="h-5 w-5" />
          <span className="font-medium">Block</span>
          <span className="text-[10px] text-muted-foreground leading-tight">Non-service time</span>
        </button>
      </div>

      {/* Date & Time summary */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        <Clock className="h-3.5 w-3.5" />
        <span>{format(date, 'EEE, MMM d')} · {startTime}{!isFullDay && ` – ${endTime}`}{isFullDay && ' (Full Day)'}</span>
      </div>

      {/* Reason Pills */}
      <div className="flex flex-wrap gap-1.5">
        {reasons.map(r => (
          <Badge
            key={r.value}
            variant={reason === r.value ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer text-xs px-2.5 py-1 transition-colors',
              reason === r.value
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent'
            )}
            onClick={() => setReason(r.value)}
          >
            {r.label}
          </Badge>
        ))}
      </div>

      {/* Duration Presets */}
      <div>
        <span className="text-xs text-muted-foreground mb-1.5 block">Duration</span>
        <div className="flex flex-wrap gap-1.5">
          {durationPresets.map(preset => (
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

      {/* Staff selector (admin only) */}
      {isAdmin && teamMembers.length > 0 && (
        <div>
          <span className="text-xs text-muted-foreground mb-1.5 block">For</span>
          <Popover open={staffSearchOpen} onOpenChange={setStaffSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={staffSearchOpen}
                className="w-full h-9 justify-between text-sm font-normal"
              >
                {selectedUserId
                  ? (teamMembers.find(m => m.user_id === selectedUserId)?.display_name ||
                     teamMembers.find(m => m.user_id === selectedUserId)?.full_name ||
                     'Select team member')
                  : 'Select team member'}
                <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search team member..." />
                <CommandList>
                  <CommandEmpty>No team member found.</CommandEmpty>
                  <CommandGroup>
                    {teamMembers.map(member => (
                      <CommandItem
                        key={member.user_id}
                        value={member.display_name || member.full_name || ''}
                        onSelect={() => {
                          setSelectedUserId(member.user_id);
                          setStaffSearchOpen(false);
                        }}
                      >
                        <Check className={cn('mr-2 h-3.5 w-3.5', selectedUserId === member.user_id ? 'opacity-100' : 'opacity-0')} />
                        {member.display_name || member.full_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

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
        disabled={createBreak.isPending || !selectedUserId}
      >
        {createBreak.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Schedule {modeLabel}
      </Button>
    </div>
  );
}
