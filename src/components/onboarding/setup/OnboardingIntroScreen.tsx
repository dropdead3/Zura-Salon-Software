import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";

interface OnboardingIntroScreenProps {
  onBegin: () => void;
}

/**
 * OnboardingIntroScreen — pre-wizard expectation setting.
 * Single hero line, calm explanation, single CTA. Sets the tone.
 */
export function OnboardingIntroScreen({ onBegin }: OnboardingIntroScreenProps) {
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
            { label: "9 steps", sub: "Most are quick" },
            { label: "Reversible", sub: "Edit anytime" },
            { label: "Intelligent", sub: "Sensible defaults" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-border bg-card/40 p-4 text-left"
            >
              <div className="font-display text-xs uppercase tracking-wider text-foreground">
                {item.label}
              </div>
              <div className="font-sans text-xs text-muted-foreground mt-1">
                {item.sub}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4">
          <Button onClick={onBegin} size="lg" className="min-w-[200px]">
            Begin setup
          </Button>
        </div>
      </div>
    </div>
  );
}
