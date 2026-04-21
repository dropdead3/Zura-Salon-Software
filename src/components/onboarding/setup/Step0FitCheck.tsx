import { useEffect, useState } from "react";
import { Chip } from "./Chip";
import type { StepProps } from "./types";

interface Step0Data {
  fit_choice: "traditional" | "rental_heavy" | "hybrid_unique" | "not_a_salon" | null;
}

const OPTIONS: Array<{
  value: NonNullable<Step0Data["fit_choice"]>;
  label: string;
  description: string;
}> = [
  {
    value: "traditional",
    label: "Commission or hourly stylists, one or more locations",
    description:
      "You employ stylists. You pay them based on services performed, hourly, or a mix.",
  },
  {
    value: "rental_heavy",
    label: "Mostly booth renters or independent contractors",
    description:
      "Stylists rent chairs from you. They keep their own bookings and revenue.",
  },
  {
    value: "hybrid_unique",
    label: "A mix, or a structure that doesn't fit a clean box",
    description:
      "Hybrid models, custom revenue splits, or something unique to your operation.",
  },
  {
    value: "not_a_salon",
    label: "Not a salon, spa, or beauty business",
    description: "Zura is built for beauty operators. We'll point you elsewhere.",
  },
];

/**
 * Step 0 — Fit check. Self-selection over misqualification.
 * Routes #4 to a friendly off-ramp; flags #3 as non-traditional structure.
 */
export function Step0FitCheck({ initialData, onChange, onValidityChange }: StepProps<Step0Data>) {
  const [fitChoice, setFitChoice] = useState<Step0Data["fit_choice"]>(
    (initialData?.fit_choice as Step0Data["fit_choice"]) ?? null,
  );

  useEffect(() => {
    onChange({ fit_choice: fitChoice });
    onValidityChange(fitChoice !== null);
  }, [fitChoice, onChange, onValidityChange]);

  if (fitChoice === "not_a_salon") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-muted/30 p-6 space-y-3">
          <div className="font-display text-sm uppercase tracking-wider text-foreground">
            Zura might not be for you yet
          </div>
          <p className="font-sans text-sm text-foreground leading-relaxed">
            Zura is purpose-built for salon, spa, and beauty operators. The
            intelligence, compensation, and operations layers assume that
            context.
          </p>
          <p className="font-sans text-sm text-muted-foreground leading-relaxed">
            If you're exploring out of curiosity, you're welcome to continue.
            If you operate a different kind of business, we'd rather you find
            software that fits.
          </p>
        </div>
        <div className="grid gap-2">
          {OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              description={opt.description}
              selected={fitChoice === opt.value}
              onClick={() => setFitChoice(opt.value)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {OPTIONS.map((opt) => (
        <Chip
          key={opt.value}
          label={opt.label}
          description={opt.description}
          selected={fitChoice === opt.value}
          onClick={() => setFitChoice(opt.value)}
        />
      ))}
      {fitChoice === "hybrid_unique" && (
        <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-4">
          <p className="font-sans text-xs text-muted-foreground leading-relaxed">
            Noted. We'll flag your operation as non-traditional and surface
            customization options at every step rather than forcing defaults.
          </p>
        </div>
      )}
    </div>
  );
}
