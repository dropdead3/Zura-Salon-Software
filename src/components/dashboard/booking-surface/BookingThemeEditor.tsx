import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BookingSurfaceTheme } from '@/hooks/useBookingSurfaceConfig';

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

export function BookingThemeEditor({ theme, onChange }: BookingThemeEditorProps) {
  const [draft, setDraft] = useState(theme);

  const update = (key: keyof BookingSurfaceTheme, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => onChange(draft);

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
        <CardTitle className="font-display text-base tracking-wide">THEME CUSTOMIZATION</CardTitle>
        <CardDescription>Customize the look and feel of your booking experience</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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

        {/* Radius, Elevation, Density */}
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

        <Button onClick={handleSave} className="w-full sm:w-auto">
          Save Theme
        </Button>
      </CardContent>
    </Card>
  );
}
