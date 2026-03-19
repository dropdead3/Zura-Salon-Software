import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { Package, ClipboardList, Truck, AlertTriangle, ChevronRight, Loader2, CalendarCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { VisibilityGate } from '@/components/visibility';
import { useNextPendingAudit } from '@/hooks/inventory/useAuditSchedule';
import { format, isPast } from 'date-fns';

function useInventoryManagerStats() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['inventory-manager-stats', orgId],
    queryFn: async () => {
      if (!orgId) return { draftPOs: 0, lowStockAlerts: 0, pendingReceives: 0 };

      const [poRes, alertRes, receiveRes] = await Promise.all([
        supabase
          .from('purchase_orders')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('status', 'draft'),
        supabase
          .from('inventory_projections')
          .select('id, product_id, on_hand, products!inner(reorder_point)', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .not('products.reorder_point', 'is', null)
          .filter('on_hand', 'lte', 'products.reorder_point' as any),
        supabase
          .from('purchase_orders')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('status', 'sent'),
      ]);

      return {
        draftPOs: poRes.count ?? 0,
        lowStockAlerts: alertRes.count ?? 0,
        pendingReceives: receiveRes.count ?? 0,
      };
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

export function InventoryManagerDashboardCard() {
  const { roles } = useAuth();
  const isInventoryManager = roles.includes('inventory_manager');
  const isLeadership = roles.some(r => ['super_admin', 'admin', 'manager'].includes(r));
  
  // Only show for inventory managers (not leadership, they have their own views)
  if (!isInventoryManager && !isLeadership) return null;

  return (
    <VisibilityGate
      elementKey="inventory_manager_hub"
      elementName="Inventory Manager Hub"
      elementCategory="operations"
    >
      <InventoryManagerDashboardCardInner />
    </VisibilityGate>
  );
}

function InventoryManagerDashboardCardInner() {
  const { data: stats, isLoading } = useInventoryManagerStats();

  const quickActions = [
    {
      label: 'Receive PO',
      icon: Truck,
      to: '/dashboard/admin/backroom-settings?section=inventory&tab=receive',
      count: stats?.pendingReceives,
      countLabel: 'to receive',
    },
    {
      label: 'Start Count',
      icon: ClipboardList,
      to: '/dashboard/admin/backroom-settings?section=inventory&tab=counts',
    },
    {
      label: 'Reorder Queue',
      icon: Package,
      to: '/dashboard/admin/backroom-settings?section=inventory&tab=reorder',
      count: stats?.draftPOs,
      countLabel: 'draft POs',
    },
  ];

  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <div className={tokens.card.iconBox}>
            <Package className={tokens.card.icon} />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className={tokens.card.title}>Inventory Overview</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Your inventory responsibilities at a glance
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="font-sans text-xs" asChild>
            <Link to="/dashboard/admin/backroom-settings?section=inventory">
              View All <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI Strip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-2xl font-display tabular-nums">
              {isLoading ? '—' : stats?.draftPOs ?? 0}
            </p>
            <p className="text-[10px] text-muted-foreground font-sans mt-0.5">Draft POs</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-2xl font-display tabular-nums">
              {isLoading ? '—' : stats?.lowStockAlerts ?? 0}
            </p>
            <p className="text-[10px] text-muted-foreground font-sans mt-0.5">Low Stock</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-2xl font-display tabular-nums">
              {isLoading ? '—' : stats?.pendingReceives ?? 0}
            </p>
            <p className="text-[10px] text-muted-foreground font-sans mt-0.5">To Receive</p>
          </div>
        </div>

        {/* Low Stock Alert Banner */}
        {!isLoading && (stats?.lowStockAlerts ?? 0) > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-xs text-destructive font-sans">
              {stats!.lowStockAlerts} product{stats!.lowStockAlerts !== 1 ? 's' : ''} below reorder point
            </p>
            <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-[10px] font-sans text-destructive" asChild>
              <Link to="/dashboard/admin/backroom-settings?section=inventory&tab=reorder">Review</Link>
            </Button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="ghost"
              className="h-auto py-3 flex-col gap-1.5 rounded-xl bg-muted/30 hover:bg-muted border border-border/40 hover:shadow-sm transition-all duration-200"
              asChild
            >
              <Link to={action.to}>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <action.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[11px] font-sans">{action.label}</span>
                {action.count !== undefined && action.count > 0 && (
                  <span className="text-[10px] text-muted-foreground font-sans">
                    {action.count} {action.countLabel}
                  </span>
                )}
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
