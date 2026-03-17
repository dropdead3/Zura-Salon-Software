import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';

export interface SwatchEntry {
  name: string;
  hex: string;
}

export interface SwatchSection {
  label: string;
  swatches: SwatchEntry[];
}

/** Curated professional hair color palette organized by tone family */
export const HAIR_COLOR_SECTIONS: SwatchSection[] = [
  {
    label: 'Natural',
    swatches: [
      { name: 'Black', hex: '#1a1a1a' },
      { name: 'Darkest Brown', hex: '#2B1810' },
      { name: 'Dark Brown', hex: '#3B2314' },
      { name: 'Dark Chocolate', hex: '#4A2C17' },
      { name: 'Medium Brown', hex: '#5C3A1E' },
      { name: 'Chestnut Brown', hex: '#6B4423' },
      { name: 'Light Brown', hex: '#8B6239' },
      { name: 'Caramel Brown', hex: '#A0703C' },
      { name: 'Dark Blonde', hex: '#9B7B3A' },
      { name: 'Medium Blonde', hex: '#B09040' },
      { name: 'Blonde', hex: '#C4A44A' },
      { name: 'Light Blonde', hex: '#D4C47A' },
      { name: 'Very Light Blonde', hex: '#E8DDB5' },
      { name: 'Platinum', hex: '#F0EAD6' },
      { name: 'White Blonde', hex: '#F8F4E8' },
    ],
  },
  {
    label: 'Ash / Cool',
    swatches: [
      { name: 'Darkest Ash', hex: '#3A3A3A' },
      { name: 'Dark Ash Brown', hex: '#4A4A42' },
      { name: 'Dark Ash', hex: '#5A5A5A' },
      { name: 'Ash Brown', hex: '#6B6B5E' },
      { name: 'Ash', hex: '#8A8A7B' },
      { name: 'Light Ash', hex: '#A8A898' },
      { name: 'Silver Ash', hex: '#B8B8AC' },
      { name: 'Pewter', hex: '#9A9A90' },
      { name: 'Smoke', hex: '#C5C5BB' },
      { name: 'Cool Beige', hex: '#D5CFC0' },
      { name: 'Icy Blonde', hex: '#E8E4D8' },
    ],
  },
  {
    label: 'Gold / Warm',
    swatches: [
      { name: 'Dark Gold', hex: '#7A5C1F' },
      { name: 'Gold Brown', hex: '#8C6E28' },
      { name: 'Warm Gold', hex: '#9E7E30' },
      { name: 'Gold', hex: '#B8860B' },
      { name: 'Golden Blonde', hex: '#C4981E' },
      { name: 'Honey', hex: '#D4A830' },
      { name: 'Champagne', hex: '#D9C48E' },
      { name: 'Butter Blonde', hex: '#E0CC80' },
      { name: 'Light Gold', hex: '#E8D8A0' },
      { name: 'Warm Platinum', hex: '#EDE4C0' },
    ],
  },
  {
    label: 'Red',
    swatches: [
      { name: 'Darkest Red', hex: '#4A0E0E' },
      { name: 'Burgundy', hex: '#5B1414' },
      { name: 'Dark Red', hex: '#6B1A1A' },
      { name: 'Wine', hex: '#7A1E1E' },
      { name: 'Red', hex: '#8B2020' },
      { name: 'Bright Red', hex: '#A52828' },
      { name: 'Cherry', hex: '#B22222' },
      { name: 'Mahogany', hex: '#7B3838' },
      { name: 'Red-Brown', hex: '#8B4040' },
      { name: 'Strawberry', hex: '#C45050' },
      { name: 'Rose Red', hex: '#D06060' },
    ],
  },
  {
    label: 'Copper / Auburn',
    swatches: [
      { name: 'Dark Auburn', hex: '#6A2E12' },
      { name: 'Auburn', hex: '#7E3410' },
      { name: 'Dark Copper', hex: '#8B3A0F' },
      { name: 'Russet', hex: '#9A4414' },
      { name: 'Copper', hex: '#B5541A' },
      { name: 'Titian', hex: '#C06020' },
      { name: 'Bright Copper', hex: '#CC6C28' },
      { name: 'Ginger', hex: '#D08030' },
      { name: 'Copper Blonde', hex: '#D89840' },
      { name: 'Light Copper', hex: '#E0A850' },
    ],
  },
  {
    label: 'Violet / Mauve',
    swatches: [
      { name: 'Dark Plum', hex: '#3E1C3E' },
      { name: 'Plum', hex: '#502850' },
      { name: 'Deep Violet', hex: '#5C305C' },
      { name: 'Violet', hex: '#6B3A6B' },
      { name: 'Mauve', hex: '#7E4E7E' },
      { name: 'Orchid', hex: '#926092' },
      { name: 'Lavender', hex: '#9E789E' },
      { name: 'Light Violet', hex: '#B090B0' },
      { name: 'Rose Mauve', hex: '#C0A0B8' },
    ],
  },
  {
    label: 'Blue / Teal',
    swatches: [
      { name: 'Dark Navy', hex: '#1A2A40' },
      { name: 'Navy', hex: '#1E3450' },
      { name: 'Steel Blue', hex: '#2A4060' },
      { name: 'Blue', hex: '#2A4A6B' },
      { name: 'Denim', hex: '#3A5A7A' },
      { name: 'Teal', hex: '#2A6060' },
      { name: 'Slate', hex: '#4A6070' },
      { name: 'Light Blue', hex: '#5A7A90' },
    ],
  },
  {
    label: 'Pastel',
    swatches: [
      { name: 'Pastel Pink', hex: '#F4C2C2' },
      { name: 'Pastel Rose', hex: '#F2B5D4' },
      { name: 'Pastel Peach', hex: '#FADADD' },
      { name: 'Pastel Coral', hex: '#F5B7A8' },
      { name: 'Pastel Lavender', hex: '#D4B8E0' },
      { name: 'Pastel Lilac', hex: '#C8A2D0' },
      { name: 'Pastel Blue', hex: '#A8C8E8' },
      { name: 'Pastel Mint', hex: '#A8E0C8' },
      { name: 'Pastel Green', hex: '#B8E0B0' },
      { name: 'Pastel Yellow', hex: '#F8E8A0' },
      { name: 'Pastel Apricot', hex: '#F8D0A0' },
      { name: 'Pastel Silver', hex: '#D8D8E0' },
    ],
  },
  {
    label: 'Vivid / Fashion',
    swatches: [
      { name: 'Hot Pink', hex: '#FF1493' },
      { name: 'Magenta', hex: '#E020A0' },
      { name: 'Fuchsia', hex: '#C02080' },
      { name: 'Electric Purple', hex: '#8B00FF' },
      { name: 'Neon Violet', hex: '#9400D3' },
      { name: 'Electric Blue', hex: '#0050FF' },
      { name: 'Cyan', hex: '#00B4D8' },
      { name: 'Neon Green', hex: '#39FF14' },
      { name: 'Vivid Orange', hex: '#FF6600' },
      { name: 'Fire Red', hex: '#EE0000' },
      { name: 'Vivid Yellow', hex: '#FFD700' },
      { name: 'Vivid Coral', hex: '#FF5050' },
    ],
  },
  {
    label: 'Clear',
    swatches: [
      { name: 'Clear', hex: 'transparent' },
    ],
  },
];

