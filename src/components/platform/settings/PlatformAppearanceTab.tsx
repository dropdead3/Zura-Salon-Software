import { Moon, Sun, Monitor, Check, Palette, Upload, ImageIcon, Crown, Save, RotateCcw, Sparkles, Loader } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { usePlatformTheme } from '@/contexts/PlatformThemeContext';
import { usePlatformBranding, PlatformBranding, LoaderStyleOption } from '@/hooks/usePlatformBranding';
import { ZuraLoader } from '@/components/ui/ZuraLoader';
import { SpinnerLoader, DotsLoader, BarLoader, LuxeLoader } from '@/components/ui/loaders';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '../ui/PlatformCard';
import { PlatformButton } from '../ui/PlatformButton';
import { PlatformThemeEditor } from './PlatformThemeEditor';
import { PlatformLabel as Label } from '../ui/PlatformLabel';

type ThemeOption = 'light' | 'dark' | 'system';

const themeOptions: { value: ThemeOption; label: string; icon: typeof Sun; description: string }[] = [
  { value: 'light', label: 'Light', icon: Sun, description: 'Soft lavender with purple accents' },
  { value: 'dark', label: 'Dark', icon: Moon, description: 'Deep slate with violet glow' },
  { value: 'system', label: 'System', icon: Monitor, description: 'Follow your device settings' },
];

interface LogoUploadProps {
  label: string;
  description: string;
  currentUrl: string | null;
  onUpload: (url: string) => void;
  onRemove: () => void;
  variant: 'light' | 'dark';
}

