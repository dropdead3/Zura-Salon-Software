import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw, Palette } from 'lucide-react';
import type { BookingSurfaceTheme } from '@/hooks/useBookingSurfaceConfig';
import { DEFAULT_BOOKING_THEME } from '@/hooks/useBookingSurfaceConfig';

interface BookingThemeEditorProps {
  theme: BookingSurfaceTheme;
  onChange: (theme: BookingSurfaceTheme) => void;
}

const FONT_OPTIONS = [
  { value: 'inter', label: 'Inter' },
  { value: 'dm-sans', label: 'DM Sans' },
  { value: 'plus-jakarta', label: 'Plus Jakarta Sans' },
  { value: 'cormorant', label: 'Cormorant Garamond' },
  { value: 'playfair', label: 'Playfair Display' },
];

const RADIUS_OPTIONS = [
  { value: 'none', label: 'None (0px)' },
  { value: 'sm', label: 'Small (4px)' },
  { value: 'md', label: 'Medium (8px)' },
  { value: 'lg', label: 'Large (16px)' },
  { value: 'full', label: 'Full (pill)' },
];

const CARD_RADIUS_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
];

// Theme presets
const THEME_PRESETS: Record<string, Partial<BookingSurfaceTheme>> = {
  minimal: {
    primaryColor: '#18181b',
    secondaryColor: '#71717a',
    accentColor: '#a1a1aa',
    backgroundColor: '#ffffff',
    surfaceColor: '#fafafa',
    textColor: '#09090b',
    mutedTextColor: '#71717a',
    borderColor: '#e4e4e7',
    buttonRadius: 'sm',
    cardRadius: 'sm',
    fontFamily: 'inter',
    elevation: 'flat',
    density: 'comfortable',
    mode: 'light',
  },
  luxury: {
    primaryColor: '#92400e',
    secondaryColor: '#d97706',
    accentColor: '#fbbf24',
    backgroundColor: '#fffbeb',
    surfaceColor: '#fef3c7',
    textColor: '#451a03',
    mutedTextColor: '#92400e',
    borderColor: '#fde68a',
    buttonRadius: 'none',
    cardRadius: 'sm',
    fontFamily: 'cormorant',
    elevation: 'subtle',
    density: 'spacious',
    mode: 'light',
  },
  editorial: {
    primaryColor: '#111827',
    secondaryColor: '#6b7280',
    accentColor: '#ef4444',
    backgroundColor: '#f9fafb',
    surfaceColor: '#ffffff',
    textColor: '#111827',
    mutedTextColor: '#6b7280',
    borderColor: '#e5e7eb',
    buttonRadius: 'none',
    cardRadius: 'md',
    fontFamily: 'playfair',
    elevation: 'elevated',
    density: 'spacious',
    mode: 'light',
  },
  'soft-modern': {
    primaryColor: '#7c3aed',
    secondaryColor: '#a78bfa',
    accentColor: '#c4b5fd',
    backgroundColor: '#ffffff',
    surfaceColor: '#f8fafc',
    textColor: '#0f172a',
    mutedTextColor: '#64748b',
    borderColor: '#e2e8f0',
    buttonRadius: 'md',
    cardRadius: 'md',
    fontFamily: 'dm-sans',
    elevation: 'subtle',
    density: 'comfortable',
    mode: 'light',
  },
  'bold-fashion': {
    primaryColor: '#e11d48',
    secondaryColor: '#fb7185',
    accentColor: '#fda4af',
    backgroundColor: '#0c0a09',
    surfaceColor: '#1c1917',
    textColor: '#fafaf9',
    mutedTextColor: '#a8a29e',
    borderColor: '#292524',
    buttonRadius: 'full',
    cardRadius: 'lg',
    fontFamily: 'plus-jakarta',
    elevation: 'flat',
    density: 'comfortable',
    mode: 'dark',
  },
};

const PRESET_LABELS: Record<string, string> = {
  minimal: 'Minimal',
  luxury: 'Luxury',
  editorial: 'Editorial',
  'soft-modern': 'Soft Modern',
  'bold-fashion': 'Bold Fashion',
};

