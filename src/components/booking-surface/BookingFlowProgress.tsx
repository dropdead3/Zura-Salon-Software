import { Check } from 'lucide-react';
import type { BookingSurfaceTheme } from '@/hooks/useBookingSurfaceConfig';

interface BookingFlowProgressProps {
  steps: string[];
  currentStep: number;
  theme: BookingSurfaceTheme;
}

export function BookingFlowProgress({ steps, currentStep, theme }: BookingFlowProgressProps) {
  return (
    <div className="flex items-center gap-2 w-full max-w-lg mx-auto py-6">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentStep;
        const isCurrent = idx === currentStep;

        return (
          <div key={step} className="flex items-center gap-2 flex-1">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors"
                style={{
                  backgroundColor: isCompleted || isCurrent ? theme.primaryColor : theme.surfaceColor,
                  color: isCompleted || isCurrent ? '#fff' : theme.mutedTextColor,
                  border: `1.5px solid ${isCompleted || isCurrent ? theme.primaryColor : theme.borderColor}`,
                }}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
              </div>
              <span
                className="text-xs whitespace-nowrap"
                style={{ color: isCurrent ? theme.textColor : theme.mutedTextColor }}
              >
                {step}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className="h-px flex-1 mt-[-16px]"
                style={{ backgroundColor: isCompleted ? theme.primaryColor : theme.borderColor }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
