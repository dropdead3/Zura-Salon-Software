/**
 * BackroomInventorySection — Tabbed inventory management workspace.
 * Replaces InventoryReplenishmentSection with a workflow-oriented 5-tab layout:
 * Stock | Reorder | Orders | Receive | Counts
 */

import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Package, RefreshCcw, FileText, Truck, ClipboardCheck, History } from 'lucide-react';
import { useActiveLocations } from '@/hooks/useLocations';
import { useBackroomInventoryTable } from '@/hooks/backroom/useBackroomInventoryTable';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { NavBadge } from '../NavBadge';
import { StockTab } from './inventory/StockTab';
import { ReorderTab } from './inventory/ReorderTab';
import { OrdersTab } from './inventory/OrdersTab';
import { ReceiveTab } from './inventory/ReceiveTab';
import { CountsTab } from './inventory/CountsTab';
import { AuditLogTab } from './inventory/AuditLogTab';

export function BackroomInventorySection() {
  const { data: locations = [] } = useActiveLocations();
  const [locationId, setLocationId] = useState<string | undefined>(locations[0]?.id);
  const effectiveLocationId = locationId || locations[0]?.id;

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

      {/* Tabbed workspace */}
      <Tabs defaultValue="stock" className="w-full">
        <TabsList className="w-full justify-start bg-muted/50 rounded-xl p-1 h-auto flex-wrap gap-0.5">
          <TabsTrigger value="stock" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
            <Package className="w-4 h-4" /> Stock
          </TabsTrigger>
          <TabsTrigger value="reorder" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
            <RefreshCcw className="w-4 h-4" /> Reorder
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
            <FileText className="w-4 h-4" /> Orders
          </TabsTrigger>
          <TabsTrigger value="receive" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
            <Truck className="w-4 h-4" /> Receive
          </TabsTrigger>
          <TabsTrigger value="counts" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
            <ClipboardCheck className="w-4 h-4" /> Counts
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
            <History className="w-4 h-4" /> Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4">
          <StockTab locationId={effectiveLocationId} />
        </TabsContent>
        <TabsContent value="reorder" className="mt-4">
          <ReorderTab locationId={effectiveLocationId} />
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
      </Tabs>
    </div>
  );
}
