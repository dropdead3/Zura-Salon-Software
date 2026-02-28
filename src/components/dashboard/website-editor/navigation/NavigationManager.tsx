import { useState, useEffect, useRef } from 'react';
import { Loader2, Navigation } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MenuTreeEditor } from './MenuTreeEditor';
import { MenuItemInspector } from './MenuItemInspector';
import { MenuPublishBar } from './MenuPublishBar';
import {
  useWebsiteMenus,
  useWebsiteMenu,
  useSeedMenus,
  type MenuItem,
  type WebsiteMenu,
} from '@/hooks/useWebsiteMenus';
import { useWebsitePages } from '@/hooks/useWebsitePages';
import { useMenuValidation } from './useMenuValidation';
import { MobileNavConfig } from './MobileNavConfig';

export function NavigationManager() {
  const { data: menus, isLoading: menusLoading } = useWebsiteMenus();
  const seedMenus = useSeedMenus();
  const { data: pagesConfig } = useWebsitePages();

  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Auto-seed on first load if no menus (ref prevents infinite loop)
  const seedAttempted = useRef(false);
  useEffect(() => {
    if (menus && menus.length === 0 && !seedAttempted.current) {
      seedAttempted.current = true;
      seedMenus.mutate();
    }
  }, [menus]);

  // Auto-select first menu
  useEffect(() => {
    if (menus && menus.length > 0 && !selectedMenuId) {
      const primary = menus.find(m => m.slug === 'primary');
      setSelectedMenuId(primary?.id ?? menus[0].id);
    }
  }, [menus, selectedMenuId]);

  const { data: menuItems, isLoading: itemsLoading } = useWebsiteMenu(selectedMenuId);
  const { errors, warnings } = useMenuValidation(menuItems, pagesConfig);

  const selectedItem = menuItems?.find(i => i.id === selectedItemId) ?? null;
  const selectedMenu = menus?.find(m => m.id === selectedMenuId) ?? null;

  if (menusLoading || seedMenus.isPending) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Menu Selector — lightweight, no EditorCard */}
      <div className="px-3 py-3 space-y-1.5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Navigation className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-sm tracking-wide text-foreground truncate">Navigation</h3>
            <p className="text-[10px] text-muted-foreground">Configure header & footer menus</p>
          </div>
        </div>
        <label className="text-xs text-muted-foreground font-medium">Select Menu</label>
        <Select
          value={selectedMenuId ?? ''}
          onValueChange={(v) => { setSelectedMenuId(v); setSelectedItemId(null); }}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Choose menu..." />
          </SelectTrigger>
          <SelectContent>
            {menus?.map((menu: WebsiteMenu) => (
              <SelectItem key={menu.id} value={menu.id}>
                {menu.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedMenuId && (
        <>
          {/* Border divider */}
          <div className="border-t border-border/40" />

          {/* Menu Tree */}
          <MenuTreeEditor
            menuId={selectedMenuId}
            items={menuItems ?? []}
            isLoading={itemsLoading}
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
            pagesConfig={pagesConfig}
          />

          {/* Item Inspector */}
          {selectedItem && (
            <>
              <div className="border-t border-border/40" />
              <MenuItemInspector
                item={selectedItem}
                menuId={selectedMenuId}
                pagesConfig={pagesConfig}
                allItems={menuItems ?? []}
              />
            </>
          )}

          {/* Mobile Settings (primary menu only) */}
          {selectedMenu?.slug === 'primary' && selectedMenu && (
            <>
              <div className="border-t border-border/40" />
              <MobileNavConfig menu={selectedMenu} />
            </>
          )}

          {/* Publish Bar */}
          <div className="border-t border-border/40" />
          <MenuPublishBar
            menuId={selectedMenuId}
            menuName={selectedMenu?.name ?? ''}
            errors={errors}
            warnings={warnings}
          />
        </>
      )}
    </div>
  );
}
