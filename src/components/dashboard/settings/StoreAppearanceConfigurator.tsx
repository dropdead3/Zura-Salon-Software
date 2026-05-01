import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Monitor, Smartphone, RefreshCw, Save, Loader2, Palette, Check } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useToast } from '@/hooks/use-toast';
import {
  useWebsiteRetailThemeSettings,
  useUpdateWebsiteRetailThemeSettings,
  type WebsiteRetailThemeSettings,
} from '@/hooks/useWebsiteSettings';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { hslToHex, hexToHsl } from '@/lib/colorUtils';
import { isStructurallyEqual } from '@/lib/stableStringify';

// ─── Theme presets ───
const THEME_PRESETS: Record<string, { label: string; swatch: string; colors: WebsiteRetailThemeSettings['custom_colors'] }> = {
  cream: {
    label: 'Cream',
    swatch: 'bg-[hsl(40_30%_96%)]',
    colors: { primary: '40 60% 40%', background: '40 30% 96%', card: '40 25% 93%', foreground: '40 25% 12%' },
  },
  rose: {
    label: 'Rose',
    swatch: 'bg-[hsl(350_30%_96%)]',
    colors: { primary: '350 60% 55%', background: '350 30% 97%', card: '350 25% 95%', foreground: '350 25% 12%' },
  },
  sage: {
    label: 'Sage',
    swatch: 'bg-[hsl(150_20%_95%)]',
    colors: { primary: '150 40% 40%', background: '150 20% 95%', card: '150 18% 92%', foreground: '150 25% 12%' },
  },
  ocean: {
    label: 'Ocean',
    swatch: 'bg-[hsl(210_30%_96%)]',
    colors: { primary: '210 60% 50%', background: '210 30% 96%', card: '210 25% 93%', foreground: '210 25% 12%' },
  },
};

const FONT_OPTIONS = [
  { value: 'Aeonik Pro', label: 'Aeonik Pro' },
  { value: 'Termina', label: 'Termina' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'DM Sans', label: 'DM Sans' },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Lora', label: 'Lora' },
];

const DEFAULT_THEME: WebsiteRetailThemeSettings = {
  base_theme: 'cream',
  custom_colors: THEME_PRESETS.cream.colors,
  heading_font: 'Termina',
  body_font: 'Aeonik Pro',
  show_logo: true,
};

interface StoreAppearanceConfiguratorProps {
  storeUrl: string;
}

