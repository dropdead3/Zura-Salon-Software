import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface HourlyConfig {
  hourly_rate?: number;
  service_rate?: number;
  retail_rate?: number;
}

interface Props {
  config: HourlyConfig;
  onChange: (next: HourlyConfig) => void;
  variant: 'vs' | 'plus';
}

export function HourlyCommissionEditor({ config, onChange, variant }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted/50 p-3 text-sm font-sans text-muted-foreground">
        {variant === 'vs'
          ? 'Payroll pays the higher of: hours × hourly rate OR commission earned. Common for CA/NY compliance.'
          : 'Hourly base wage plus commission stacked on top. Common for apprentice and training programs.'}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="hourly">Hourly rate ($)</Label>
          <Input
            id="hourly"
            type="number"
            step="0.25"
            min="0"
            value={config.hourly_rate ?? 0}
            onChange={(e) =>
              onChange({ ...config, hourly_rate: Number(e.target.value) })
            }
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="svc">Service %</Label>
          <Input
            id="svc"
            type="number"
            step="0.5"
            value={((config.service_rate ?? 0) * 100).toString()}
            onChange={(e) =>
              onChange({ ...config, service_rate: Number(e.target.value) / 100 })
            }
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="retail">Retail %</Label>
          <Input
            id="retail"
            type="number"
            step="0.5"
            value={((config.retail_rate ?? 0) * 100).toString()}
            onChange={(e) =>
              onChange({ ...config, retail_rate: Number(e.target.value) / 100 })
            }
            className="mt-1.5"
          />
        </div>
      </div>
    </div>
  );
}
