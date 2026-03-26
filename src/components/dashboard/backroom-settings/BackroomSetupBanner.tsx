/**
 * BackroomSetupBanner — Persistent setup wizard banner shown above
 * the Backroom page header until setup is complete.
 */
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { ZuraZIcon } from '@/components/icons/ZuraZIcon';

interface SetupStep {
  label: string;
  done: boolean;
  section: string;
}

interface SetupHealthData {
  isComplete: boolean;
  completed: number;
  total: number;
  steps: SetupStep[];
  warnings: Array<{ id: string; title: string; description: string; section: string }>;
}

interface BackroomSetupBannerProps {
  setupHealth: SetupHealthData | undefined;
  wizardCompleted: boolean;
  onNavigate: (section: string) => void;
  onResumeSetup: () => void;
}

export function BackroomSetupBanner({
  setupHealth,
  wizardCompleted,
  onNavigate,
  onResumeSetup,
}: BackroomSetupBannerProps) {
  const [setupOpen, setSetupOpen] = useState(false);

  if (!setupHealth || setupHealth.isComplete) return null;

  const isFirstVisit = setupHealth.completed === 0;

  return (
    <Collapsible open={setupOpen} onOpenChange={setSetupOpen}>
      <Card className="border-amber-500/30 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-500/[0.08]">
        <CardHeader className="pb-0 pt-5 px-5">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-lg bg-white border border-amber-400 dark:border-0 dark:bg-amber-500/15 flex items-center justify-center shrink-0">
                <ZuraZIcon className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="font-display text-sm tracking-wide text-foreground">
                  {isFirstVisit
                    ? "Welcome to your Backroom! Let's get you set up."
                    : "Uh-oh, you haven't finished setting up your backroom!"}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  <span className="font-display text-amber-600 dark:text-amber-400/80 tracking-wide">
                    {setupHealth.completed} of {setupHealth.total}
                  </span>{' '}
                  {isFirstVisit ? 'areas to configure' : 'areas configured'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!wizardCompleted && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResumeSetup();
                    }}
                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 dark:border-amber-500/50 hover:border-amber-500/60"
                  >
                    Resume Setup
                  </Button>
                )}
                {setupOpen ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>
          </CollapsibleTrigger>
        </CardHeader>
        <CardContent className="py-4 px-5" style={{ containerType: 'inline-size' }}>
          {/* Step tracker */}
          <div className="w-full px-4">
            <div className="flex items-start w-full">
              {setupHealth.steps.map((step, i, arr) => (
                <React.Fragment key={step.label}>
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center transition-colors',
                        step.done
                          ? 'bg-amber-500 text-amber-950'
                          : 'border border-amber-400 dark:border-amber-500/40 bg-transparent'
                      )}
                    >
                      {step.done && <Check className="w-3 h-3" />}
                    </div>
                    <span className="hidden @[600px]:block text-[10px] text-center font-sans text-muted-foreground whitespace-nowrap mt-1">
                      {step.label}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-px mx-1 mt-2.5',
                        step.done ? 'bg-amber-400 dark:bg-amber-500/60' : 'bg-border/60'
                      )}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
          <CollapsibleContent className="mt-3 pt-3 border-t border-border/40">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {setupHealth.warnings.slice(0, 3).map((w) => (
                <button
                  key={w.id}
                  onClick={() => onNavigate(w.section)}
                  className="text-left p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <p className="text-xs font-sans text-foreground">{w.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{w.description}</p>
                </button>
              ))}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  );
}
