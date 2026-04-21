import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface RentalConfig {
  weekly_rent?: number;
  commission_above_rent?: number;
}

interface Props {
  config: RentalConfig;
  onChange: (next: RentalConfig) => void;
}

export function RentalTermsEditor({ config, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted/50 p-3 text-sm font-sans text-muted-foreground">
        Booth/chair renters are typically 1099 contractors. Confirm worker classification with counsel before assigning.
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="rent">Weekly rent ($)</Label>
          <Input
            id="rent"
            type="number"
            min="0"
            value={config.weekly_rent ?? 0}
            onChange={(e) =>
              onChange({ ...config, weekly_rent: Number(e.target.value) })
            }
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="rent-comm">House commission above rent %</Label>
          <Input
            id="rent-comm"
            type="number"
            step="0.5"
            min="0"
            value={((config.commission_above_rent ?? 0) * 100).toString()}
            onChange={(e) =>
              onChange({
                ...config,
                commission_above_rent: Number(e.target.value) / 100,
              })
            }
            className="mt-1.5"
          />
          <p className="text-xs text-muted-foreground mt-1.5 font-sans">
            Set to 0 for pure rent (renter keeps 100% above the floor).
          </p>
        </div>
      </div>
    </div>
  );
}
