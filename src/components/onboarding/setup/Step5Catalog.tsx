import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Chip } from "./Chip";
import { Textarea } from "@/components/ui/textarea";
import type { StepProps } from "./types";

interface Step5Data {
  service_categories: string[];
  sells_retail: boolean;
  sells_packages: boolean;
  sells_memberships: boolean;
  serves_minors: boolean;
  unmodeled_categories?: string;
}

const CATEGORIES = [
  { value: "haircut", label: "Cuts & styling", description: "Haircuts, blowouts, blowdry styling, updos" },
  { value: "color", label: "Color services", description: "Single-process, highlights, balayage, color correction" },
  { value: "chemical", label: "Chemical services", description: "Perms, relaxers, smoothing/keratin, bond builders" },
  { value: "extensions", label: "Hair extensions", description: "Tape-in, sew-in, clip-in, fusion" },
  { value: "treatment", label: "Conditioning treatments", description: "Olaplex, deep conditioning, scalp treatments" },
  { value: "barbering", label: "Barbering", description: "Beard work, hot towel shaves, fades" },
  { value: "spa", label: "Spa services", description: "Facials, waxing, lashes, brows, makeup" },
  { value: "nails", label: "Nail services", description: "Manicures, pedicures, gel, acrylic" },
];

export function Step5Catalog({ initialData, onChange, onValidityChange }: StepProps<Step5Data>) {
  const [categories, setCategories] = useState<string[]>(initialData?.service_categories ?? []);
  const [retail, setRetail] = useState(initialData?.sells_retail ?? true);
  const [packages, setPackages] = useState(initialData?.sells_packages ?? false);
  const [memberships, setMemberships] = useState(initialData?.sells_memberships ?? false);
  const [minors, setMinors] = useState(initialData?.serves_minors ?? false);
  const [unmodeled, setUnmodeled] = useState(initialData?.unmodeled_categories ?? "");
  const [showOther, setShowOther] = useState(!!initialData?.unmodeled_categories);

  useEffect(() => {
    onChange({
      service_categories: categories,
      sells_retail: retail,
      sells_packages: packages,
      sells_memberships: memberships,
      serves_minors: minors,
      unmodeled_categories: showOther && unmodeled.trim() ? unmodeled : undefined,
    });
    onValidityChange(categories.length > 0 || (showOther && unmodeled.trim().length >= 5));
  }, [categories, retail, packages, memberships, minors, unmodeled, showOther, onChange, onValidityChange]);

  const toggle = (v: string) => {
    setCategories((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="font-sans text-sm">What service categories do you offer?</Label>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {CATEGORIES.map((c) => (
            <Chip
              key={c.value}
              label={c.label}
              description={c.description}
              selected={categories.includes(c.value)}
              onClick={() => toggle(c.value)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowOther((v) => !v)}
          className="font-sans text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
        >
          {showOther ? "Hide" : "My category isn't listed"}
        </button>
        {showOther && (
          <Textarea
            value={unmodeled}
            onChange={(e) => setUnmodeled(e.target.value)}
            placeholder="Describe what you offer that isn't covered above"
            rows={3}
            className="font-sans"
          />
        )}
      </div>

      <div className="space-y-3 pt-3 border-t border-border/60">
        <Label className="font-sans text-sm">Beyond services, do you also sell:</Label>
        <div className="space-y-3">
          {[
            { key: "retail", label: "Retail products", value: retail, setter: setRetail, hint: "Take-home product (shampoo, conditioner, styling)" },
            { key: "packages", label: "Service packages or bundles", value: packages, setter: setPackages, hint: "Pre-paid multi-service bundles or course-of-treatment" },
            { key: "memberships", label: "Memberships or subscriptions", value: memberships, setter: setMemberships, hint: "Recurring monthly access or service credits" },
          ].map((row) => (
            <div key={row.key} className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="font-sans text-sm text-foreground">{row.label}</div>
                <p className="font-sans text-xs text-muted-foreground mt-0.5">{row.hint}</p>
              </div>
              <Switch checked={row.value} onCheckedChange={row.setter} />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-3 border-t border-border/60">
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="font-sans text-sm text-foreground">Do you serve minors?</div>
            <p className="font-sans text-xs text-muted-foreground mt-0.5">
              Triggers parental consent forms for chemical services and stricter intake.
            </p>
          </div>
          <Switch checked={minors} onCheckedChange={setMinors} />
        </div>
      </div>
    </div>
  );
}
