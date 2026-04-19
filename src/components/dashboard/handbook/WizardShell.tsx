import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface WizardStep {
  key: string;
  label: string;
  status: 'done' | 'active' | 'todo';
  disabled?: boolean;
}

interface Props {
  title: string;
  subtitle?: string;
  steps: WizardStep[];
  activeStepKey: string;
  onStepClick: (key: string) => void;
  saving?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  onExit?: () => void;
}

export function WizardShell({ title, subtitle, steps, activeStepKey, onStepClick, saving, children, footer, onExit }: Props) {
  const completedCount = steps.filter((s) => s.status === 'done').length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="space-y-6">
      {/* Sticky progress bar */}
      <div className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className={cn(tokens.heading.page, 'truncate')}>{title}</h1>
            {subtitle && <p className="font-sans text-sm text-muted-foreground truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-2 font-sans text-xs text-muted-foreground">
              {saving ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
              ) : (
                <>Saved · {progress}% complete</>
              )}
            </div>
            {onExit && (
              <Button variant="outline" size="sm" onClick={onExit} className="font-sans">
                Save & exit
              </Button>
            )}
          </div>
        </div>
        <div className="mt-3 h-1 w-full bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Left rail */}
        <nav className="lg:sticky lg:top-32 lg:self-start space-y-1">
          {steps.map((step, idx) => {
            const active = step.key === activeStepKey;
            return (
              <button
                key={step.key}
                onClick={() => !step.disabled && onStepClick(step.key)}
                disabled={step.disabled}
                className={cn(
                  'w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  active && 'bg-primary/10 text-foreground',
                  !active && !step.disabled && 'hover:bg-muted text-muted-foreground hover:text-foreground',
                  step.disabled && 'opacity-50 cursor-not-allowed text-muted-foreground'
                )}
              >
                <span className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-sans shrink-0 border',
                  step.status === 'done' && 'bg-primary text-primary-foreground border-primary',
                  step.status === 'active' && 'border-primary text-primary',
                  step.status === 'todo' && 'border-border text-muted-foreground'
                )}>
                  {step.status === 'done' ? <Check className="w-3 h-3" /> : idx + 1}
                </span>
                <span className="font-sans text-sm truncate">{step.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right pane */}
        <div className="min-w-0 space-y-6">
          {children}
          {footer && <div className="flex items-center justify-between pt-4 border-t border-border">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
