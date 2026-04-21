import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ModelCard } from "./ModelCard";
import type { StepProps } from "./types";

interface Step4Data {
  models: string[];
  unmodeled_description?: string;
}

/** 9 plan types + Mixed + escape valve. Plain-language first. */
const PLAN_TYPES = [
  {
    key: "commission_flat",
    label: "Flat commission",
    technical: "service commission",
    description: "Stylists earn a fixed percentage of service revenue. Same rate for everyone, or per-stylist override.",
    defaultNote: "45–55% on services, 10–15% on retail",
    examples: [
      "Senior stylist earns 50% on every haircut and color service.",
      "Retail commission is a separate, lower percentage on take-home product.",
    ],
  },
  {
    key: "level_based",
    label: "Level-based ladder",
    technical: "tiered commission",
    description: "Stylists progress through levels (Apprentice → Senior → Master) with each level unlocking a higher commission rate.",
    defaultNote: "5–7 levels, weighted promotion criteria",
    examples: [
      "Level 1 stylist starts at 35%, advances to Level 2 (40%) after meeting retention and revenue thresholds.",
      "Promotions are review-based, not automatic.",
    ],
  },
  {
    key: "hourly",
    label: "Hourly wage",
    technical: "non-commission",
    description: "Stylists are paid an hourly rate regardless of service revenue. Common for assistants and apprentices.",
    defaultNote: "$15–22/hr for assistants",
    examples: [
      "Assistant earns $18/hr for shampoo, blowdry, and prep work.",
      "No commission; tips kept by the receiving stylist.",
    ],
  },
  {
    key: "hourly_plus_commission",
    label: "Hourly + commission",
    technical: "hybrid base pay",
    description: "Stylists earn an hourly base plus a smaller commission on services they perform.",
    defaultNote: "$15/hr base + 25–35% commission",
    examples: [
      "Junior stylist earns $15/hr plus 30% commission to bridge the gap to full commission.",
    ],
  },
  {
    key: "hourly_vs_commission",
    label: "Hourly vs commission (whichever is higher)",
    technical: "guaranteed base",
    description: "Each pay period, the stylist earns whichever is greater: their hourly wage or their commission.",
    defaultNote: "Used to comply with state minimum-wage laws",
    examples: [
      "If commission for the period totals $1,200 but hourly minimum is $1,500, the stylist receives $1,500.",
    ],
  },
  {
    key: "salary",
    label: "Salary",
    technical: "fixed weekly/annual pay",
    description: "Fixed pay regardless of services performed. Common for managers, educators, and senior leadership.",
    examples: [
      "Salon manager earns $1,400/week salary plus performance bonus.",
    ],
  },
  {
    key: "booth_rental",
    label: "Booth/chair rental",
    technical: "1099 independent contractor",
    description: "Stylists pay a weekly or monthly rent for use of a chair. They keep 100% of their service revenue and manage their own clients.",
    defaultNote: "$200–400/week per chair",
    examples: [
      "Stylist pays $300/week, sets their own prices, books their own clients.",
      "1099 tax classification — never W-2.",
    ],
  },
  {
    key: "team_based",
    label: "Team-based pay",
    technical: "salon-level revenue share",
    description: "All stylists are paid from a shared pool based on collective salon performance, not individual books.",
    defaultNote: "Aveda concept salons, no-tip salons",
    examples: [
      "Pool-based system where individual revenue isn't tracked per stylist.",
      "Used to discourage book-hoarding and reward team behavior.",
    ],
  },
  {
    key: "service_pricing_split",
    label: "Service-level pricing split",
    technical: "per-service commission tier",
    description: "Different commission rates per service category (e.g. color earns more than haircuts).",
    examples: [
      "50% on color, 45% on cuts, 35% on chemical straightening.",
    ],
  },
  {
    key: "mixed",
    label: "Mixed (different staff on different plans)",
    technical: "per-staff plan assignment",
    description: "Some staff are commission, some are hourly, some rent. We'll handle per-staff plan assignment in payroll setup.",
    defaultNote: "Common in growing salons",
    examples: [
      "Senior stylists on commission, assistants on hourly, two booth renters in back.",
    ],
  },
];

/**
 * Step 4 — Compensation. The marquee step. Multi-select supported because most
 * operations run more than one model. Escape valve preserves dignity for
 * non-traditional structures.
 */
export function Step4Compensation({
  initialData,
  onChange,
  onValidityChange,
}: StepProps<Step4Data>) {
  const [selected, setSelected] = useState<string[]>(initialData?.models ?? []);
  const [unmodeled, setUnmodeled] = useState(initialData?.unmodeled_description ?? "");
  const showsEscape = selected.includes("__escape__");

  useEffect(() => {
    onChange({
      models: selected,
      unmodeled_description: showsEscape ? unmodeled : undefined,
    });
    // Valid if at least one selection AND (if escape is selected, description is non-empty)
    const valid =
      selected.length > 0 && (!showsEscape || unmodeled.trim().length >= 10);
    onValidityChange(valid);
  }, [selected, unmodeled, showsEscape, onChange, onValidityChange]);

  const toggle = (key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  return (
    <div className="space-y-4">
      <p className="font-sans text-sm text-muted-foreground leading-relaxed">
        Select every model you currently use. Most salons use more than one.
        Plain-language names come first; technical terms are in parentheses.
      </p>

      <div className="space-y-3">
        {PLAN_TYPES.map((plan) => (
          <ModelCard
            key={plan.key}
            label={plan.label}
            technicalName={plan.technical}
            description={plan.description}
            examples={plan.examples}
            defaultNote={plan.defaultNote}
            selected={selected.includes(plan.key)}
            onClick={() => toggle(plan.key)}
          />
        ))}

        <ModelCard
          label="My structure isn't here"
          description="Tell us how you actually pay people. We'll match you to the closest model and flag anything that needs custom configuration."
          selected={showsEscape}
          onClick={() => toggle("__escape__")}
          escape
        />
      </div>

      {showsEscape && (
        <div className="space-y-2 pt-2">
          <Label htmlFor="unmodeled" className="font-sans text-sm">
            Describe how you pay your team
          </Label>
          <Textarea
            id="unmodeled"
            value={unmodeled}
            onChange={(e) => setUnmodeled(e.target.value)}
            placeholder="E.g. 'My senior stylists keep 60% of service revenue but pay back $50/week toward product. Two of them are also part-owners and split a bonus pool.'"
            rows={4}
            className="font-sans"
          />
          <p className="font-sans text-xs text-muted-foreground">
            We log this and surface a follow-up in Compensation Hub. Your setup
            won't be blocked.
          </p>
        </div>
      )}
    </div>
  );
}
