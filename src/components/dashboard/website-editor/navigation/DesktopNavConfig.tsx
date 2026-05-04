import { useState, useEffect, useCallback } from 'react';
import { Monitor } from 'lucide-react';
import { EditorCard } from '../EditorCard';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateMenuConfig, type MenuConfig, type WebsiteMenu } from '@/hooks/useWebsiteMenus';
import { toast } from 'sonner';

interface DesktopNavConfigProps {
  menu: WebsiteMenu;
}

export function DesktopNavConfig({ menu }: DesktopNavConfigProps) {
  const updateConfig = useUpdateMenuConfig();
  const config = (menu.config ?? {}) as MenuConfig;

  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>(
    config.desktop_alignment ?? 'center'
  );
  const [density, setDensity] = useState<'comfortable' | 'compact'>(
    config.desktop_density ?? 'comfortable'
  );
  const [dropdownStyle, setDropdownStyle] = useState<'simple' | 'mega'>(
    config.dropdown_style ?? 'simple'
  );
  const [showLogo, setShowLogo] = useState(config.show_logo ?? true);
  const [ctaTreatment, setCtaTreatment] = useState<'pill' | 'underline' | 'outline'>(
    config.cta_treatment ?? 'pill'
  );

  useEffect(() => {
    const c = (menu.config ?? {}) as MenuConfig;
    setAlignment(c.desktop_alignment ?? 'center');
    setDensity(c.desktop_density ?? 'comfortable');
    setDropdownStyle(c.dropdown_style ?? 'simple');
    setShowLogo(c.show_logo ?? true);
    setCtaTreatment(c.cta_treatment ?? 'pill');
  }, [menu.id, menu.config]);

  const save = useCallback(
    (updates: Partial<MenuConfig>) => {
      const merged: MenuConfig = { ...config, ...updates };
      updateConfig.mutate(
        { menuId: menu.id, config: merged },
        { onSuccess: () => toast.success('Desktop layout saved') }
      );
    },
    [config, menu.id, updateConfig]
  );

  return (
    <EditorCard
      title="Desktop Layout"
      icon={Monitor}
      description="How the menu appears on desktop"
    >
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label className="text-xs">Alignment</Label>
          <Select
            value={alignment}
            onValueChange={(v) => {
              const val = v as 'left' | 'center' | 'right';
              setAlignment(val);
              save({ desktop_alignment: val });
            }}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Item Spacing</Label>
          <Select
            value={density}
            onValueChange={(v) => {
              const val = v as 'comfortable' | 'compact';
              setDensity(val);
              save({ desktop_density: val });
            }}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comfortable">Comfortable</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Dropdown Style</Label>
          <Select
            value={dropdownStyle}
            onValueChange={(v) => {
              const val = v as 'simple' | 'mega';
              setDropdownStyle(val);
              save({ dropdown_style: val });
            }}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="simple">Simple list</SelectItem>
              <SelectItem value="mega">Mega panel (2 columns)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">
            Mega panel switches dropdowns with 5+ children to a wider 2-column layout
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">CTA Treatment</Label>
          <Select
            value={ctaTreatment}
            onValueChange={(v) => {
              const val = v as 'pill' | 'underline' | 'outline';
              setCtaTreatment(val);
              save({ cta_treatment: val });
            }}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pill">Solid pill</SelectItem>
              <SelectItem value="outline">Outline</SelectItem>
              <SelectItem value="underline">Underline</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs">Show Logo</Label>
            <p className="text-[10px] text-muted-foreground">Display brand logo in header</p>
          </div>
          <Switch
            checked={showLogo}
            onCheckedChange={(v) => {
              setShowLogo(v);
              save({ show_logo: v });
            }}
          />
        </div>
      </div>
    </EditorCard>
  );
}
