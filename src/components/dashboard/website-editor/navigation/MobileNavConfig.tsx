import { useState, useEffect, useCallback } from 'react';
import { Smartphone } from 'lucide-react';
import { EditorCard } from '../EditorCard';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useUpdateMenuConfig, type MenuConfig, type WebsiteMenu } from '@/hooks/useWebsiteMenus';
import { toast } from 'sonner';

interface MobileNavConfigProps {
  menu: WebsiteMenu;
}

export function MobileNavConfig({ menu }: MobileNavConfigProps) {
  const updateConfig = useUpdateMenuConfig();
  const config = (menu.config ?? {}) as MenuConfig;

  const [mobileStyle, setMobileStyle] = useState<'overlay' | 'drawer'>(
    config.mobile_menu_style ?? 'overlay'
  );
  const [ctaVisible, setCtaVisible] = useState(
    config.mobile_cta_visible ?? true
  );

  useEffect(() => {
    const c = (menu.config ?? {}) as MenuConfig;
    setMobileStyle(c.mobile_menu_style ?? 'overlay');
    setCtaVisible(c.mobile_cta_visible ?? true);
  }, [menu.id, menu.config]);

  const save = useCallback(
    (updates: Partial<MenuConfig>) => {
      const merged: MenuConfig = {
        ...config,
        ...updates,
      };
      updateConfig.mutate(
        { menuId: menu.id, config: merged },
        { onSuccess: () => toast.success('Mobile settings saved') }
      );
    },
    [config, menu.id, updateConfig]
  );

  return (
    <EditorCard
      title="Mobile Settings"
      icon={Smartphone}
      description="How the menu appears on mobile devices"
    >
      <div className="space-y-5">
        {/* Menu Style */}
        <div className="space-y-3">
          <Label className="text-xs">Menu Style</Label>
          <RadioGroup
            value={mobileStyle}
            onValueChange={(v) => {
              const val = v as 'overlay' | 'drawer';
              setMobileStyle(val);
              save({ mobile_menu_style: val });
            }}
            className="space-y-2"
          >
            <label className="flex items-start gap-3 cursor-pointer">
              <RadioGroupItem value="overlay" className="mt-0.5" />
              <div>
                <p className="text-sm font-sans font-medium">Full-screen Overlay</p>
                <p className="text-[10px] text-muted-foreground">
                  Menu expands below the header, pushing content down
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <RadioGroupItem value="drawer" className="mt-0.5" />
              <div>
                <p className="text-sm font-sans font-medium">Slide-in Drawer</p>
                <p className="text-[10px] text-muted-foreground">
                  Menu slides in from the right side of the screen
                </p>
              </div>
            </label>
          </RadioGroup>
        </div>

        {/* CTA Visibility */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs">Show CTA on Mobile</Label>
            <p className="text-[10px] text-muted-foreground">
              Display the primary CTA button in mobile menu
            </p>
          </div>
          <Switch
            checked={ctaVisible}
            onCheckedChange={(v) => {
              setCtaVisible(v);
              save({ mobile_cta_visible: v });
            }}
          />
        </div>
      </div>
    </EditorCard>
  );
}