/** Flat array of all swatches for palette-membership checks */
export const HAIR_COLOR_SWATCHES = HAIR_COLOR_SECTIONS.flatMap((s) => s.swatches);

interface SwatchPickerProps {
  value: string | null;
  suggestedValue?: string | null;
  onChange: (hex: string | null) => void;
  disabled?: boolean;
}

export function SwatchPicker({ value, suggestedValue, onChange, disabled }: SwatchPickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (hex: string) => {
    onChange(hex === 'transparent' ? 'transparent' : hex);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setOpen(false);
  };

  const displayHex = value ?? suggestedValue ?? null;
  const isSuggested = !value && !!suggestedValue;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'w-5 h-5 rounded-full shrink-0 transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-1',
            disabled && 'opacity-50 cursor-not-allowed',
            isSuggested && 'opacity-50 border-2 border-dashed border-[hsl(var(--platform-foreground-muted)/0.4)]',
          )}
          style={
            displayHex && displayHex !== 'transparent'
              ? {
                  backgroundColor: displayHex,
                  ...(!isSuggested && { boxShadow: '0 0 0 1.5px rgba(255,255,255,0.15)' }),
                }
              : undefined
          }
          title={
            isSuggested
              ? 'Suggested — click to confirm'
              : value
                ? 'Change swatch color'
                : 'Assign swatch color'
          }
        >
          {!displayHex && (
            <span className="block w-full h-full rounded-full border-2 border-dashed border-[hsl(var(--platform-foreground-muted)/0.4)]" />
          )}
          {displayHex === 'transparent' && (
            <span
              className={cn(
                'block w-full h-full rounded-full bg-white/90 relative overflow-hidden',
                isSuggested
                  ? 'border-2 border-dashed border-[hsl(var(--platform-foreground-muted)/0.6)]'
                  : 'border-2 border-[hsl(var(--platform-border))]',
              )}
            >
              <span className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent,transparent_3px,hsl(var(--platform-foreground-muted)/0.3)_3px,hsl(var(--platform-foreground-muted)/0.3)_4px)]" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-3 bg-[hsl(var(--platform-bg-card))] border-[hsl(var(--platform-border)/0.5)] backdrop-blur-xl"
        side="right"
        align="start"
        sideOffset={8}
      >
        <div className="space-y-1">
          <span className="font-sans text-[10px] text-[hsl(var(--platform-foreground-muted))] tracking-wide uppercase">
            Tone Swatch
          </span>
          {isSuggested && suggestedValue && (
            <button
              type="button"
              onClick={() => handleSelect(suggestedValue)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[hsl(var(--platform-border)/0.3)] transition-colors"
            >
              <span
                className="w-5 h-5 rounded-full border-2 border-dashed border-violet-400/60 shrink-0"
                style={suggestedValue !== 'transparent' ? { backgroundColor: suggestedValue } : undefined}
              />
              <span className="font-sans text-[11px] text-violet-400">
                Use suggestion
              </span>
            </button>
          )}
          <ScrollArea className="max-h-[350px]">
            <div className="space-y-2 pr-2">
              {HAIR_COLOR_SECTIONS.map((section) => (
                <div key={section.label}>
                  <span className="font-sans text-[9px] text-[hsl(var(--platform-foreground-muted)/0.6)] tracking-wider uppercase block mb-1">
                    {section.label}
                  </span>
                  <div className="grid grid-cols-8 gap-1">
                    {section.swatches.map((swatch) => (
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
                </div>
              ))}
            </div>
          </ScrollArea>
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
