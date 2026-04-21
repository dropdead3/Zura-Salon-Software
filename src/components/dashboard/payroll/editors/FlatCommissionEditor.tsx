import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface FlatCommissionConfig {
  service_rate?: number;
  retail_rate?: number;
}

interface Props {
  config: FlatCommissionConfig;
  onChange: (next: FlatCommissionConfig) => void;
}

export function FlatCommissionEditor({ config, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="svc-rate">Service commission %</Label>
        <Input
          id="svc-rate"
          type="number"
          step="0.5"
          min="0"
          max="100"
          value={((config.service_rate ?? 0) * 100).toString()}
          onChange={(e) =>
            onChange({ ...config, service_rate: Number(e.target.value) / 100 })
          }
          className="mt-1.5"
        />
        <p className="text-xs text-muted-foreground mt-1.5 font-sans">
          Paid on every service this stylist performs.
        </p>
      </div>
      <div>
        <Label htmlFor="retail-rate">Retail commission %</Label>
        <Input
          id="retail-rate"
          type="number"
          step="0.5"
          min="0"
          max="100"
          value={((config.retail_rate ?? 0) * 100).toString()}
          onChange={(e) =>
            onChange({ ...config, retail_rate: Number(e.target.value) / 100 })
          }
          className="mt-1.5"
        />
        <p className="text-xs text-muted-foreground mt-1.5 font-sans">
          Paid on retail products sold by this stylist.
        </p>
      </div>
    </div>
  );
}
