import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useState } from 'react';

/** Curated professional hair color palette, ordered dark → light, Clear last */
export const HAIR_COLOR_SWATCHES = [
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'Dark Brown', hex: '#3B2314' },
  { name: 'Medium Brown', hex: '#5C3A1E' },
  { name: 'Light Brown', hex: '#8B6239' },
  { name: 'Dark Copper', hex: '#8B3A0F' },
  { name: 'Copper', hex: '#B5541A' },
  { name: 'Dark Red', hex: '#6B1A1A' },
  { name: 'Red', hex: '#8B2020' },
  { name: 'Dark Gold', hex: '#7A5C1F' },
  { name: 'Gold', hex: '#B8860B' },
  { name: 'Dark Ash', hex: '#5A5A5A' },
  { name: 'Ash', hex: '#8A8A7B' },
  { name: 'Dark Blonde', hex: '#9B7B3A' },
  { name: 'Blonde', hex: '#C4A44A' },
  { name: 'Light Blonde', hex: '#D4C47A' },
  { name: 'Very Light Blonde', hex: '#E8DDB5' },
  { name: 'Platinum', hex: '#F0EAD6' },
  { name: 'Violet', hex: '#6B3A6B' },
  { name: 'Blue', hex: '#2A4A6B' },
  { name: 'Clear', hex: 'transparent' },
] as const;

interface SwatchPickerProps {
  value: string | null;
  onChange: (hex: string | null) => void;
  disabled?: boolean;
}

export function SwatchPicker({ value, onChange, disabled }: SwatchPickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (hex: string) => {
    onChange(hex === 'transparent' ? 'transparent' : hex);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'w-5 h-5 rounded-full shrink-0 transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-1',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
          style={
            value && value !== 'transparent'
              ? { backgroundColor: value, border: '2px solid hsl(var(--platform-border))' }
              : undefined
          }
          title={value ? 'Change swatch color' : 'Assign swatch color'}
        >
          {/* Empty state: dashed circle */}
          {!value && (
            <span className="block w-full h-full rounded-full border-2 border-dashed border-[hsl(var(--platform-foreground-muted)/0.4)]" />
          )}
          {/* Clear/transparent state: diagonal stripe */}
          {value === 'transparent' && (
            <span className="block w-full h-full rounded-full border-2 border-[hsl(var(--platform-border))] bg-white/90 relative overflow-hidden">
              <span className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent,transparent_3px,hsl(var(--platform-foreground-muted)/0.3)_3px,hsl(var(--platform-foreground-muted)/0.3)_4px)]" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-3 bg-[hsl(var(--platform-bg-card))] border-[hsl(var(--platform-border)/0.5)] backdrop-blur-xl"
        side="right"
        align="center"
        sideOffset={8}
      >
        <div className="space-y-2">
          <span className="font-sans text-[10px] text-[hsl(var(--platform-foreground-muted))] tracking-wide uppercase">
            Tone Swatch
          </span>
          <div className="grid grid-cols-5 gap-1.5">
            {HAIR_COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch.name}
                type="button"
                onClick={() => handleSelect(swatch.hex)}
                className={cn(
                  'w-7 h-7 rounded-full transition-all hover:scale-110 focus:outline-none relative',
                  value === swatch.hex && 'ring-2 ring-violet-500 ring-offset-1 ring-offset-[hsl(var(--platform-bg-card))]',
                )}
                title={swatch.name}
              >
                {swatch.hex === 'transparent' ? (
                  <span className="block w-full h-full rounded-full border-2 border-[hsl(var(--platform-border))] bg-white/90 relative overflow-hidden">
                    <span className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent,transparent_3px,hsl(var(--platform-foreground-muted)/0.3)_3px,hsl(var(--platform-foreground-muted)/0.3)_4px)]" />
                  </span>
                ) : (
                  <span
                    className="block w-full h-full rounded-full border border-black/10"
                    style={{ backgroundColor: swatch.hex }}
                  />
                )}
              </button>
            ))}
          </div>
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="w-full text-center font-sans text-[10px] text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))] transition-colors py-1"
            >
              Remove swatch
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