export function StoreAppearanceConfigurator({ storeUrl }: StoreAppearanceConfiguratorProps) {
  const { data: savedTheme, isLoading } = useWebsiteRetailThemeSettings();
  const updateTheme = useUpdateWebsiteRetailThemeSettings();
  const { toast } = useToast();

  const [local, setLocal] = useState<WebsiteRetailThemeSettings>(DEFAULT_THEME);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);
  const [iframeLoading, setIframeLoading] = useState(true);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);

  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (savedTheme) setLocal(savedTheme);
  }, [savedTheme]);

  const hasChanges = savedTheme && !isStructurallyEqual(local, savedTheme);

  // Build preview URL with encoded theme
  const previewUrl = useMemo(() => {
    if (!storeUrl) return '';
    const encoded = btoa(JSON.stringify(local));
    return `${storeUrl}?preview_theme=${encoded}`;
  }, [storeUrl, local]);

  const handlePresetSelect = (key: string) => {
    const preset = THEME_PRESETS[key];
    if (!preset) return;
    setLocal(prev => ({
      ...prev,
      base_theme: key,
      custom_colors: { ...preset.colors },
    }));
  };

  const handleColorChange = (field: keyof WebsiteRetailThemeSettings['custom_colors'], value: string) => {
    setLocal(prev => ({
      ...prev,
      custom_colors: { ...prev.custom_colors, [field]: value },
    }));
  };

  const handleSave = () => {
    updateTheme.mutate(
      { key: 'website_retail_theme', value: local },
      {
        onSuccess: () => toast({ title: 'Saved', description: 'Store appearance updated.' }),
        onError: () => toast({ variant: 'destructive', title: 'Error', description: 'Failed to save appearance.' }),
      }
    );
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setIframeLoading(true);
  };

  // Debounce iframe refresh on color/font changes
  useEffect(() => {
    setIframeLoading(true);
    const t = setTimeout(() => setRefreshKey(k => k + 1), 400);
    return () => clearTimeout(t);
  }, [local]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <DashboardLoader size="md" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Palette className="w-4 h-4" />
            STORE APPEARANCE
          </CardTitle>
          <CardDescription>Customize your standalone store's look to match your salon brand.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Base Theme Swatches */}
          <div className="space-y-2">
            <Label className="text-xs font-medium font-display uppercase tracking-wider text-muted-foreground">Base Theme</Label>
            <div className="flex gap-3">
              {Object.entries(THEME_PRESETS).map(([key, { label, swatch }]) => (
                <button
                  key={key}
                  onClick={() => handlePresetSelect(key)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all',
                    local.base_theme === key
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/40'
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-full border border-border/50', swatch)} />
                  <span className="text-[10px] font-medium">{label}</span>
                  {local.base_theme === key && <Check className="w-3 h-3 text-primary" />}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div className="space-y-3">
            <Label className="text-xs font-medium font-display uppercase tracking-wider text-muted-foreground">Custom Brand Colors</Label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: 'primary' as const, label: 'Primary (buttons, links)' },
                { key: 'background' as const, label: 'Background' },
                { key: 'card' as const, label: 'Card / Surface' },
                { key: 'foreground' as const, label: 'Text' },
              ]).map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs">{label}</Label>
                  <div className="flex items-center gap-2">
                    <label className="relative w-8 h-8 rounded-md border border-border shrink-0 cursor-pointer overflow-hidden">
                      <div
                        className="absolute inset-0"
                        style={{ backgroundColor: `hsl(${local.custom_colors[key]})` }}
                      />
                      <input
                        type="color"
                        value={hslToHex(local.custom_colors[key])}
                        onChange={(e) => handleColorChange(key, hexToHsl(e.target.value))}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                    <span className="text-xs font-mono text-muted-foreground select-all">
                      {local.custom_colors[key]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fonts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Heading Font</Label>
              <Select value={local.heading_font} onValueChange={(v) => setLocal(prev => ({ ...prev, heading_font: v }))}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map(f => (
                    <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Body Font</Label>
              <Select value={local.body_font} onValueChange={(v) => setLocal(prev => ({ ...prev, body_font: v }))}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map(f => (
                    <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Logo Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Show logo in store header</p>
              <p className="text-xs text-muted-foreground">Display your salon logo above the store name</p>
            </div>
            <Switch
              checked={local.show_logo}
              onCheckedChange={(v) => setLocal(prev => ({ ...prev, show_logo: v }))}
            />
          </div>

          {/* Save */}
          {hasChanges && (
            <Button onClick={handleSave} disabled={updateTheme.isPending} className="w-full">
              {updateTheme.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Appearance
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Live Preview */}
      {storeUrl && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-lg">LIVE PREVIEW</CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size={tokens.button.inline}
                    className={cn("h-7 px-2", viewMode === 'desktop' && "bg-background shadow-sm")}
                    onClick={() => setViewMode('desktop')}
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size={tokens.button.inline}
                    className={cn("h-7 px-2", viewMode === 'mobile' && "bg-background shadow-sm")}
                    onClick={() => setViewMode('mobile')}
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="ghost" size={tokens.button.inline} onClick={handleRefresh} className="h-7 w-7 p-0">
                  <RefreshCw className={cn("h-4 w-4", iframeLoading && "animate-spin")} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
              ref={previewContainerRef}
              className={cn(
                'mx-auto rounded-lg overflow-hidden border border-border bg-muted/30 transition-all duration-300 relative',
                viewMode === 'mobile' ? 'max-w-[280px]' : 'w-full'
              )}
              style={{
                height: viewMode === 'mobile'
                  ? `${280 * (844 / 390)}px`
                  : `${containerWidth * (900 / 1440)}px`,
                maxHeight: viewMode === 'mobile' ? '500px' : '450px',
              }}
            >
              <div
                className="absolute top-0 left-0 origin-top-left"
                style={{
                  width: viewMode === 'mobile' ? '390px' : '1440px',
                  height: viewMode === 'mobile' ? '844px' : '900px',
                  transform: viewMode === 'mobile'
                    ? `scale(${280 / 390})`
                    : `scale(${containerWidth / 1440})`,
                }}
              >
                <iframe
                  key={refreshKey}
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title="Store Preview"
                  onLoad={() => setIframeLoading(false)}
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
