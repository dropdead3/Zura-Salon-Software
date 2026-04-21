import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

export interface CategoryConfig {
  rates_by_category?: Record<string, number>;
  retail_rate?: number;
}

const DEFAULT_CATEGORIES = ['color', 'cut', 'extensions', 'treatment'];

interface Props {
  config: CategoryConfig;
  onChange: (next: CategoryConfig) => void;
}

export function CategoryRateMatrix({ config, onChange }: Props) {
  const rates = config.rates_by_category ?? Object.fromEntries(
    DEFAULT_CATEGORIES.map((c) => [c, 0.4]),
  );
  const entries = Object.entries(rates);

  const update = (key: string, rate: number) => {
    onChange({ ...config, rates_by_category: { ...rates, [key]: rate } });
  };

  const rename = (oldKey: string, newKey: string) => {
    if (!newKey || newKey === oldKey) return;
    const next: Record<string, number> = {};
    entries.forEach(([k, v]) => {
      next[k === oldKey ? newKey : k] = v;
    });
    onChange({ ...config, rates_by_category: next });
  };

  const remove = (key: string) => {
    const next = { ...rates };
    delete next[key];
    onChange({ ...config, rates_by_category: next });
  };

  const add = () => {
    let n = 1;
    let key = `category_${n}`;
    while (rates[key] !== undefined) {
      n += 1;
      key = `category_${n}`;
    }
    onChange({ ...config, rates_by_category: { ...rates, [key]: 0.4 } });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Rate by service category</Label>
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-12 gap-2 px-2 text-xs text-muted-foreground font-sans">
            <div className="col-span-7">Category</div>
            <div className="col-span-4">Rate %</div>
            <div className="col-span-1" />
          </div>
          {entries.map(([key, rate]) => (
            <div key={key} className="grid grid-cols-12 gap-2 items-center">
              <Input
                value={key}
                onChange={(e) => rename(key, e.target.value)}
                className="col-span-7"
              />
              <Input
                type="number"
                step="0.5"
                value={rate * 100}
                onChange={(e) => update(key, Number(e.target.value) / 100)}
                className="col-span-4"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(key)}
                className="col-span-1"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={add} className="mt-3">
          <Plus className="w-4 h-4 mr-1.5" />
          Add category
        </Button>
        <p className="text-xs text-muted-foreground mt-2 font-sans">
          Match category names to your service catalog (color, cut, extensions, treatment, etc.).
        </p>
      </div>

      <div>
        <Label htmlFor="cat-retail">Retail commission %</Label>
        <Input
          id="cat-retail"
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
