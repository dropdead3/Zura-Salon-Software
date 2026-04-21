import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Chip } from "./Chip";
import { NumberStepper } from "./NumberStepper";
import type { StepProps } from "./types";

interface Step3Data {
  team_size_band: "1-3" | "4-10" | "11-25" | "26+";
  total_team_count: number;
  has_apprentices: boolean;
  has_booth_renters: boolean;
  has_assistants: boolean;
  has_front_desk: boolean;
  unmodeled_structure?: string;
}

const SIZE_BANDS: Array<{ value: Step3Data["team_size_band"]; label: string; description: string }> = [
  { value: "1-3", label: "1–3 people", description: "Solo or very small team" },
  { value: "4-10", label: "4–10 people", description: "Established small salon" },
  { value: "11-25", label: "11–25 people", description: "Mid-size operation" },
  { value: "26+", label: "26+ people", description: "Multi-location or enterprise" },
];

/**
 * Step 3 — Your team. Drives stylist levels, career pathway, and conflict
 * detection (e.g. apprentices without hourly comp).
 */
export function Step3Team({ initialData, onChange, onValidityChange }: StepProps<Step3Data>) {
  const [band, setBand] = useState<Step3Data["team_size_band"]>(
    (initialData?.team_size_band as Step3Data["team_size_band"]) ?? "4-10",
  );
  const [count, setCount] = useState((initialData?.total_team_count as number) ?? 5);
  const [hasApprentices, setHasApprentices] = useState(
    (initialData?.has_apprentices as boolean) ?? false,
  );
  const [hasRenters, setHasRenters] = useState(
    (initialData?.has_booth_renters as boolean) ?? false,
  );
  const [hasAssistants, setHasAssistants] = useState(
    (initialData?.has_assistants as boolean) ?? false,
  );
  const [hasFrontDesk, setHasFrontDesk] = useState(
    (initialData?.has_front_desk as boolean) ?? false,
  );
  const [unmodeled, setUnmodeled] = useState((initialData?.unmodeled_structure as string) ?? "");

  useEffect(() => {
    onChange({
      team_size_band: band,
      total_team_count: count,
      has_apprentices: hasApprentices,
      has_booth_renters: hasRenters,
      has_assistants: hasAssistants,
      has_front_desk: hasFrontDesk,
      unmodeled_structure: unmodeled || undefined,
    });
    onValidityChange(count > 0);
  }, [band, count, hasApprentices, hasRenters, hasAssistants, hasFrontDesk, unmodeled, onChange, onValidityChange]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="font-sans text-sm">Team size</Label>
        <div className="grid sm:grid-cols-2 gap-2">
          {SIZE_BANDS.map((b) => (
            <Chip
              key={b.value}
              label={b.label}
              description={b.description}
              selected={band === b.value}
              onClick={() => setBand(b.value)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="font-sans text-sm">Total people on payroll today</Label>
        <NumberStepper value={count} onChange={setCount} min={1} max={500} label="people" />
      </div>

      <div className="space-y-3">
        <Label className="font-sans text-sm">Roles in your operation</Label>
        <div className="rounded-xl border border-border bg-card/40 divide-y divide-border/60">
          {[
            {
              label: "Apprentices",
              description: "Stylists earning their chair, typically hourly.",
              checked: hasApprentices,
              setter: setHasApprentices,
            },
            {
              label: "Booth renters",
              description: "Independent contractors paying rent for chair space.",
              checked: hasRenters,
              setter: setHasRenters,
            },
            {
              label: "Assistants",
              description: "Support staff who shampoo, prep, or assist services.",
              checked: hasAssistants,
              setter: setHasAssistants,
            },
            {
              label: "Front desk",
              description: "Reception, booking, and client coordination staff.",
              checked: hasFrontDesk,
              setter: setHasFrontDesk,
            },
          ].map((role) => (
            <div key={role.label} className="flex items-center justify-between p-4">
              <div className="flex-1 min-w-0 pr-4">
                <div className="font-sans text-sm text-foreground">{role.label}</div>
                <div className="font-sans text-xs text-muted-foreground">
                  {role.description}
                </div>
              </div>
              <Switch checked={role.checked} onCheckedChange={role.setter} />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-sans text-sm">
          My structure isn't here{" "}
          <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          value={unmodeled}
          onChange={(e) => setUnmodeled(e.target.value)}
          placeholder="Describe how your team is structured if it doesn't match the roles above."
          className="font-sans resize-none"
          rows={3}
        />
        <p className="font-sans text-xs text-muted-foreground">
          We log this for product feedback. Your setup proceeds either way.
        </p>
      </div>
    </div>
  );
}
