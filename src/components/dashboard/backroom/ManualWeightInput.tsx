/**
 * ManualWeightInput — Large iPad-friendly numeric input for weight entry.
 * Optimized for one-handed, fast entry in a salon backroom.
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Scale } from 'lucide-react';

interface ManualWeightInputProps {
  onSubmit: (weight: number, unit: string) => void;
  unit?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function ManualWeightInput({
  onSubmit,
  unit = 'g',
  label = 'Weight',
  placeholder = '0.00',
  disabled = false,
}: ManualWeightInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    const weight = parseFloat(value);
    if (isNaN(weight) || weight <= 0) return;
    onSubmit(weight, unit);
    setValue('');
  };

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Label className="font-sans text-xs text-muted-foreground">{label}</Label>
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="h-12 text-lg font-display tabular-nums"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
      </div>
      <span className="pb-3 text-sm text-muted-foreground font-sans">{unit}</span>
      <Button
        size="lg"
        onClick={handleSubmit}
        disabled={disabled || !value || parseFloat(value) <= 0}
        className="h-12 min-w-[48px] shrink-0"
      >
        <Scale className="w-4 h-4 mr-1.5" />
        Capture
      </Button>
    </div>
  );
}
