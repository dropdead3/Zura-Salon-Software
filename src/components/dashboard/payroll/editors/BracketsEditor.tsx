import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface Bracket {
  min: number;
  max?: number | null;
  rate: number;
}

export interface SlidingConfig {
  brackets?: Bracket[];
  retail_rate?: number;
  window_weeks?: 4 | 13;
}

interface Props {
  config: SlidingConfig;
  onChange: (next: SlidingConfig) => void;
  showTrailingWindow?: boolean;
}

export function BracketsEditor({ config, onChange, showTrailingWindow }: Props) {
  const brackets: Bracket[] = config.brackets ?? [
    { min: 0, max: 3000, rate: 0.4 },
    { min: 3000, max: 5000, rate: 0.45 },
    { min: 5000, max: null, rate: 0.5 },
  ];

  const update = (idx: number, patch: Partial<Bracket>) => {
    const next = brackets.map((b, i) => (i === idx ? { ...b, ...patch } : b));
    onChange({ ...config, brackets: next });
  };

  const add = () => {
    const last = brackets[brackets.length - 1];
    const newMin = last?.max ?? (last?.min ?? 0) + 1000;
    onChange({
      ...config,
      brackets: [
        ...brackets.map((b, i) =>
          i === brackets.length - 1 ? { ...b, max: newMin } : b,
        ),
        { min: newMin, max: null, rate: (last?.rate ?? 0.4) + 0.05 },
      ],
    });
  };

  const remove = (idx: number) => {
    if (brackets.length <= 1) return;
    onChange({ ...config, brackets: brackets.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-4">
      {showTrailingWindow && (
        <div>
          <Label>Trailing window</Label>
          <Select
            value={String(config.window_weeks ?? 4)}
            onValueChange={(v) =>
              onChange({ ...config, window_weeks: Number(v) as 4 | 13 })
            }
          >
            <SelectTrigger className="mt-1.5 max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4">4 weeks</SelectItem>
              <SelectItem value="13">13 weeks</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1.5 font-sans">
            Bracket for this period is set by the rolling average of the past N weeks.
          </p>
        </div>
      )}

      <div>
        <Label>Service revenue brackets</Label>
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-12 gap-2 px-2 text-xs text-muted-foreground font-sans">
            <div className="col-span-4">Min ($)</div>
            <div className="col-span-4">Max ($) — blank for ∞</div>
            <div className="col-span-3">Rate %</div>
            <div className="col-span-1" />
          </div>
          {brackets.map((b, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <Input
                type="number"
                value={b.min}
                onChange={(e) => update(idx, { min: Number(e.target.value) })}
                className="col-span-4"
              />
              <Input
                type="number"
                value={b.max ?? ''}
                placeholder="∞"
                onChange={(e) =>
                  update(idx, {
                    max: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                className="col-span-4"
              />
              <Input
                type="number"
                step="0.5"
                value={b.rate * 100}
                onChange={(e) => update(idx, { rate: Number(e.target.value) / 100 })}
                className="col-span-3"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(idx)}
                disabled={brackets.length <= 1}
                className="col-span-1"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={add} className="mt-3">
          <Plus className="w-4 h-4 mr-1.5" />
          Add bracket
        </Button>
      </div>

      <div>
        <Label htmlFor="sliding-retail">Retail commission %</Label>
        <Input
          id="sliding-retail"
          type="number"
          step="0.5"
          value={((config.retail_rate ?? 0) * 100).toString()}
          onChange={(e) =>
            onChange({ ...config, retail_rate: Number(e.target.value) / 100 })
          }
          className="mt-1.5 max-w-xs"
        />
      </div>
    </div>
  );
}
