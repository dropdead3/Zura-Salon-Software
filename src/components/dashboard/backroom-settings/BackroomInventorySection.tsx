/**
 * BackroomInventorySection — Tabbed inventory management workspace.
 * Replaces InventoryReplenishmentSection with a workflow-oriented 5-tab layout:
 * Stock | Reorder | Orders | Receive | Counts
 */

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Package, RefreshCcw, FileText, Truck, ClipboardCheck } from 'lucide-react';
import { useActiveLocations } from '@/hooks/useLocations';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { StockTab } from './inventory/StockTab';
import { ReorderTab } from './inventory/ReorderTab';
import { OrdersTab } from './inventory/OrdersTab';
import { ReceiveTab } from './inventory/ReceiveTab';
import { CountsTab } from './inventory/CountsTab';

const TABS = [
  { value: 'stock', label: 'Stock', icon: Package },
  { value: 'reorder', label: 'Reorder', icon: RefreshCcw },
  { value: 'orders', label: 'Orders', icon: FileText },
  { value: 'receive', label: 'Receive', icon: Truck },
  { value: 'counts', label: 'Counts', icon: ClipboardCheck },
] as const;

export function BackroomInventorySection() {
  const { data: locations = [] } = useActiveLocations();
  const [locationId, setLocationId] = useState<string | undefined>(locations[0]?.id);
  const effectiveLocationId = locationId || locations[0]?.id;

  return (
    <div className="space-y-5">
      {/* Section header with location selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className={tokens.heading.section}>Inventory Management</h2>
          <p className={cn(tokens.body.muted, 'mt-1 text-sm')}>
            Monitor stock, reorder supplies, manage purchase orders, receive shipments, and run physical counts.
          </p>
        </div>
        {locations.length > 1 && (
          <Select value={effectiveLocationId} onValueChange={setLocationId}>
            <SelectTrigger className="w-full sm:w-fit rounded-full gap-2 shrink-0">
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
        <TabsList className="w-full justify-start bg-muted/50 rounded-xl p-1 h-auto gap-0.5 overflow-x-auto scrollbar-none">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm shrink-0 px-3 sm:px-4 transition-all duration-150"
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="stock" className="mt-4 animate-in fade-in-0 duration-200">
          <StockTab locationId={effectiveLocationId} />
        </TabsContent>
        <TabsContent value="reorder" className="mt-4 animate-in fade-in-0 duration-200">
          <ReorderTab locationId={effectiveLocationId} />
        </TabsContent>
        <TabsContent value="orders" className="mt-4 animate-in fade-in-0 duration-200">
          <OrdersTab />
        </TabsContent>
        <TabsContent value="receive" className="mt-4 animate-in fade-in-0 duration-200">
          <ReceiveTab />
        </TabsContent>
        <TabsContent value="counts" className="mt-4 animate-in fade-in-0 duration-200">
          <CountsTab locationId={effectiveLocationId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
