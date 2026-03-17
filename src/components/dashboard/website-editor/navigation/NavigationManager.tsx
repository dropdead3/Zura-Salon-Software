import { useState, useEffect, useRef } from 'react';
import { Loader2, Navigation, RefreshCw, AlertTriangle, Layers } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MenuTreeEditor } from './MenuTreeEditor';
import { MenuItemInspector } from './MenuItemInspector';
import { MenuPublishBar } from './MenuPublishBar';
import {
  useWebsiteMenus,
  useWebsiteMenu,
  useSeedMenus,
  useCreateMenuItem,
  type MenuItem,
  type WebsiteMenu,
} from '@/hooks/useWebsiteMenus';
import { useWebsitePages } from '@/hooks/useWebsitePages';
import { useMenuValidation } from './useMenuValidation';
import { MobileNavConfig } from './MobileNavConfig';
import { toast } from '@/hooks/use-toast';
import { tokens } from '@/lib/design-tokens';

export function NavigationManager() {
  const { data: menus, isLoading: menusLoading, error: menusError, refetch: refetchMenus } = useWebsiteMenus();
  const seedMenus = useSeedMenus();
  const createMenuItem = useCreateMenuItem();
  const { data: pagesConfig } = useWebsitePages();

  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Auto-seed on first load if no menus (ref prevents infinite loop)
  const seedAttempted = useRef(false);
  useEffect(() => {
    if (menus && menus.length === 0 && !seedAttempted.current) {
      seedAttempted.current = true;
      seedMenus.mutate(undefined, {
        onError: (err) => {
          seedAttempted.current = false; // Allow retry
          toast({
            title: 'Failed to create default menus',
            description: err instanceof Error ? err.message : 'Unknown error',
            variant: 'destructive',
          });
        },
        onSuccess: () => {
          toast({ title: 'Default menus created' });
        },
      });
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

  // Manual seed handler
  const handleManualSeed = () => {
    seedMenus.mutate(undefined, {
      onError: (err) => {
        toast({
          title: 'Failed to create menus',
          description: err instanceof Error ? err.message : 'Unknown error',
          variant: 'destructive',
        });
      },
      onSuccess: () => {
        toast({ title: 'Default menus created successfully' });
      },
    });
  };

  // Sync from pages handler
  const handleSyncFromPages = async () => {
    if (!pagesConfig || !selectedMenuId) return;
    setIsSyncing(true);
    try {
      const navPages = pagesConfig.pages.filter(p => p.show_in_nav && p.enabled);
      const existingLabels = new Set((menuItems ?? []).map(i => i.label.toLowerCase()));
      
      let added = 0;
      for (let i = 0; i < navPages.length; i++) {
        const page = navPages[i];
        if (existingLabels.has(page.title.toLowerCase())) continue;
        
        await createMenuItem.mutateAsync({
          menu_id: selectedMenuId,
          label: page.title,
          item_type: 'page_link',
          target_page_id: page.id,
          target_url: `/${page.slug}`,
          sort_order: (menuItems?.length ?? 0) + i,
          is_published: false,
        });
        added++;
      }
      
      toast({
        title: added > 0 ? `Synced ${added} page${added !== 1 ? 's' : ''} to menu` : 'No new pages to sync',
        description: added > 0 ? 'Remember to publish when ready.' : 'All nav pages are already in the menu.',
      });
    } catch (err) {
      toast({
        title: 'Sync failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Error state
  if (menusError) {
    return (
      <div className="px-3 py-8 text-center space-y-3">
        <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
        <p className="text-sm text-destructive">Failed to load menus</p>
        <p className="text-xs text-muted-foreground">{menusError instanceof Error ? menusError.message : 'Unknown error'}</p>
        <Button variant="outline" size="sm" onClick={() => refetchMenus()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    );
  }

  // Loading state
  if (menusLoading || seedMenus.isPending) {
    return <DashboardLoader className="h-64" />;
  }

  // Empty state — menus failed to seed or don't exist
  if (menus && menus.length === 0) {
    return (
      <div className="px-3 py-8 text-center space-y-3">
        <Navigation className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-foreground">No menus configured</p>
        <p className="text-xs text-muted-foreground">Create default header and footer menus to get started.</p>
        <Button variant="outline" size="sm" onClick={handleManualSeed} disabled={seedMenus.isPending}>
          {seedMenus.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          Create Default Menus
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Menu Selector */}
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

          {/* Sync from Pages button — show when menu has few/no items */}
          {pagesConfig && (menuItems?.length ?? 0) < 2 && (
            <div className="px-3 py-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={handleSyncFromPages}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Layers className="h-3.5 w-3.5 mr-1.5" />
                )}
                Sync from Pages
              </Button>
            </div>
          )}

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
