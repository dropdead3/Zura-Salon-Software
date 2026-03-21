import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
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
import { cn } from '@/lib/utils';
import { CalendarIcon, AlertTriangle, Loader2 } from 'lucide-react';
import {
  useCreateStrike,
  STRIKE_TYPE_LABELS,
  SEVERITY_LABELS,
  StrikeType,
  StrikeSeverity,
} from '@/hooks/useStaffStrikes';

const strikeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  strike_type: z.enum(['write_up', 'complaint', 'red_flag', 'warning', 'issue', 'dress_code', 'other']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  incident_date: z.date(),
});

type StrikeFormData = z.infer<typeof strikeSchema>;

interface AddStrikeDialogProps {
  userId: string;
  userName: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddStrikeDialog({
  userId,
  userName,
  trigger,
  onSuccess,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddStrikeDialogProps) {
  const { formatDate } = useFormatDate();
  const [internalOpen, setInternalOpen] = useState(false);
  const createStrike = useCreateStrike();
  
  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;

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
      strike_type: 'warning',
      severity: 'low',
      incident_date: new Date(),
    },
  });

  const incidentDate = watch('incident_date');
  const strikeType = watch('strike_type');
  const severity = watch('severity');

  const onSubmit = async (data: StrikeFormData) => {
    await createStrike.mutateAsync({
      user_id: userId,
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
          <Button variant="destructive" size={tokens.button.card}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            Add Strike
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Add Strike for {userName}
          </DialogTitle>
          <DialogDescription>
            Document a write-up, complaint, warning, or issue for this staff member.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <Label htmlFor="description">Description</Label>
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
              variant="destructive"
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
