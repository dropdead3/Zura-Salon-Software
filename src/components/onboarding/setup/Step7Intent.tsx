import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Chip } from "./Chip";
import type { StepProps } from "./types";

interface Step7Data {
  intent: string[];
}

const INTENT_OPTIONS = [
  { value: "protect_margin", label: "Protect my margin", description: "Catch commission breaches, retail leakage, and pricing drift before they compound." },
  { value: "scale_locations", label: "Scale to more locations", description: "Standardize operations and benchmark performance across sites." },
  { value: "grow_team", label: "Build and develop my team", description: "Career pathways, coaching, accountability, and retention intelligence." },
  { value: "increase_retention", label: "Increase client retention", description: "Detect at-risk clients, surface rebook opportunities, automate reactivation." },
  { value: "reduce_chaos", label: "Reduce daily operational chaos", description: "Replace spreadsheets, group chats, and post-its with a single source of truth." },
  { value: "pay_correctly", label: "Pay people accurately and on time", description: "Automate payroll, tip distribution, and commission calculation." },
  { value: "marketing_lift", label: "Drive new client acquisition", description: "SEO, paid social, and reactivation campaigns with closed-loop attribution." },
  { value: "compliance", label: "Stay compliant", description: "Wage law, tip reporting, parental consent, refund handling — done right." },
];

/**
 * Step 7 — Intent. Multi-select. Drives sidebar persona, recommendation
 * engine prioritization, and the order intelligence surfaces.
 */
export function Step7Intent({ initialData, onChange, onValidityChange }: StepProps<Step7Data>) {
  const [intent, setIntent] = useState<string[]>(initialData?.intent ?? []);

  useEffect(() => {
    onChange({ intent });
    onValidityChange(intent.length >= 1);
  }, [intent, onChange, onValidityChange]);

  const toggle = (v: string) => {
    setIntent((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };

  return (
    <div className="space-y-4">
      <p className="font-sans text-sm text-muted-foreground leading-relaxed">
        Pick everything that resonates. This shapes which intelligence surfaces
        appear first and how Zura prioritizes recommendations.
      </p>

      <div className="grid sm:grid-cols-2 gap-2.5">
        {INTENT_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            description={opt.description}
            selected={intent.includes(opt.value)}
            onClick={() => toggle(opt.value)}
          />
        ))}
      </div>

      <p className="font-sans text-xs text-muted-foreground pt-2">
        You can change focus areas anytime in settings.
      </p>
    </div>
  );
}
