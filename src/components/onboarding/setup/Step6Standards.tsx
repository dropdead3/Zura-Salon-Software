import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Chip } from "./Chip";
import type { StepProps } from "./types";

interface Step6Data {
  tip_distribution_rule: "individual" | "pooled" | "team_based" | "no_tips";
  commission_basis: "gross" | "net_of_fees" | "net_of_product";
  refund_clawback: "always" | "rare" | "never";
  has_existing_handbook: boolean;
}

const TIP_RULES = [
  { value: "individual", label: "Tips kept by the receiving stylist", description: "Standard. Each stylist keeps their own tips." },
  { value: "pooled", label: "Tips pooled and split", description: "All tips combined and distributed by hours, productivity, or equal share." },
  { value: "team_based", label: "Tips split with assistants", description: "Receiving stylist tips out their assistant or junior staff." },
  { value: "no_tips", label: "We don't accept tips", description: "No-tip salon model. Service prices reflect full compensation." },
];

const COMMISSION_BASIS = [
  { value: "gross", label: "Gross service revenue", description: "Commission calculated on the full service price before any deductions." },
  { value: "net_of_fees", label: "Net of card processing fees", description: "Card fees deducted from service revenue before commission applied." },
  { value: "net_of_product", label: "Net of product/back-bar costs", description: "Color and chemical product cost deducted before commission." },
];

const REFUND_CLAWBACK = [
  { value: "always", label: "Always — refunds reverse the stylist's commission", description: "Standard for protecting margin on color corrections and refund-prone work." },
  { value: "rare", label: "Sometimes — case-by-case manager call", description: "Most refunds aren't clawed back; egregious cases are." },
  { value: "never", label: "Never — the salon eats the refund", description: "Stylist commission is locked once earned." },
];

export function Step6Standards({ initialData, onChange, onValidityChange }: StepProps<Step6Data>) {
  const [tip, setTip] = useState<Step6Data["tip_distribution_rule"]>(
    initialData?.tip_distribution_rule ?? "individual",
  );
  const [basis, setBasis] = useState<Step6Data["commission_basis"]>(
    initialData?.commission_basis ?? "gross",
  );
  const [clawback, setClawback] = useState<Step6Data["refund_clawback"]>(
    initialData?.refund_clawback ?? "rare",
  );
  const [handbook, setHandbook] = useState(initialData?.has_existing_handbook ?? false);

  useEffect(() => {
    onChange({
      tip_distribution_rule: tip,
      commission_basis: basis,
      refund_clawback: clawback,
      has_existing_handbook: handbook,
    });
    onValidityChange(true); // Always valid — defaults are honest
  }, [tip, basis, clawback, handbook, onChange, onValidityChange]);

  return (
    <div className="space-y-7">
      <p className="font-sans text-sm text-muted-foreground leading-relaxed">
        Defaults below reflect what most operators choose. Change anything that
        doesn't match how you actually run.
      </p>

      <div className="space-y-3">
        <Label className="font-sans text-sm">How are tips handled?</Label>
        <div className="space-y-2.5">
          {TIP_RULES.map((r) => (
            <Chip
              key={r.value}
              label={r.label}
              description={r.description}
              selected={tip === r.value}
              onClick={() => setTip(r.value as Step6Data["tip_distribution_rule"])}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-3 border-t border-border/60">
        <Label className="font-sans text-sm">Commission is calculated on…</Label>
        <div className="space-y-2.5">
          {COMMISSION_BASIS.map((r) => (
            <Chip
              key={r.value}
              label={r.label}
              description={r.description}
              selected={basis === r.value}
              onClick={() => setBasis(r.value as Step6Data["commission_basis"])}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-3 border-t border-border/60">
        <Label className="font-sans text-sm">When a service is refunded, the stylist's commission is…</Label>
        <div className="space-y-2.5">
          {REFUND_CLAWBACK.map((r) => (
            <Chip
              key={r.value}
              label={r.label}
              description={r.description}
              selected={clawback === r.value}
              onClick={() => setClawback(r.value as Step6Data["refund_clawback"])}
            />
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-border/60">
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="font-sans text-sm text-foreground">Do you have an existing employee handbook?</div>
            <p className="font-sans text-xs text-muted-foreground mt-0.5">
              We'll offer to import or replace it during policy setup. Skip if you don't.
            </p>
          </div>
          <Switch checked={handbook} onCheckedChange={setHandbook} />
        </div>
      </div>
    </div>
  );
}
