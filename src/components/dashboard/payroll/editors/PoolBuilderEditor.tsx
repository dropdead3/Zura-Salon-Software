import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export interface PoolConfig {
  split_method?: 'hours_worked' | 'fixed_pct';
  service_rate?: number;
  retail_rate?: number;
  members?: Array<{ user_id: string; pct?: number }>;
}

interface Props {
  config: PoolConfig;
  onChange: (next: PoolConfig) => void;
}

export function PoolBuilderEditor({ config, onChange }: Props) {
  const split = config.split_method ?? 'hours_worked';

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted/50 p-3 text-sm font-sans text-muted-foreground">
        Service revenue from everyone on this plan is pooled, then split. Tip-pool rules apply (FLSA §3(m)) — owners and managers cannot share.
      </div>

      <div>
        <Label>Split method</Label>
        <Select
          value={split}
          onValueChange={(v) => onChange({ ...config, split_method: v as PoolConfig['split_method'] })}
        >
          <SelectTrigger className="mt-1.5 max-w-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hours_worked">Split by hours worked</SelectItem>
            <SelectItem value="fixed_pct">Fixed % per member</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1.5 font-sans">
          Members are managed in the Assignments tab on the plan editor.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="pool-svc">Pool service commission %</Label>
          <Input
            id="pool-svc"
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
          <Label htmlFor="pool-retail">Retail commission %</Label>
          <Input
            id="pool-retail"
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
