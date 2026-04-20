import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  PLAN_TYPE_META,
  useCreateCompensationPlan,
  type CompensationPlanType,
} from '@/hooks/useCompensationPlans';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLAN_ORDER: CompensationPlanType[] = [
  'flat_commission',
  'level_based',
  'sliding_period',
  'sliding_trailing',
  'hourly_vs_commission',
  'hourly_plus_commission',
  'team_pooled',
  'category_based',
  'booth_rental',
];

export function CreateCompensationPlanDialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [planType, setPlanType] = useState<CompensationPlanType>('flat_commission');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const create = useCreateCompensationPlan();

  const reset = () => {
    setStep(1);
    setPlanType('flat_commission');
    setName('');
    setDescription('');
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleCreate = async () => {
    await create.mutateAsync({
      name: name.trim() || PLAN_TYPE_META[planType].label,
      plan_type: planType,
      description: description.trim() || undefined,
    });
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? 'Choose a pay model' : 'Name this plan'}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Pick how this group of staff gets paid. You can configure rates and modifiers next.'
              : 'Give the plan a clear name your team will recognize.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <RadioGroup
              value={planType}
              onValueChange={(v) => setPlanType(v as CompensationPlanType)}
              className="space-y-2 py-2"
            >
              {PLAN_ORDER.map((t) => {
                const meta = PLAN_TYPE_META[t];
                const selected = planType === t;
                return (
                  <label
                    key={t}
                    htmlFor={`plan-${t}`}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors',
                      selected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <RadioGroupItem value={t} id={`plan-${t}`} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display text-sm tracking-wide uppercase">
                          {meta.label}
                        </span>
                        <span className="text-xs text-muted-foreground font-sans">
                          {meta.short}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground font-sans mt-1">
                        {meta.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </ScrollArea>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="plan-name">Plan name</Label>
              <Input
                id="plan-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={PLAN_TYPE_META[planType].label}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1.5 font-sans">
                e.g. "Senior stylists — sliding scale", "CA hourly + commission"
              </p>
            </div>
            <div>
              <Label htmlFor="plan-desc">Description (optional)</Label>
              <Textarea
                id="plan-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={PLAN_TYPE_META[planType].description}
                rows={3}
                className="mt-1.5"
              />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-sm font-sans">
              <span className="text-muted-foreground">Pay model: </span>
              <span className="font-medium">{PLAN_TYPE_META[planType].label}</span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
          )}
          <Button variant="ghost" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          {step === 1 ? (
            <Button onClick={() => setStep(2)}>Continue</Button>
          ) : (
            <Button onClick={handleCreate} disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create plan'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
