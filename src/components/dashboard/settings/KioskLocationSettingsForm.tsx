import { useState, useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Loader2, Save, Image, RotateCcw, Upload, MapPin as MapPinIcon, Info, Shield, Eye, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { KioskMediaUploader } from './KioskMediaUploader';
import { KioskFeatureToggles } from './KioskFeatureToggles';
import { KioskDeployCard } from './KioskDeployCard';
import { KioskPreviewPanel } from './KioskPreviewPanel';

import { useLocations } from '@/hooks/useLocations';
import { 
  useKioskSettings, 
  useUpdateKioskSettings, 
  useLocationKioskOverrides,
  useResetLocationToDefaults,
  usePushLocationSettingsToAll,
  DEFAULT_KIOSK_SETTINGS 
} from '@/hooks/useKioskSettings';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useDashboardTheme } from '@/contexts/DashboardThemeContext';
import { colorThemes, ColorTheme } from '@/hooks/useColorTheme';
import { hslToHex } from '@/lib/colorUtils';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type LogoSource = 'auto' | 'org-light' | 'org-dark' | 'custom';

interface LocalSettings {
  background_color: string;
  accent_color: string;
  text_color: string;
  background_image_url: string | null;
  background_overlay_opacity: number;
  welcome_title: string;
  welcome_subtitle: string | null;
  check_in_prompt: string;
  success_message: string;
  button_style: 'rounded' | 'pill' | 'square';
  logo_url: string | null;
  logo_color: string | null;
  logo_size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  theme_mode: 'dark' | 'light' | 'auto';
  display_orientation: 'portrait' | 'landscape';
  idle_timeout_seconds: number;
  enable_walk_ins: boolean;
  enable_self_booking: boolean;
  self_booking_allow_future: boolean;
  self_booking_show_stylists: boolean;
  require_confirmation_tap: boolean;
  show_wait_time_estimate: boolean;
  show_stylist_photo: boolean;
  enable_feedback_prompt: boolean;
  enable_glow_effects: boolean;
  require_form_signing: boolean;
  exit_pin: string;
  idle_video_url: string | null;
  show_location_badge: boolean;
  location_badge_position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  location_badge_style: 'glass' | 'solid' | 'outline';
}

function convertGlobalThemeToKioskColors(
  theme: ColorTheme, 
  isDark: boolean
): { background_color: string; text_color: string; accent_color: string } {
  const themeData = colorThemes.find(t => t.id === theme);
  const preview = isDark ? themeData?.darkPreview : themeData?.lightPreview;
  return {
    background_color: hslToHex(preview?.bg || '40 30% 96%'),
    text_color: hslToHex(preview?.primary || '0 0% 8%'),
    accent_color: hslToHex(preview?.accent || '35 35% 82%'),
  };
}

function detectGlobalTheme(bg: string, text: string, accent: string): ColorTheme | 'custom' {
  for (const theme of colorThemes) {
    const lightColors = {
      background_color: hslToHex(theme.lightPreview.bg),
      text_color: hslToHex(theme.lightPreview.primary),
      accent_color: hslToHex(theme.lightPreview.accent),
    };
    if (
      lightColors.background_color.toLowerCase() === bg.toLowerCase() &&
      lightColors.text_color.toLowerCase() === text.toLowerCase() &&
      lightColors.accent_color.toLowerCase() === accent.toLowerCase()
    ) return theme.id;
    
    const darkColors = {
      background_color: hslToHex(theme.darkPreview.bg),
      text_color: hslToHex(theme.darkPreview.primary),
      accent_color: hslToHex(theme.darkPreview.accent),
    };
    if (
      darkColors.background_color.toLowerCase() === bg.toLowerCase() &&
      darkColors.text_color.toLowerCase() === text.toLowerCase() &&
      darkColors.accent_color.toLowerCase() === accent.toLowerCase()
    ) return theme.id;
  }
  return 'custom';
}

interface KioskLocationSettingsFormProps {
  locationId: string | null;
  orgId: string;
  locationName?: string;
  onPreviewOpen?: (settings: LocalSettings) => void;
}

