import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type {
  CommissionBasis,
  TipHandling,
  AddonTreatment,
} from '@/hooks/useCompensationPlans';

interface Props {
  basis: CommissionBasis;
  tipHandling: TipHandling;
  refundClawback: boolean;
  addonTreatment: AddonTreatment;
  onChange: (patch: {
    commission_basis?: CommissionBasis;
    tip_handling?: TipHandling;
    refund_clawback?: boolean;
    addon_treatment?: AddonTreatment;
  }) => void;
}

export function UniversalModifiers({
  basis,
  tipHandling,
  refundClawback,
  addonTreatment,
  onChange,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>Commission basis</Label>
        <Select value={basis} onValueChange={(v) => onChange({ commission_basis: v as CommissionBasis })}>
          <SelectTrigger className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gross">Gross — pre-discount</SelectItem>
            <SelectItem value="net_of_discount">Net of discount</SelectItem>
            <SelectItem value="net_of_product_cost">Net of chemical/back-bar cost</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1.5 font-sans">
          What revenue commission is calculated against.
        </p>
      </div>

      <div>
        <Label>Tip handling</Label>
        <Select value={tipHandling} onValueChange={(v) => onChange({ tip_handling: v as TipHandling })}>
          <SelectTrigger className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="direct">Direct to stylist</SelectItem>
            <SelectItem value="pooled">Pooled and split</SelectItem>
            <SelectItem value="withheld_for_payout">Withheld for payroll payout</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Add-on treatment</Label>
        <Select value={addonTreatment} onValueChange={(v) => onChange({ addon_treatment: v as AddonTreatment })}>
          <SelectTrigger className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="same_as_parent">Same rate as parent service</SelectItem>
            <SelectItem value="separate_rate">Separate add-on rate</SelectItem>
            <SelectItem value="no_commission">No commission on add-ons</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-4">
        <div className="flex-1 min-w-0">
          <Label className="cursor-pointer">Refund clawback</Label>
          <p className="text-xs text-muted-foreground mt-1 font-sans">
            If a service is refunded after payout, deduct the commission from the next pay period. Some states restrict this.
          </p>
        </div>
        <Switch
          checked={refundClawback}
          onCheckedChange={(v) => onChange({ refund_clawback: v })}
        />
      </div>
    </div>
  );
}
