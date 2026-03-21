import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addDays } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
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
import { 
  ChevronLeft, ChevronRight, CalendarIcon, Trophy, 
  Users, MapPin, Bell, DollarSign, UserPlus, Percent, GraduationCap, Check
} from 'lucide-react';
import { useCreateChallenge } from '@/hooks/useChallenges';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  challenge_type: z.enum(['individual', 'team', 'location']),
  metric_type: z.enum(['bells', 'retail', 'new_clients', 'retention', 'training', 'tips']),
  goal_value: z.number().optional(),
  start_date: z.date(),
  end_date: z.date(),
  prize_description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface CreateChallengeWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  { id: 1, title: 'Basics', description: 'Name and description' },
  { id: 2, title: 'Type', description: 'Challenge format' },
  { id: 3, title: 'Details', description: 'Goals and dates' },
  { id: 4, title: 'Review', description: 'Confirm and launch' },
];

const challengeTypes = [
  { value: 'individual', label: 'Individual', icon: Trophy, description: 'Person vs person competition' },
  { value: 'team', label: 'Team', icon: Users, description: 'Named teams compete' },
  { value: 'location', label: 'Location', icon: MapPin, description: 'Salon locations compete' },
];

const metricTypes = [
  { value: 'bells', label: 'Bells Rung', icon: Bell },
  { value: 'retail', label: 'Retail Sales', icon: DollarSign },
  { value: 'new_clients', label: 'New Clients', icon: UserPlus },
  { value: 'retention', label: 'Retention', icon: Percent },
  { value: 'training', label: 'Trainings', icon: GraduationCap },
  { value: 'tips', label: 'Tips', icon: DollarSign },
];

export function CreateChallengeWizard({ open, onOpenChange }: CreateChallengeWizardProps) {
  const { formatDate } = useFormatDate();
  const [step, setStep] = useState(1);
  const createChallenge = useCreateChallenge();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      challenge_type: 'individual',
      metric_type: 'bells',
      start_date: new Date(),
      end_date: addDays(new Date(), 7),
      prize_description: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    await createChallenge.mutateAsync({
      title: data.title,
      description: data.description,
      challenge_type: data.challenge_type,
      metric_type: data.metric_type,
      goal_value: data.goal_value,
      start_date: data.start_date.toISOString(),
      end_date: data.end_date.toISOString(),
      prize_description: data.prize_description,
      status: 'active',
    });
    onOpenChange(false);
    setStep(1);
    form.reset();
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const canProceed = () => {
    switch (step) {
      case 1:
        return !!form.watch('title');
      case 2:
        return !!form.watch('challenge_type') && !!form.watch('metric_type');
      case 3:
        return !!form.watch('start_date') && !!form.watch('end_date');
      default:
        return true;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Create Challenge</DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  step >= s.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {step > s.id ? <Check className="w-4 h-4" /> : s.id}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 transition-colors',
                    step > s.id ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Step 1: Basics */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Challenge Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Q1 Bell Challenge"
                    {...form.register('title')}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the challenge..."
                    {...form.register('description')}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Type */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <Label>Challenge Type</Label>
                  <div className="grid gap-2 mt-2">
                    {challengeTypes.map((type) => {
                      const Icon = type.icon;
                      const isSelected = form.watch('challenge_type') === type.value;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => form.setValue('challenge_type', type.value as any)}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg border text-left transition-all',
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <Icon className={cn('w-5 h-5', isSelected && 'text-primary')} />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{type.label}</p>
                            <p className="text-xs text-muted-foreground">{type.description}</p>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label>Metric to Track</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {metricTypes.map((metric) => {
                      const Icon = metric.icon;
                      const isSelected = form.watch('metric_type') === metric.value;
                      return (
                        <button
                          key={metric.value}
                          type="button"
                          onClick={() => form.setValue('metric_type', metric.value as any)}
                          className={cn(
                            'flex items-center gap-2 p-3 rounded-lg border text-left transition-all',
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <Icon className={cn('w-4 h-4', isSelected && 'text-primary')} />
                          <span className="text-sm font-medium">{metric.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Details */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left mt-1">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formatDate(form.watch('start_date'), 'MMM d, yyyy')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.watch('start_date')}
                          onSelect={(d) => d && form.setValue('start_date', d)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left mt-1">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formatDate(form.watch('end_date'), 'MMM d, yyyy')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.watch('end_date')}
                          onSelect={(d) => d && form.setValue('end_date', d)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div>
                  <Label htmlFor="goal">Goal Value (optional)</Label>
                  <Input
                    id="goal"
                    type="number"
                    placeholder="e.g., 100"
                    onChange={(e) => form.setValue('goal_value', e.target.value ? Number(e.target.value) : undefined)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave blank for open-ended competition
                  </p>
                </div>

                <div>
                  <Label htmlFor="prize">Prize Description (optional)</Label>
                  <Textarea
                    id="prize"
                    placeholder="e.g., Winner gets a day off!"
                    {...form.register('prize_description')}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Title</span>
                    <span className="font-medium">{form.watch('title')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium capitalize">{form.watch('challenge_type')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Metric</span>
                    <span className="font-medium capitalize">{form.watch('metric_type').replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">
                      {formatDate(form.watch('start_date'), 'MMM d')} - {formatDate(form.watch('end_date'), 'MMM d')}
                    </span>
                  </div>
                  {form.watch('goal_value') && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Goal</span>
                      <span className="font-medium">{form.watch('goal_value')}</span>
                    </div>
                  )}
                  {form.watch('prize_description') && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prize</span>
                      <span className="font-medium">{form.watch('prize_description')}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  The challenge will go live immediately upon creation.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={step === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          
          {step < 4 ? (
            <Button onClick={nextStep} disabled={!canProceed()}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={createChallenge.isPending}
            >
              {createChallenge.isPending ? 'Creating...' : 'Launch Challenge'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