function LogoUpload({ label, description, currentUrl, onUpload, onRemove, variant }: LogoUploadProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'Please upload an image file (PNG, JPG, SVG, or WebP)', variant: 'destructive' });
      return;
    }
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `platform-logo-${variant}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('business-logos').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('business-logos').getPublicUrl(fileName);
      onUpload(publicUrl);
      toast({ title: 'Logo uploaded', description: 'Your logo has been uploaded successfully.' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: 'Failed to upload logo. Please try again.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const bgClass = variant === 'light' 
    ? 'bg-white border-[hsl(var(--platform-border)/0.3)]' 
    : 'bg-[hsl(var(--platform-bg-elevated))] border-[hsl(var(--platform-border))]';

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs mt-0.5 text-[hsl(var(--platform-muted))]">{description}</p>
      </div>
      
      <div className={cn(
        'relative flex items-center justify-center h-24 rounded-lg border-2 border-dashed transition-colors',
        bgClass,
        !currentUrl && 'hover:border-[hsl(var(--platform-primary)/0.5)]'
      )}>
        {currentUrl ? (
          <div className="flex items-center gap-4">
            <img src={currentUrl} alt={label} className="h-12 object-contain" />
            <PlatformButton
              variant="ghost"
              size={tokens.button.inline}
              onClick={onRemove}
              className="text-[hsl(var(--platform-muted))] hover:text-red-400"
            >
              Remove
            </PlatformButton>
          </div>
        ) : (
          <label className="flex flex-col items-center gap-2 cursor-pointer p-4">
            <div className="p-2 rounded-lg bg-[hsl(var(--platform-bg-card)/0.5)]">
              {isUploading ? (
                <Upload className="h-5 w-5 text-[hsl(var(--platform-primary))] animate-pulse" />
              ) : (
                <ImageIcon className="h-5 w-5 text-[hsl(var(--platform-muted))]" />
              )}
            </div>
            <span className="text-xs text-[hsl(var(--platform-muted))]">
              {isUploading ? 'Uploading...' : 'Click to upload'}
            </span>
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={isUploading} />
          </label>
        )}
      </div>
    </div>
  );
}

export function PlatformAppearanceTab() {
  const { theme, setTheme, resolvedTheme } = usePlatformTheme();
  const { branding, saveBranding, isSaving } = usePlatformBranding();
  const { hasPlatformRoleOrHigher } = useAuth();
  const [localBranding, setLocalBranding] = useState<PlatformBranding>(branding);
  const [hasChanges, setHasChanges] = useState(false);
  const isPlatformOwner = hasPlatformRoleOrHigher('platform_owner');

  useEffect(() => { setLocalBranding(branding); }, [branding]);
  useEffect(() => {
    const isChanged = JSON.stringify(localBranding) !== JSON.stringify(branding);
    setHasChanges(isChanged);
  }, [localBranding, branding]);

  const handleLogoUpdate = (key: keyof PlatformBranding, value: string | null) => {
    setLocalBranding((prev) => ({ ...prev, [key]: value }));
  };

  const handleThemeColorsChange = (colors: Record<string, string>) => {
    setLocalBranding((prev) => ({ ...prev, theme_colors: colors }));
  };

  const handleSave = () => { saveBranding(localBranding); };
  const handleDiscard = () => {
    setLocalBranding(branding);
    if (branding.theme_colors) {
      Object.entries(branding.theme_colors).forEach(([key, value]) => {
        if (value) { document.documentElement.style.setProperty(`--${key}`, value); }
        else { document.documentElement.style.removeProperty(`--${key}`); }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Save Actions Header */}
      {hasChanges && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between p-4 w-auto max-w-xl bg-card/80 backdrop-blur-xl rounded-xl border border-border/40 shadow-[0_16px_40px_-18px_hsl(var(--foreground)/0.25)]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-foreground">You have unsaved changes</span>
          </div>
          <div className="flex items-center gap-2">
            <PlatformButton variant="ghost" size={tokens.button.card} onClick={handleDiscard} disabled={isSaving}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Discard
            </PlatformButton>
            <PlatformButton variant="glow" size={tokens.button.card} onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </PlatformButton>
          </div>
        </div>
      )}

      {/* Theme Selection Card */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-[hsl(var(--platform-primary))]" />
            Theme Mode
          </PlatformCardTitle>
          <PlatformCardDescription>
            Choose how the platform admin interface appears
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    'relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200',
                    isSelected
                      ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/20'
                      : 'border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.3)] hover:border-[hsl(var(--platform-border))] hover:bg-[hsl(var(--platform-bg-card)/0.5)]'
                  )}
                >
                  {/* Preview Box */}
                  <div className={cn(
                    'w-full aspect-video rounded-lg overflow-hidden border',
                    option.value === 'dark' || (option.value === 'system' && resolvedTheme === 'dark')
                      ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-violet-900/30 border-slate-700'
                      : 'bg-gradient-to-br from-violet-50 via-purple-50 to-lavender-100 border-violet-200'
                  )}>
                    <div className="p-2 h-full flex flex-col gap-1">
                      <div className={cn(
                        'w-1/4 h-full rounded',
                        option.value === 'dark' || (option.value === 'system' && resolvedTheme === 'dark')
                          ? 'bg-slate-800'
                          : 'bg-white/80'
                      )} />
                    </div>
                  </div>

                  {/* Icon and Label */}
                  <div className="flex items-center gap-2">
                    <Icon className={cn(
                      'h-4 w-4',
                      isSelected ? 'text-[hsl(var(--platform-primary))]' : 'text-[hsl(var(--platform-muted))]'
                    )} />
                    <span className={cn(
                      'font-medium',
                      isSelected ? 'text-[hsl(var(--platform-foreground))]' : 'text-[hsl(var(--platform-foreground)/0.85)]'
                    )}>
                      {option.label}
                    </span>
                  </div>

                  <p className="text-xs text-center text-[hsl(var(--platform-muted))]">
                    {option.description}
                  </p>

                  {isSelected && (
                    <div className="absolute top-3 right-3 p-1 rounded-full bg-violet-500">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </PlatformCardContent>
      </PlatformCard>

      {/* Login Logo Configuration Card */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-[hsl(var(--platform-primary))]" />
            Login Logo
          </PlatformCardTitle>
          <PlatformCardDescription>
            Logo displayed on the platform login page. Falls back to the dark mode sidebar logo if not set.
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent>
          <div className="max-w-sm">
            <LogoUpload
              label="Login Page Logo"
              description="White/light logo for the dark login background (recommended: 200x50px)"
              currentUrl={localBranding.login_logo_url}
              onUpload={(url) => handleLogoUpdate('login_logo_url', url)}
              onRemove={() => handleLogoUpdate('login_logo_url', null)}
              variant="dark"
            />
          </div>
        </PlatformCardContent>
      </PlatformCard>

      {/* Full Logo Configuration Card */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-[hsl(var(--platform-primary))]" />
            Full Logos
          </PlatformCardTitle>
          <PlatformCardDescription>
            Primary logos shown in the expanded sidebar
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LogoUpload
              label="Dark Mode Logo"
              description="Light/white logo for dark backgrounds (recommended: 180x48px)"
              currentUrl={localBranding.primary_logo_url}
              onUpload={(url) => handleLogoUpdate('primary_logo_url', url)}
              onRemove={() => handleLogoUpdate('primary_logo_url', null)}
              variant="dark"
            />
            <LogoUpload
              label="Light Mode Logo"
              description="Dark/colored logo for light backgrounds (recommended: 180x48px)"
              currentUrl={localBranding.secondary_logo_url}
              onUpload={(url) => handleLogoUpdate('secondary_logo_url', url)}
              onRemove={() => handleLogoUpdate('secondary_logo_url', null)}
              variant="light"
            />
          </div>
        </PlatformCardContent>
      </PlatformCard>

      {/* Icon Logo Configuration Card */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[hsl(var(--platform-primary))]" />
            Sidebar Icons
          </PlatformCardTitle>
          <PlatformCardDescription>
            Square icons shown when the sidebar is collapsed
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LogoUpload
              label="Dark Mode Icon"
              description="Light/white icon for dark backgrounds (recommended: 32x32px)"
              currentUrl={localBranding.icon_dark_url}
              onUpload={(url) => handleLogoUpdate('icon_dark_url', url)}
              onRemove={() => handleLogoUpdate('icon_dark_url', null)}
              variant="dark"
            />
            <LogoUpload
              label="Light Mode Icon"
              description="Dark/colored icon for light backgrounds (recommended: 32x32px)"
              currentUrl={localBranding.icon_light_url}
              onUpload={(url) => handleLogoUpdate('icon_light_url', url)}
              onRemove={() => handleLogoUpdate('icon_light_url', null)}
              variant="light"
            />
          </div>

          <div className="mt-6 p-4 rounded-lg border bg-[hsl(var(--platform-bg-card)/0.5)] border-[hsl(var(--platform-border)/0.5)]">
            <h4 className="text-sm font-medium mb-2 text-[hsl(var(--platform-foreground)/0.9)]">Logo & Icon Guidelines</h4>
            <ul className="text-xs space-y-1 text-[hsl(var(--platform-muted))]">
              <li>• <strong>Dark Mode:</strong> Use white or light-colored assets that contrast well against dark backgrounds</li>
              <li>• <strong>Light Mode:</strong> Use dark or colored assets that contrast well against light backgrounds</li>
              <li>• <strong>Full Logos:</strong> Horizontal format, recommended 180x48px</li>
              <li>• <strong>Icons:</strong> Square format, recommended 32x32px</li>
              <li>• Recommended formats: SVG (best), PNG with transparency, or WebP</li>
            </ul>
          </div>
        </PlatformCardContent>
      </PlatformCard>

      {/* Loading States Configurator */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="flex items-center gap-2">
            <Loader className="h-5 w-5 text-[hsl(var(--platform-primary))]" />
            Loading States
          </PlatformCardTitle>
          <PlatformCardDescription>
            Choose the loading animation style used across all organization dashboards
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-6">
          {/* Loader Style Picker */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Loader Style</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {([
                { id: 'luxe' as LoaderStyleOption, label: 'Luxe (Default)', Component: LuxeLoader },
                { id: 'zura' as LoaderStyleOption, label: 'Zura Grid', Component: ZuraLoader },
                { id: 'spinner' as LoaderStyleOption, label: 'Spinner', Component: SpinnerLoader },
                { id: 'dots' as LoaderStyleOption, label: 'Dots', Component: DotsLoader },
                { id: 'bar' as LoaderStyleOption, label: 'Bar', Component: BarLoader },
              ]).map(({ id, label: loaderLabel, Component }) => {
                const isSelected = localBranding.loader_style === id;
                return (
                  <button
                    key={id}
                    onClick={() => setLocalBranding((prev) => ({ ...prev, loader_style: id }))}
                    disabled={localBranding.use_skeleton_loaders}
                    className={cn(
                      'relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200',
                      localBranding.use_skeleton_loaders && 'opacity-40 cursor-not-allowed',
                      isSelected && !localBranding.use_skeleton_loaders
                        ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/20'
                        : 'border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.3)] hover:border-[hsl(var(--platform-border))] hover:bg-[hsl(var(--platform-bg-card)/0.5)]',
                    )}
                  >
                    <div className="h-12 flex items-center justify-center">
                      <Component size="md" />
                    </div>
                    <span className="text-xs text-[hsl(var(--platform-foreground)/0.85)]">{loaderLabel}</span>
                    {isSelected && !localBranding.use_skeleton_loaders && (
                      <div className="absolute top-2 right-2 p-0.5 rounded-full bg-violet-500">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Skeleton Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-[hsl(var(--platform-bg-card)/0.3)] border-[hsl(var(--platform-border)/0.5)]">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Use Skeleton Loaders</Label>
              <p className="text-xs text-[hsl(var(--platform-muted))]">
                Replace animated loaders with skeleton placeholders for section loading states
              </p>
            </div>
            <Switch
              checked={localBranding.use_skeleton_loaders}
              onCheckedChange={(checked) =>
                setLocalBranding((prev) => ({ ...prev, use_skeleton_loaders: checked }))
              }
            />
          </div>

          {/* Live Preview */}
          <div className="space-y-2">
            <Label className="text-xs text-[hsl(var(--platform-muted))]">Preview</Label>
            <div className="flex items-center justify-center p-8 rounded-lg border border-dashed border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg)/0.3)]">
              {localBranding.use_skeleton_loaders ? (
                <div className="flex flex-col items-center gap-3">
                  <Skeleton className="h-4 w-48 rounded" />
                  <Skeleton className="h-3 w-32 rounded" />
                  <Skeleton className="h-3 w-40 rounded" />
                </div>
              ) : (
                (() => {
                  const PreviewMap: Record<LoaderStyleOption, React.ComponentType<{ size?: 'sm' | 'md' | 'lg' | 'xl' }>> = {
                    luxe: LuxeLoader,
                    zura: ZuraLoader,
                    spinner: SpinnerLoader,
                    dots: DotsLoader,
                    bar: BarLoader,
                  };
                  const Preview = PreviewMap[localBranding.loader_style] || LuxeLoader;
                  return (
                    <div className="flex items-center gap-8">
                      <div className="flex flex-col items-center gap-1.5">
                        <Preview size="sm" />
                        <span className="text-[10px] text-[hsl(var(--platform-muted))]">SM</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <Preview size="md" />
                        <span className="text-[10px] text-[hsl(var(--platform-muted))]">MD</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <Preview size="lg" />
                        <span className="text-[10px] text-[hsl(var(--platform-muted))]">LG</span>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </PlatformCardContent>
      </PlatformCard>

      {/* Theme Colors - Owner Only */}
      {isPlatformOwner && (
        <>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Owner Only</span>
          </div>
          
          <PlatformThemeEditor
            themeColors={localBranding.theme_colors}
            onChange={handleThemeColorsChange}
          />

          {/* Live Preview */}
          <PlatformCard variant="glass">
            <PlatformCardHeader>
              <PlatformCardTitle>Live Preview</PlatformCardTitle>
              <PlatformCardDescription>
                Preview how your branding changes will look
              </PlatformCardDescription>
            </PlatformCardHeader>
            <PlatformCardContent>
              <div className="flex gap-4">
                {/* Expanded Sidebar Preview */}
                <div className="flex-1">
                  <p className="text-xs mb-2 text-[hsl(var(--platform-foreground-subtle))]">Expanded State</p>
                  <div
                    className="rounded-lg border border-[hsl(var(--platform-border)/0.5)] p-4"
                    style={{ backgroundColor: 'hsl(var(--platform-bg-elevated, 222 47% 8%))' }}
                  >
                    <div className="flex items-center gap-2">
                      {localBranding.primary_logo_url ? (
                        <img
                          src={localBranding.primary_logo_url}
                          alt="Primary logo preview"
                          className="h-8 object-contain"
                        />
                      ) : (
                        <>
                          <div
                            className="p-1.5 rounded-lg shadow-lg"
                            style={{
                              background: `linear-gradient(135deg, hsl(var(--platform-accent, 262 83% 58%)), hsl(var(--platform-accent-hover, 262 83% 48%)))`,
                            }}
                          >
                            <Sparkles className="h-4 w-4 text-white" />
                          </div>
                          <span className="font-display text-white">Platform</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Collapsed Sidebar Preview */}
                <div className="w-24">
                  <p className="text-xs mb-2 text-[hsl(var(--platform-foreground-subtle))]">Collapsed</p>
                  <div
                    className="rounded-lg border border-[hsl(var(--platform-border)/0.5)] p-4 flex items-center justify-center"
                    style={{ backgroundColor: 'hsl(var(--platform-bg-elevated, 222 47% 8%))' }}
                  >
                    {localBranding.secondary_logo_url ? (
                      <img
                        src={localBranding.secondary_logo_url}
                        alt="Secondary logo preview"
                        className="h-8 w-8 object-contain"
                      />
                    ) : (
                      <div
                        className="p-1.5 rounded-lg shadow-lg"
                        style={{
                          background: `linear-gradient(135deg, hsl(var(--platform-accent, 262 83% 58%)), hsl(var(--platform-accent-hover, 262 83% 48%)))`,
                        }}
                      >
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </PlatformCardContent>
          </PlatformCard>
        </>
      )}
    </div>
  );
}