export function KioskLocationSettingsForm({ locationId, orgId, locationName, onPreviewOpen }: KioskLocationSettingsFormProps) {
  const [themePreset, setThemePreset] = useState<ColorTheme | 'custom'>('cream');
  const [logoSource, setLogoSource] = useState<LogoSource>('auto');
  const [customLogoUrl, setCustomLogoUrl] = useState<string>('');
  const { data: locations = [] } = useLocations();
  const { data: businessSettings } = useBusinessSettings();
  const { resolvedTheme } = useDashboardTheme();

  const { data: kioskSettings, isLoading } = useKioskSettings(orgId, locationId || undefined);
  const updateSettings = useUpdateKioskSettings();
  const { data: locationOverrides = [] } = useLocationKioskOverrides(orgId);
  const resetToDefaults = useResetLocationToDefaults();
  const pushLocationToAll = usePushLocationSettingsToAll();

  const hasCustomOverride = locationId ? locationOverrides.includes(locationId) : false;

  const [localSettings, setLocalSettings] = useState<LocalSettings>({
    background_color: DEFAULT_KIOSK_SETTINGS.background_color,
    accent_color: DEFAULT_KIOSK_SETTINGS.accent_color,
    text_color: DEFAULT_KIOSK_SETTINGS.text_color,
    background_image_url: DEFAULT_KIOSK_SETTINGS.background_image_url,
    background_overlay_opacity: DEFAULT_KIOSK_SETTINGS.background_overlay_opacity,
    welcome_title: DEFAULT_KIOSK_SETTINGS.welcome_title,
    welcome_subtitle: DEFAULT_KIOSK_SETTINGS.welcome_subtitle,
    check_in_prompt: DEFAULT_KIOSK_SETTINGS.check_in_prompt,
    success_message: DEFAULT_KIOSK_SETTINGS.success_message,
    button_style: DEFAULT_KIOSK_SETTINGS.button_style,
    logo_url: DEFAULT_KIOSK_SETTINGS.logo_url,
    logo_color: DEFAULT_KIOSK_SETTINGS.logo_color,
    logo_size: DEFAULT_KIOSK_SETTINGS.logo_size,
    theme_mode: DEFAULT_KIOSK_SETTINGS.theme_mode,
    display_orientation: DEFAULT_KIOSK_SETTINGS.display_orientation,
    idle_timeout_seconds: DEFAULT_KIOSK_SETTINGS.idle_timeout_seconds,
    enable_walk_ins: DEFAULT_KIOSK_SETTINGS.enable_walk_ins,
    enable_self_booking: DEFAULT_KIOSK_SETTINGS.enable_self_booking,
    self_booking_allow_future: DEFAULT_KIOSK_SETTINGS.self_booking_allow_future,
    self_booking_show_stylists: DEFAULT_KIOSK_SETTINGS.self_booking_show_stylists,
    require_confirmation_tap: DEFAULT_KIOSK_SETTINGS.require_confirmation_tap,
    show_wait_time_estimate: DEFAULT_KIOSK_SETTINGS.show_wait_time_estimate,
    show_stylist_photo: DEFAULT_KIOSK_SETTINGS.show_stylist_photo,
    enable_feedback_prompt: DEFAULT_KIOSK_SETTINGS.enable_feedback_prompt,
    enable_glow_effects: DEFAULT_KIOSK_SETTINGS.enable_glow_effects,
    require_form_signing: DEFAULT_KIOSK_SETTINGS.require_form_signing,
    exit_pin: DEFAULT_KIOSK_SETTINGS.exit_pin,
    idle_video_url: DEFAULT_KIOSK_SETTINGS.idle_video_url,
    show_location_badge: DEFAULT_KIOSK_SETTINGS.show_location_badge,
    location_badge_position: DEFAULT_KIOSK_SETTINGS.location_badge_position,
    location_badge_style: DEFAULT_KIOSK_SETTINGS.location_badge_style,
  });

  const detectLogoSource = (logoUrl: string | null): LogoSource => {
    if (!logoUrl) return 'auto';
    if (businessSettings?.logo_light_url && logoUrl === businessSettings.logo_light_url) return 'org-light';
    if (businessSettings?.logo_dark_url && logoUrl === businessSettings.logo_dark_url) return 'org-dark';
    if (logoUrl) return 'custom';
    return 'auto';
  };

  const handleLogoSourceChange = (source: LogoSource) => {
    setLogoSource(source);
    switch (source) {
      case 'auto':
        setLocalSettings(prev => ({ ...prev, logo_url: null }));
        break;
      case 'org-light':
        setLocalSettings(prev => ({ ...prev, logo_url: businessSettings?.logo_light_url || null }));
        break;
      case 'org-dark':
        setLocalSettings(prev => ({ ...prev, logo_url: businessSettings?.logo_dark_url || null }));
        break;
      case 'custom':
        setLocalSettings(prev => ({ ...prev, logo_url: customLogoUrl || null }));
        break;
    }
  };

  useEffect(() => {
    if (kioskSettings) {
      setLocalSettings({
        background_color: kioskSettings.background_color,
        accent_color: kioskSettings.accent_color,
        text_color: kioskSettings.text_color,
        background_image_url: kioskSettings.background_image_url,
        background_overlay_opacity: kioskSettings.background_overlay_opacity ?? DEFAULT_KIOSK_SETTINGS.background_overlay_opacity,
        welcome_title: kioskSettings.welcome_title,
        welcome_subtitle: kioskSettings.welcome_subtitle,
        check_in_prompt: kioskSettings.check_in_prompt,
        success_message: kioskSettings.success_message,
        button_style: kioskSettings.button_style,
        logo_url: kioskSettings.logo_url,
        logo_color: kioskSettings.logo_color,
        logo_size: kioskSettings.logo_size,
        theme_mode: kioskSettings.theme_mode,
        display_orientation: kioskSettings.display_orientation,
        idle_timeout_seconds: kioskSettings.idle_timeout_seconds,
        enable_walk_ins: kioskSettings.enable_walk_ins,
        enable_self_booking: kioskSettings.enable_self_booking ?? DEFAULT_KIOSK_SETTINGS.enable_self_booking,
        self_booking_allow_future: kioskSettings.self_booking_allow_future ?? DEFAULT_KIOSK_SETTINGS.self_booking_allow_future,
        self_booking_show_stylists: kioskSettings.self_booking_show_stylists ?? DEFAULT_KIOSK_SETTINGS.self_booking_show_stylists,
        require_confirmation_tap: kioskSettings.require_confirmation_tap,
        show_wait_time_estimate: kioskSettings.show_wait_time_estimate,
        show_stylist_photo: kioskSettings.show_stylist_photo,
        enable_feedback_prompt: kioskSettings.enable_feedback_prompt,
        enable_glow_effects: kioskSettings.enable_glow_effects ?? DEFAULT_KIOSK_SETTINGS.enable_glow_effects,
        require_form_signing: kioskSettings.require_form_signing,
        exit_pin: kioskSettings.exit_pin,
        idle_video_url: kioskSettings.idle_video_url ?? null,
        show_location_badge: kioskSettings.show_location_badge ?? DEFAULT_KIOSK_SETTINGS.show_location_badge,
        location_badge_position: kioskSettings.location_badge_position ?? DEFAULT_KIOSK_SETTINGS.location_badge_position,
        location_badge_style: kioskSettings.location_badge_style ?? DEFAULT_KIOSK_SETTINGS.location_badge_style,
      });
      setThemePreset(detectGlobalTheme(kioskSettings.background_color, kioskSettings.text_color, kioskSettings.accent_color));
      const source = detectLogoSource(kioskSettings.logo_url);
      setLogoSource(source);
      if (source === 'custom' && kioskSettings.logo_url) setCustomLogoUrl(kioskSettings.logo_url);
    } else {
      setLocalSettings({
        background_color: DEFAULT_KIOSK_SETTINGS.background_color,
        accent_color: DEFAULT_KIOSK_SETTINGS.accent_color,
        text_color: DEFAULT_KIOSK_SETTINGS.text_color,
        background_image_url: DEFAULT_KIOSK_SETTINGS.background_image_url,
        background_overlay_opacity: DEFAULT_KIOSK_SETTINGS.background_overlay_opacity,
        welcome_title: DEFAULT_KIOSK_SETTINGS.welcome_title,
        welcome_subtitle: DEFAULT_KIOSK_SETTINGS.welcome_subtitle,
        check_in_prompt: DEFAULT_KIOSK_SETTINGS.check_in_prompt,
        success_message: DEFAULT_KIOSK_SETTINGS.success_message,
        button_style: DEFAULT_KIOSK_SETTINGS.button_style,
        logo_url: DEFAULT_KIOSK_SETTINGS.logo_url,
        logo_color: DEFAULT_KIOSK_SETTINGS.logo_color,
        logo_size: DEFAULT_KIOSK_SETTINGS.logo_size,
        theme_mode: DEFAULT_KIOSK_SETTINGS.theme_mode,
        display_orientation: DEFAULT_KIOSK_SETTINGS.display_orientation,
        idle_timeout_seconds: DEFAULT_KIOSK_SETTINGS.idle_timeout_seconds,
        enable_walk_ins: DEFAULT_KIOSK_SETTINGS.enable_walk_ins,
        enable_self_booking: DEFAULT_KIOSK_SETTINGS.enable_self_booking,
        self_booking_allow_future: DEFAULT_KIOSK_SETTINGS.self_booking_allow_future,
        self_booking_show_stylists: DEFAULT_KIOSK_SETTINGS.self_booking_show_stylists,
        require_confirmation_tap: DEFAULT_KIOSK_SETTINGS.require_confirmation_tap,
        show_wait_time_estimate: DEFAULT_KIOSK_SETTINGS.show_wait_time_estimate,
        show_stylist_photo: DEFAULT_KIOSK_SETTINGS.show_stylist_photo,
        enable_feedback_prompt: DEFAULT_KIOSK_SETTINGS.enable_feedback_prompt,
        enable_glow_effects: DEFAULT_KIOSK_SETTINGS.enable_glow_effects,
        require_form_signing: DEFAULT_KIOSK_SETTINGS.require_form_signing,
        exit_pin: DEFAULT_KIOSK_SETTINGS.exit_pin,
        idle_video_url: DEFAULT_KIOSK_SETTINGS.idle_video_url,
        show_location_badge: DEFAULT_KIOSK_SETTINGS.show_location_badge,
        location_badge_position: DEFAULT_KIOSK_SETTINGS.location_badge_position,
        location_badge_style: DEFAULT_KIOSK_SETTINGS.location_badge_style,
      });
      setThemePreset('cream');
      setLogoSource('auto');
    }
  }, [kioskSettings, businessSettings]);

  useEffect(() => {
    if (themePreset !== 'custom') {
      const isDark = localSettings.theme_mode === 'dark' || 
        (localSettings.theme_mode === 'auto' && resolvedTheme === 'dark');
      const colors = convertGlobalThemeToKioskColors(themePreset, isDark);
      setLocalSettings(prev => ({ ...prev, ...colors }));
    }
  }, [localSettings.theme_mode, themePreset, resolvedTheme]);

  useEffect(() => {
    if (localSettings.display_orientation === 'landscape') {
      if (localSettings.location_badge_position === 'top-center') {
        setLocalSettings(prev => ({ ...prev, location_badge_position: 'top-left' }));
      } else if (localSettings.location_badge_position === 'bottom-center') {
        setLocalSettings(prev => ({ ...prev, location_badge_position: 'bottom-left' }));
      }
    }
  }, [localSettings.display_orientation]);

  const availableBadgePositions = localSettings.display_orientation === 'landscape'
    ? ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const
    : ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const;

  const applyPreset = (preset: ColorTheme | 'custom') => {
    setThemePreset(preset);
    if (preset !== 'custom') {
      const isDark = localSettings.theme_mode === 'dark' || 
        (localSettings.theme_mode === 'auto' && resolvedTheme === 'dark');
      const colors = convertGlobalThemeToKioskColors(preset, isDark);
      setLocalSettings(prev => ({ ...prev, ...colors }));
    }
  };

  const updateField = <K extends keyof LocalSettings>(field: K, value: LocalSettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateSettings.mutate({
      organizationId: orgId,
      locationId,
      settings: localSettings,
    });
  };

  const handleResetToDefaults = () => {
    if (!locationId) return;
    resetToDefaults.mutate({ organizationId: orgId, locationId });
  };

  const handlePushLocationToAll = () => {
    if (!locationId) return;
    pushLocationToAll.mutate({ 
      organizationId: orgId, 
      sourceLocationId: locationId,
      settings: localSettings 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,400px),1fr] gap-6">
      {/* Left Column: Settings */}
      <div className="space-y-6">
        {/* Features Section */}
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Features</h4>
          <KioskFeatureToggles localSettings={localSettings} updateField={updateField} />
        </div>

      {/* Settings Tabs */}
      <div>
        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Settings</h4>
        <Tabs defaultValue="appearance" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="behavior">Behavior</TabsTrigger>
          </TabsList>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-4">
            {/* Mode Selector */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <Label className="text-sm font-medium">Display Mode</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'light' as const, label: 'Light' },
                  { value: 'dark' as const, label: 'Dark' },
                  { value: 'auto' as const, label: 'Auto' },
                ].map(mode => (
                  <button
                    key={mode.value}
                    type="button"
                    className={cn(
                      "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border transition-colors text-sm font-medium",
                      localSettings.theme_mode === mode.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => updateField('theme_mode', mode.value)}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <Label className="text-sm font-medium">Orientation</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'portrait' as const, label: 'Portrait' },
                  { value: 'landscape' as const, label: 'Landscape' },
                ].map(orient => (
                  <button
                    key={orient.value}
                    type="button"
                    className={cn(
                      "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border transition-colors text-sm font-medium",
                      localSettings.display_orientation === orient.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => updateField('display_orientation', orient.value)}
                  >
                    {orient.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Preset */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Color Theme</Label>
              <Select 
                value={themePreset} 
                onValueChange={(v) => applyPreset(v as ColorTheme | 'custom')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose theme" />
                </SelectTrigger>
                <SelectContent>
                  {colorThemes.map(theme => {
                    const isDark = localSettings.theme_mode === 'dark' || 
                      (localSettings.theme_mode === 'auto' && resolvedTheme === 'dark');
                    const preview = isDark ? theme.darkPreview : theme.lightPreview;
                    return (
                      <SelectItem key={theme.id} value={theme.id}>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            <span className="w-3 h-3 rounded-full border border-border/50" style={{ backgroundColor: `hsl(${preview.bg})` }} />
                            <span className="w-3 h-3 rounded-full border border-border/50" style={{ backgroundColor: `hsl(${preview.primary})` }} />
                            <span className="w-3 h-3 rounded-full border border-border/50" style={{ backgroundColor: `hsl(${preview.accent})` }} />
                          </div>
                          {theme.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                  <SelectItem value="custom">Custom Colors</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Color Pickers */}
            <div className={cn("grid grid-cols-2 gap-4 transition-opacity", themePreset !== 'custom' && "opacity-50")}>
              {[
                { field: 'background_color' as const, label: 'Background' },
                { field: 'accent_color' as const, label: 'Accent' },
                { field: 'text_color' as const, label: 'Text' },
              ].map(({ field, label }) => (
                <div key={field} className="space-y-2">
                  <Label className="text-sm">{label}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localSettings[field]}
                      onChange={(e) => { updateField(field, e.target.value); setThemePreset('custom'); }}
                      className="w-10 h-10 rounded-lg border cursor-pointer"
                    />
                    <Input
                      value={localSettings[field]}
                      onChange={(e) => { updateField(field, e.target.value); setThemePreset('custom'); }}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Button Style */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <Label className="text-sm font-medium">Button Style</Label>
              <Select 
                value={localSettings.button_style} 
                onValueChange={(v) => updateField('button_style', v as 'rounded' | 'pill' | 'square')}
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rounded">Rounded</SelectItem>
                  <SelectItem value="pill">Pill</SelectItem>
                  <SelectItem value="square">Square</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor={`glow-${locationId}`}>Glow Effects</Label>
                  <p className="text-xs text-muted-foreground">Add ambient glow to buttons</p>
                </div>
                <Switch
                  id={`glow-${locationId}`}
                  checked={localSettings.enable_glow_effects}
                  onCheckedChange={(v) => updateField('enable_glow_effects', v)}
                />
              </div>
            </div>

            {/* Logo */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Logo</Label>
              </div>
              <Select value={logoSource} onValueChange={(v) => handleLogoSourceChange(v as LogoSource)}>
                <SelectTrigger><SelectValue placeholder="Choose logo source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (based on mode)</SelectItem>
                  <SelectItem value="org-light" disabled={!businessSettings?.logo_light_url}>Organization Logo (Light)</SelectItem>
                  <SelectItem value="org-dark" disabled={!businessSettings?.logo_dark_url}>Organization Logo (Dark)</SelectItem>
                  <SelectItem value="custom">Custom URL</SelectItem>
                </SelectContent>
              </Select>
              {logoSource === 'custom' && (
                <Input
                  value={customLogoUrl}
                  onChange={(e) => { setCustomLogoUrl(e.target.value); setLocalSettings(prev => ({ ...prev, logo_url: e.target.value || null })); }}
                  placeholder="https://..."
                />
              )}
              {localSettings.logo_url && (
                <div className="flex justify-center p-4 rounded-xl bg-background border">
                  <img src={localSettings.logo_url} alt="Logo preview" className="h-12 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-sm">Logo Size</Label>
                <div className="grid grid-cols-5 gap-2">
                  {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={cn(
                        "flex items-center justify-center px-2 py-2 rounded-lg border transition-colors text-xs font-medium uppercase",
                        localSettings.logo_size === size ? "border-primary bg-primary/10 text-foreground" : "border-border hover:border-primary/50"
                      )}
                      onClick={() => updateField('logo_size', size)}
                    >
                      {size.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Logo Color Overlay</Label>
                  {localSettings.logo_color && (
                    <button type="button" onClick={() => updateField('logo_color', null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Clear</button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input type="color" value={localSettings.logo_color || '#000000'} onChange={(e) => updateField('logo_color', e.target.value)} className="w-10 h-10 rounded-lg border cursor-pointer" />
                  <Input value={localSettings.logo_color || ''} onChange={(e) => updateField('logo_color', e.target.value || null)} placeholder="No color overlay" className="font-mono text-sm" />
                </div>
              </div>
            </div>

            {/* Background Media */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <KioskMediaUploader
                imageUrl={localSettings.background_image_url}
                videoUrl={localSettings.idle_video_url}
                overlayOpacity={localSettings.background_overlay_opacity}
                onImageChange={(url) => updateField('background_image_url', url)}
                onVideoChange={(url) => updateField('idle_video_url', url)}
                organizationId={orgId}
              />
              {(localSettings.background_image_url || localSettings.idle_video_url) && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Overlay Darkness</Label>
                    <span className="text-xs text-muted-foreground">{Math.round(localSettings.background_overlay_opacity * 100)}%</span>
                  </div>
                  <Slider min={0} max={100} step={5} value={[localSettings.background_overlay_opacity * 100]} onValueChange={([v]) => updateField('background_overlay_opacity', v / 100)} />
                </div>
              )}
            </div>

            {/* Location Badge */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPinIcon className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Location Badge</Label>
                </div>
                <Switch checked={localSettings.show_location_badge} onCheckedChange={(v) => updateField('show_location_badge', v)} />
              </div>
              {localSettings.show_location_badge && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">Position</Label>
                    <div className={cn("grid gap-2", localSettings.display_orientation === 'landscape' ? "grid-cols-2" : "grid-cols-3")}>
                      {availableBadgePositions.map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          className={cn(
                            "px-2 py-2 rounded-lg border text-xs font-medium transition-colors text-center",
                            localSettings.location_badge_position === pos ? "border-primary bg-primary/10 text-foreground" : "border-border hover:border-primary/50"
                          )}
                          onClick={() => updateField('location_badge_position', pos)}
                        >
                          {pos.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Style</Label>
                    <Select value={localSettings.location_badge_style} onValueChange={(v) => updateField('location_badge_style', v as 'glass' | 'solid' | 'outline')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="glass">Glass (blur effect)</SelectItem>
                        <SelectItem value="solid">Solid (accent color)</SelectItem>
                        <SelectItem value="outline">Outline (transparent)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4">
            <div className="space-y-2">
              <Label>Welcome Title</Label>
              <Input value={localSettings.welcome_title} onChange={(e) => updateField('welcome_title', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Welcome Subtitle</Label>
              <Input value={localSettings.welcome_subtitle || ''} onChange={(e) => updateField('welcome_subtitle', e.target.value || null)} placeholder="Optional tagline or instructions" />
            </div>
            <div className="space-y-2">
              <Label>Check-In Prompt</Label>
              <Input value={localSettings.check_in_prompt} onChange={(e) => updateField('check_in_prompt', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Success Message</Label>
              <Input value={localSettings.success_message} onChange={(e) => updateField('success_message', e.target.value)} />
            </div>
          </TabsContent>

          {/* Behavior Tab */}
          <TabsContent value="behavior" className="space-y-4">
            <div className="space-y-2">
              <Label>Idle Timeout (seconds)</Label>
              <Input type="number" min={30} max={300} value={localSettings.idle_timeout_seconds} onChange={(e) => updateField('idle_timeout_seconds', parseInt(e.target.value) || 60)} />
              <p className="text-xs text-muted-foreground">How long before the kiosk returns to the idle screen</p>
            </div>
            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Security</Label>
              </div>
              <div className="space-y-2">
                <Label>Exit PIN (4 digits)</Label>
                <Input
                  value={localSettings.exit_pin}
                  onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 4); updateField('exit_pin', val); }}
                  maxLength={4}
                  className="font-mono max-w-24"
                />
                <p className="text-xs text-muted-foreground">Required to access settings from the kiosk device</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save {!locationId ? 'Defaults' : 'Settings'}
        </Button>

        {locationId && locations.length > 1 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size={tokens.button.card} disabled={pushLocationToAll.isPending}>
                {pushLocationToAll.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                Apply to All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Apply to All Locations?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will copy "{locationName}" settings to all other locations. Existing settings will be overwritten.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handlePushLocationToAll}>Yes, Apply to All</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {locationId && hasCustomOverride && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size={tokens.button.card} disabled={resetToDefaults.isPending}>
                {resetToDefaults.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                Reset to Defaults
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset to Defaults?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove custom settings for "{locationName}". This location will inherit from organization defaults.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetToDefaults}>Yes, Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

        {/* Deploy QR — only for specific locations */}
        {locationId && (
          <KioskDeployCard locationId={locationId} locationName={locationName} />
        )}
      </div>

      {/* Right Column: Sticky Live Preview */}
      <div className="sticky top-4 self-start">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Live Preview</h4>
          </div>
          {onPreviewOpen && (
            <Button
              variant="ghost"
              size={tokens.button.inline}
              className="h-7 text-xs"
              onClick={() => onPreviewOpen(localSettings)}
            >
              <Maximize2 className="w-3 h-3 mr-1" />
              Expand
            </Button>
          )}
        </div>
        <KioskPreviewPanel
          settings={localSettings}
          businessSettings={businessSettings}
          locationName={locationName}
        />
      </div>
    </div>
  );
}
