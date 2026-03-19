/**
 * BackroomInventorySection — Tabbed inventory management workspace.
 * Workflow-oriented 6-tab layout: Stock | Orders | Receive | Counts | Audit Log | Analytics
 * Includes health banner with clickable navigation chips and first-time onboarding hint.
 */

import { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Package, FileText, Truck, ClipboardCheck, History, AlertTriangle, XCircle, Inbox, PackageOpen, BarChart3 } from 'lucide-react';
import { useActiveLocations } from '@/hooks/useLocations';
import { useBackroomInventoryTable } from '@/hooks/backroom/useBackroomInventoryTable';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { NavBadge } from '../NavBadge';
import { FirstTimeCallout } from '@/components/ui/FirstTimeCallout';
import { StockTab } from './inventory/StockTab';
import { OrdersTab } from './inventory/OrdersTab';
import { ReceiveTab } from './inventory/ReceiveTab';
import { CountsTab } from './inventory/CountsTab';
import { AuditLogTab } from './inventory/AuditLogTab';
import { ReorderAnalyticsTab } from './inventory/ReorderAnalyticsTab';

/* ── Health Banner Chip ── */
function HealthChip({ icon: Icon, count, label, color, onClick }: {
  icon: React.ElementType;
  count: number;
  label: string;
  color: 'destructive' | 'warning' | 'primary' | 'accent';
  onClick: () => void;
}) {
  if (count <= 0) return null;

  const colorMap = {
    destructive: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15',
    warning: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/15',
    primary: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15',
    accent: 'bg-accent/50 text-accent-foreground border-accent/30 hover:bg-accent/60',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors cursor-pointer',
        colorMap[color]
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="tabular-nums">{count}</span>
      <span>{label}</span>
    </button>
  );
}

export function BackroomInventorySection({ initialTab }: { initialTab?: string }) {
  const { data: locations = [] } = useActiveLocations();
  const [locationId, setLocationId] = useState<string | undefined>(locations[0]?.id);
  const effectiveLocationId = locationId || locations[0]?.id;

  // Controlled tabs for programmatic navigation from health banner
  const [activeTab, setActiveTab] = useState(initialTab || 'stock');

  // React to external tab changes (e.g. quick actions from overview)
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Badge counts
  const { data: inventory = [] } = useBackroomInventoryTable({ locationId: effectiveLocationId });
  const { data: allOrders = [] } = usePurchaseOrders({ status: 'all' });

  const outOfStockCount = useMemo(() => inventory.filter(r => r.status === 'out_of_stock').length, [inventory]);
  const lowStockCount = useMemo(() => inventory.filter(r => r.status === 'urgent_reorder' || r.status === 'replenish').length, [inventory]);
  const draftOrderCount = useMemo(() => allOrders.filter(po => po.status === 'draft').length, [allOrders]);
  const receivableCount = useMemo(() => allOrders.filter(po => po.status === 'sent' || po.status === 'partially_received').length, [allOrders]);

  const hasHealthAlerts = outOfStockCount > 0 || lowStockCount > 0 || draftOrderCount > 0 || receivableCount > 0;

  return (
    <div className="space-y-5">
      {/* Section header with location selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className={tokens.heading.section}>Inventory Management</h2>
          <p className={cn(tokens.body.muted, 'mt-1')}>Monitor stock, reorder supplies, manage purchase orders, receive shipments, and run physical counts.</p>
        </div>
        {locations.length > 1 && (
          <Select value={effectiveLocationId} onValueChange={setLocationId}>
            <SelectTrigger className="w-fit rounded-full gap-2 shrink-0">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>


      {/* First-time onboarding hint */}
      <FirstTimeCallout
        id="backroom-inventory-workflow"
        title="Inventory Workflow"
        description="Track Products → Set Reorder Levels → Monitor Stock → Create Orders → Receive Shipments → Run Counts"
      />

      {/* Tabbed workspace */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="justify-start bg-muted/50 rounded-xl p-1 h-auto flex-wrap gap-0.5">
          <TabsTrigger value="stock" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
            <Package className="w-4 h-4" /> Stock
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
            <FileText className="w-4 h-4" /> Orders <NavBadge count={draftOrderCount} />
          </TabsTrigger>
          <TabsTrigger value="receive" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
            <Truck className="w-4 h-4" /> Receive <NavBadge count={receivableCount} />
          </TabsTrigger>
          <TabsTrigger value="counts" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
            <ClipboardCheck className="w-4 h-4" /> Counts
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
            <History className="w-4 h-4" /> Audit Log
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
            <BarChart3 className="w-4 h-4" /> Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4">
          <StockTab locationId={effectiveLocationId} />
        </TabsContent>
        <TabsContent value="orders" className="mt-4">
          <OrdersTab />
        </TabsContent>
        <TabsContent value="receive" className="mt-4">
          <ReceiveTab />
        </TabsContent>
        <TabsContent value="counts" className="mt-4">
          <CountsTab locationId={effectiveLocationId} />
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <AuditLogTab locationId={effectiveLocationId} />
        </TabsContent>
        <TabsContent value="analytics" className="mt-4">
          <ReorderAnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
