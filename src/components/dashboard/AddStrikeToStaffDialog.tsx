import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, formatDisplayName } from '@/lib/utils';
import { CalendarIcon, AlertTriangle, Loader2, Plus } from 'lucide-react';
import {
  useCreateStrike,
  STRIKE_TYPE_LABELS,
  SEVERITY_LABELS,
  StrikeType,
  StrikeSeverity,
} from '@/hooks/useStaffStrikes';
import { useTeamDirectory } from '@/hooks/useEmployeeProfile';

const strikeSchema = z.object({
  user_id: z.string().min(1, 'Please select a staff member'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  strike_type: z.enum(['write_up', 'complaint', 'red_flag', 'warning', 'issue', 'dress_code', 'other']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  incident_date: z.date(),
});

type StrikeFormData = z.infer<typeof strikeSchema>;

interface AddStrikeToStaffDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function AddStrikeToStaffDialog({
  trigger,
  onSuccess,
}: AddStrikeToStaffDialogProps) {
  const { formatDate } = useFormatDate();
  const [open, setOpen] = useState(false);
  const createStrike = useCreateStrike();
  const { data: team = [] } = useTeamDirectory();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<StrikeFormData>({
    resolver: zodResolver(strikeSchema),
    defaultValues: {
      user_id: '',
      strike_type: 'warning',
      severity: 'low',
      incident_date: new Date(),
    },
  });

  const incidentDate = watch('incident_date');
  const strikeType = watch('strike_type');
  const severity = watch('severity');
  const selectedUserId = watch('user_id');

  const selectedMember = team.find((m) => m.user_id === selectedUserId);

  const onSubmit = async (data: StrikeFormData) => {
    await createStrike.mutateAsync({
      user_id: data.user_id,
      strike_type: data.strike_type as StrikeType,
      severity: data.severity as StrikeSeverity,
      title: data.title,
      description: data.description,
      incident_date: format(data.incident_date, 'yyyy-MM-dd'),
    });
    reset();
    setOpen(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-foreground text-background hover:bg-foreground/90">
            <Plus className="w-4 h-4 mr-2" />
            Add Strike To Staff Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Add Strike To Staff Member
          </DialogTitle>
          <DialogDescription>
            Document a write-up, complaint, warning, or issue for a staff member.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Staff Member *</Label>
            <Select
              value={selectedUserId}
              onValueChange={(value) => setValue('user_id', value)}
            >
              <SelectTrigger className={cn(errors.user_id && 'border-destructive')}>
                <SelectValue placeholder="Select a staff member..." />
              </SelectTrigger>
              <SelectContent>
                {team.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={member.photo_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {member.full_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {formatDisplayName(member.full_name || '', member.display_name)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.user_id && (
              <p className="text-sm text-destructive">{errors.user_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Brief summary of the issue"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select
                value={strikeType}
                onValueChange={(value) => setValue('strike_type', value as StrikeType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STRIKE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Severity *</Label>
              <Select
                value={severity}
                onValueChange={(value) => setValue('severity', value as StrikeSeverity)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Incident Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !incidentDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {incidentDate ? formatDate(incidentDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={incidentDate}
                  onSelect={(date) => date && setValue('incident_date', date)}
                  initialFocus
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Notes</Label>
            <Textarea
              id="description"
              placeholder="Detailed description of the incident..."
              rows={4}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-foreground text-background hover:bg-foreground/90"
              disabled={createStrike.isPending}
            >
              {createStrike.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Add Strike
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
