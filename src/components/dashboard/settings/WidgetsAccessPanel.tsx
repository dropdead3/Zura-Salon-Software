import { useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Eye, 
  EyeOff,
  Loader2,
  LayoutGrid,
} from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { cn } from '@/lib/utils';
import { 
  useDashboardVisibility, 
  useToggleDashboardVisibility,
  useBulkUpdateVisibility,
} from '@/hooks/useDashboardVisibility';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface WidgetsAccessPanelProps {
  role: AppRole;
  roleColor: string;
}

// Category display priority order
const CATEGORY_ORDER = [
  'Command Center',
  'Analytics',
  'Dashboard Home',
  'Dashboard Widgets',
  'Notifications',
  'Charts',
];

export function WidgetsAccessPanel({ role, roleColor }: WidgetsAccessPanelProps) {
  const { data: visibilityData = [], isLoading } = useDashboardVisibility();
  const toggleVisibility = useToggleDashboardVisibility();
  const bulkUpdate = useBulkUpdateVisibility();

  // Filter to non-"Page Tabs" items for this role
  const widgetItems = useMemo(() => {
    return visibilityData.filter(
      v => v.role === role && v.element_category !== 'Page Tabs'
    );
  }, [visibilityData, role]);

  // Group by category
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, typeof widgetItems> = {};
    
    widgetItems.forEach(item => {
      const category = item.element_category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });

    // Sort categories by priority
    const sortedCategories = Object.keys(groups).sort((a, b) => {
      const aIndex = CATEGORY_ORDER.indexOf(a);
      const bIndex = CATEGORY_ORDER.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    const sorted: Record<string, typeof widgetItems> = {};
    sortedCategories.forEach(cat => {
      sorted[cat] = groups[cat].sort((a, b) => a.element_name.localeCompare(b.element_name));
    });

    return sorted;
  }, [widgetItems]);

  const handleToggle = (elementKey: string, elementName: string, elementCategory: string, currentVisible: boolean) => {
    toggleVisibility.mutate({
      elementKey,
      elementName,
      elementCategory,
      role,
      isVisible: !currentVisible,
    });
  };

  const handleBulkToggle = async (category: string, showAll: boolean) => {
    const categoryItems = groupedByCategory[category] || [];
    const updates = categoryItems.map(item => ({
      elementKey: item.element_key,
      role,
      isVisible: showAll,
    }));
    
    await bulkUpdate.mutateAsync(updates);
  };

  // Global show/hide all
  const handleGlobalToggle = async (showAll: boolean) => {
    const updates = widgetItems.map(item => ({
      elementKey: item.element_key,
      role,
      isVisible: showAll,
    }));
    
    await bulkUpdate.mutateAsync(updates);
  };

  const totalVisible = widgetItems.filter(i => i.is_visible).length;
  const totalCount = widgetItems.length;

  if (isLoading) {
    return <DashboardLoader size="sm" className="py-8" />;
  }

  if (widgetItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <LayoutGrid className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No dashboard widgets have been registered yet.</p>
        <p className="text-xs mt-1">
          Widgets will appear here automatically when wrapped with VisibilityGate.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Global actions */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">All Widgets</span>
          <Badge variant="secondary">
            {totalVisible}/{totalCount}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size={tokens.button.inline}
            className="h-7 text-xs gap-1"
            onClick={() => handleGlobalToggle(true)}
            disabled={totalVisible === totalCount || bulkUpdate.isPending}
          >
            <Eye className="w-3 h-3" />
            Show All
          </Button>
          <Button
            variant="outline"
            size={tokens.button.inline}
            className="h-7 text-xs gap-1"
            onClick={() => handleGlobalToggle(false)}
            disabled={totalVisible === 0 || bulkUpdate.isPending}
          >
            <EyeOff className="w-3 h-3" />
            Hide All
          </Button>
        </div>
      </div>

      {/* Category groups */}
      {Object.entries(groupedByCategory).map(([category, items]) => {
        const visibleCount = items.filter(i => i.is_visible).length;

        return (
          <Card key={category} className="overflow-hidden">
            <CardHeader className="py-3 px-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm uppercase tracking-wider">
                    {category}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {visibleCount}/{items.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size={tokens.button.inline}
                    className="h-6 text-xs gap-1"
                    onClick={() => handleBulkToggle(category, true)}
                    disabled={visibleCount === items.length || bulkUpdate.isPending}
                  >
                    <Eye className="w-3 h-3" />
                    All
                  </Button>
                  <Button
                    variant="ghost"
                    size={tokens.button.inline}
                    className="h-6 text-xs gap-1"
                    onClick={() => handleBulkToggle(category, false)}
                    disabled={visibleCount === 0 || bulkUpdate.isPending}
                  >
                    <EyeOff className="w-3 h-3" />
                    None
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {items.map(item => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md bg-background/50 border border-border/50",
                    !item.is_visible && "opacity-50"
                  )}
                >
                  <Switch
                    checked={item.is_visible}
                    onCheckedChange={() => handleToggle(item.element_key, item.element_name, item.element_category, item.is_visible)}
                    disabled={toggleVisibility.isPending}
                    className="data-[state=checked]:bg-primary"
                  />
                  <span className={cn(
                    "text-sm flex-1",
                    !item.is_visible && "line-through text-muted-foreground"
                  )}>
                    {item.element_name}
                  </span>
                  {!item.is_visible && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      Hidden
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
