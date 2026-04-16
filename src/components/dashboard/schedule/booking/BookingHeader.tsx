import { Button } from '@/components/ui/button';
import { X, ChevronLeft, CalendarPlus } from 'lucide-react';
import { BookingStep } from './BookingWizard';
import { cn } from '@/lib/utils';

interface BookingHeaderProps {
  step: BookingStep;
  title: string;
  subtitle: string;
  onClose: () => void;
  onBack?: () => void;
}

const STEPS: BookingStep[] = ['client', 'service', 'stylist', 'confirm'];

export function BookingHeader({ step, title, subtitle, onClose, onBack }: BookingHeaderProps) {
  // Treat 'newClient' as a sub-step of 'client' so the progress bar stays at 4 segments.
  const progressStep: BookingStep = step === 'newClient' ? 'client' : step;
  const currentStepIndex = STEPS.indexOf(progressStep);

  return (
    <div className="border-b border-border bg-transparent rounded-t-xl">
      {/* Top bar with navigation */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {onBack ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={onBack}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <CalendarPlus className="h-4 w-4 text-primary" />
            </div>
          )}
          <div>
            <h2 className="font-medium text-base">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-muted"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Step progress bar */}
      <div className="flex px-4 pb-3 gap-1.5">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i <= currentStepIndex ? 'bg-primary' : 'bg-muted'
            )}
          />
        ))}
      </div>
    </div>
  );
}
