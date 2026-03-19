/**
 * DockWeightInput — Mobile-optimized numpad weight entry.
 * Large touch targets for salon backroom use (gloved hands).
 */

import { useState } from 'react';
import { Delete, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DockWeightInputProps {
  onSubmit: (weight: number) => void;
  onCancel: () => void;
  label?: string;
  unit?: string;
}

const NUMPAD_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'del'],
];

export function DockWeightInput({ onSubmit, onCancel, label = 'Enter Weight', unit = 'g' }: DockWeightInputProps) {
  const [value, setValue] = useState('');

  const handleKey = (key: string) => {
    if (key === 'del') {
      setValue((prev) => prev.slice(0, -1));
    } else if (key === '.') {
      if (!value.includes('.')) setValue((prev) => prev + '.');
    } else {
      // Limit to reasonable precision
      const parts = value.split('.');
      if (parts[1] && parts[1].length >= 2) return;
      setValue((prev) => prev + key);
    }
  };

  const handleConfirm = () => {
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      onSubmit(num);
    }
  };

  const parsedValue = parseFloat(value) || 0;

  return (
    <div className="flex flex-col items-center px-4 py-6">
      {/* Label */}
      <p className="text-[10px] font-medium tracking-wide uppercase text-[hsl(var(--platform-foreground-muted)/0.6)] mb-3">
        {label}
      </p>

      {/* Display */}
      <div className="flex items-baseline justify-center gap-1 mb-6">
        <span className={cn(
          'font-display text-4xl tracking-tight transition-colors',
          value ? 'text-[hsl(var(--platform-foreground))]' : 'text-[hsl(var(--platform-foreground-muted)/0.3)]'
        )}>
          {value || '0'}
        </span>
        <span className="text-lg text-[hsl(var(--platform-foreground-muted)/0.5)]">{unit}</span>
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-[280px]">
        {NUMPAD_KEYS.flat().map((key) => (
          <button
            key={key}
            onClick={() => handleKey(key)}
            className={cn(
              'h-14 rounded-xl text-lg font-medium transition-all duration-100 active:scale-95',
              key === 'del'
                ? 'bg-[hsl(var(--platform-bg-card))] text-[hsl(var(--platform-foreground-muted))] border border-[hsl(var(--platform-border)/0.2)]'
                : 'bg-[hsl(var(--platform-bg-elevated))] text-[hsl(var(--platform-foreground))] border border-[hsl(var(--platform-border)/0.15)] hover:bg-[hsl(var(--platform-bg-card))]'
            )}
          >
            {key === 'del' ? <Delete className="w-5 h-5 mx-auto" /> : key}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 w-full max-w-[280px] mt-4">
        <button
          onClick={onCancel}
          className="flex-1 h-12 rounded-xl border border-[hsl(var(--platform-border)/0.3)] text-[hsl(var(--platform-foreground-muted))] text-sm font-medium transition-colors hover:bg-[hsl(var(--platform-bg-card))]"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={parsedValue <= 0}
          className="flex-1 h-12 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          Confirm
        </button>
      </div>
    </div>
  );
}
