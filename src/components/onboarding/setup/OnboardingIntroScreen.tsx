import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import { Lock, Pause, Undo2 } from "lucide-react";

interface OnboardingIntroScreenProps {
  onBegin: () => void;
  /** Wave 13D — emits intro_viewed on mount + intro_began on click. */
  onTelemetry?: (event: "intro_viewed" | "intro_began", dwell_ms?: number) => void;
}

/**
 * OnboardingIntroScreen — pre-wizard expectation setting.
 * Single hero line, calm explanation, single CTA. Sets the tone.
 *
 * Wave 13D — emits intro_viewed on mount and intro_began with dwell_ms
 * on the CTA so the funnel can quantify intro abandonment (today's
 * largest single drop-off in the setup pipeline).
 */
export function OnboardingIntroScreen({ onBegin, onTelemetry }: OnboardingIntroScreenProps) {
  const enterTime = useRef<number>(Date.now());
  const reportedView = useRef(false);

  useEffect(() => {
    if (reportedView.current) return;
    reportedView.current = true;
    onTelemetry?.("intro_viewed");
  }, [onTelemetry]);

  const handleBegin = () => {
    onTelemetry?.("intro_began", Date.now() - enterTime.current);
    onBegin();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <Helmet>
        <title>Set up your workspace — Zura</title>
      </Helmet>
      <div className="max-w-2xl mx-auto text-center space-y-10">
        <div className="space-y-6">
          <div className="font-display text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
            Workspace setup
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-medium tracking-wide leading-tight">
            Most software asks you to fit it.
            <br />
            <span className="text-muted-foreground">
              Zura asks how you operate, then fits itself to you.
            </span>
          </h1>
        </div>

        <div className="space-y-4 max-w-xl mx-auto">
          <p className="font-sans text-base text-foreground leading-relaxed">
            The next few minutes shape what your team sees, how compensation
            calculates, which intelligence surfaces, and which apps install.
          </p>
          <p className="font-sans text-sm text-muted-foreground leading-relaxed">
            Roughly 7–10 minutes. Pause anytime. Every choice is reversible
            from settings later.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 pt-6 max-w-xl mx-auto">
          {[
            {
              icon: Pause,
              label: "Pause anytime",
              sub: "We save your progress",
            },
            {
              icon: Undo2,
              label: "Reversible",
              sub: "Edit anything later",
            },
            {
              icon: Lock,
              label: "Tenant-isolated",
              sub: "Your answers stay yours",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-border bg-card/40 p-4 text-left flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                <item.icon className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <div className="font-display text-xs uppercase tracking-wider text-foreground">
                  {item.label}
                </div>
                <div className="font-sans text-xs text-muted-foreground mt-1">
                  {item.sub}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4">
          <Button onClick={handleBegin} size="lg" className="min-w-[200px]">
            Begin setup
          </Button>
        </div>
      </div>
    </div>
  );
}