export function BookingThemeEditor({ theme, onChange }: BookingThemeEditorProps) {
  const [draft, setDraft] = useState(theme);

  const update = (key: keyof BookingSurfaceTheme, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => onChange(draft);

  const applyPreset = (presetKey: string) => {
    const preset = THEME_PRESETS[presetKey];
    if (preset) {
      const merged = { ...draft, ...preset };
      setDraft(merged);
    }
  };

  const resetToDefaults = () => {
    setDraft(DEFAULT_BOOKING_THEME);
  };

  const colorFields: { key: keyof BookingSurfaceTheme; label: string }[] = [
    { key: 'primaryColor', label: 'Primary' },
    { key: 'secondaryColor', label: 'Secondary' },
    { key: 'accentColor', label: 'Accent' },
    { key: 'backgroundColor', label: 'Background' },
    { key: 'surfaceColor', label: 'Surface / Card' },
    { key: 'textColor', label: 'Text' },
    { key: 'mutedTextColor', label: 'Muted Text' },
    { key: 'borderColor', label: 'Border' },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <Palette className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-display text-base tracking-wide">THEME CUSTOMIZATION</CardTitle>
              <CardDescription>Customize the look and feel of your booking experience</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={resetToDefaults}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Presets */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Theme Presets</Label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRESET_LABELS).map(([key, label]) => {
              const preset = THEME_PRESETS[key];
              return (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex -space-x-1">
                    <div className="w-4 h-4 rounded-full border border-background" style={{ backgroundColor: preset.primaryColor }} />
                    <div className="w-4 h-4 rounded-full border border-background" style={{ backgroundColor: preset.backgroundColor }} />
                    <div className="w-4 h-4 rounded-full border border-background" style={{ backgroundColor: preset.surfaceColor }} />
                  </div>
                  <span className="text-xs font-medium text-foreground">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Colors */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Colors</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {colorFields.map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draft[key] as string}
                    onChange={(e) => update(key, e.target.value)}
                    className="w-8 h-8 rounded border cursor-pointer"
                  />
                  <Input
                    value={draft[key] as string}
                    onChange={(e) => update(key, e.target.value)}
                    className="font-mono text-xs h-8"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Typography */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Font Family</Label>
            <Select value={draft.fontFamily} onValueChange={(v) => update('fontFamily', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Heading Style</Label>
            <Select value={draft.headingStyle} onValueChange={(v) => update('headingStyle', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="uppercase">UPPERCASE</SelectItem>
                <SelectItem value="titlecase">Title Case</SelectItem>
                <SelectItem value="lowercase">lowercase</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Shapes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Button Radius</Label>
            <Select value={draft.buttonRadius} onValueChange={(v) => update('buttonRadius', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RADIUS_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Card Radius</Label>
            <Select value={draft.cardRadius} onValueChange={(v) => update('cardRadius', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CARD_RADIUS_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Elevation</Label>
            <Select value={draft.elevation} onValueChange={(v) => update('elevation', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="flat">Flat</SelectItem>
                <SelectItem value="subtle">Subtle</SelectItem>
                <SelectItem value="elevated">Elevated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mode & density */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Mode</Label>
            <Select value={draft.mode} onValueChange={(v) => update('mode', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Density</Label>
            <Select value={draft.density} onValueChange={(v) => update('density', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Branding */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Branding</Label>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Logo URL</Label>
              <Input
                value={draft.logoUrl || ''}
                onChange={(e) => setDraft({ ...draft, logoUrl: e.target.value || null })}
                placeholder="https://yoursalon.com/logo.png"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Hero Image URL</Label>
              <Input
                value={draft.heroImageUrl || ''}
                onChange={(e) => setDraft({ ...draft, heroImageUrl: e.target.value || null })}
                placeholder="https://yoursalon.com/hero.jpg"
              />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} className="w-full sm:w-auto">
          Save Theme
        </Button>
      </CardContent>
    </Card>
  );
}
