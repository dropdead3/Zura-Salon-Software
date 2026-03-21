import { useState, useEffect } from 'react';
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
  DialogDescription,
  DialogFooter,
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
import { cn } from '@/lib/utils';
import { CalendarIcon, Loader2, Pencil } from 'lucide-react';
import {
  useUpdateStrike,
  STRIKE_TYPE_LABELS,
  SEVERITY_LABELS,
  StrikeType,
  StrikeSeverity,
  StaffStrikeWithDetails,
} from '@/hooks/useStaffStrikes';

const strikeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  strike_type: z.enum(['write_up', 'complaint', 'red_flag', 'warning', 'issue', 'dress_code', 'other']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  incident_date: z.date(),
});

type StrikeFormData = z.infer<typeof strikeSchema>;

interface EditStrikeDialogProps {
  strike: StaffStrikeWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditStrikeDialog({
  strike,
  open,
  onOpenChange,
  onSuccess,
}: EditStrikeDialogProps) {
  const { formatDate } = useFormatDate();
  const updateStrike = useUpdateStrike();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<StrikeFormData>({
    resolver: zodResolver(strikeSchema),
    defaultValues: {
      title: strike.title,
      description: strike.description || '',
      strike_type: strike.strike_type as StrikeType,
      severity: strike.severity as StrikeSeverity,
      incident_date: new Date(strike.incident_date),
    },
  });

  // Reset form when strike changes
  useEffect(() => {
    if (strike && open) {
      reset({
        title: strike.title,
        description: strike.description || '',
        strike_type: strike.strike_type as StrikeType,
        severity: strike.severity as StrikeSeverity,
        incident_date: new Date(strike.incident_date),
      });
    }
  }, [strike, open, reset]);

  const strikeType = watch('strike_type');
  const severity = watch('severity');
  const incidentDate = watch('incident_date');

  const onSubmit = async (data: StrikeFormData) => {
    await updateStrike.mutateAsync({
      id: strike.id,
      title: data.title,
      description: data.description || null,
      strike_type: data.strike_type,
      severity: data.severity,
      incident_date: format(data.incident_date, 'yyyy-MM-dd'),
    });
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Edit Strike
          </DialogTitle>
          <DialogDescription>
            Update the details for this strike record.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Brief summary of the issue"
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
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
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !incidentDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {incidentDate ? formatDate(incidentDate, 'PPP') : 'Select a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={incidentDate}
                  onSelect={(date) => {
                    if (date) {
                      setValue('incident_date', date);
                      setCalendarOpen(false);
                    }
                  }}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Notes</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Additional details about the incident..."
              className="min-h-[100px]"
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateStrike.isPending}>
              {updateStrike.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
