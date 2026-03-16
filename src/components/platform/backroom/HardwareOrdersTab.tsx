import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Package, Truck, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

type FulfillmentStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface HardwareOrder {
  id: string;
  organization_id: string;
  stripe_checkout_session_id: string | null;
  stripe_subscription_id: string | null;
  item_type: string;
  quantity: number;
  unit_price_cents: number;
  fulfillment_status: FulfillmentStatus;
  shipping_carrier: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  shipping_address: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  organization_name?: string;
}

const STATUS_CONFIG: Record<FulfillmentStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Package },
  shipped: { label: 'Shipped', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Clock },
};

function useHardwareOrders() {
  return useQuery({
    queryKey: ['platform-hardware-orders'],
    queryFn: async (): Promise<HardwareOrder[]> => {
      // Fetch orders with org names
      const { data: orders, error } = await supabase
        .from('hardware_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch org names for all unique org IDs
      const orgIds = [...new Set((orders ?? []).map((o: any) => o.organization_id))];
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', orgIds);

      const orgMap = new Map((orgs ?? []).map((o: any) => [o.id, o.name]));

      return (orders ?? []).map((o: any) => ({
        ...o,
        organization_name: orgMap.get(o.organization_id) || 'Unknown',
      })) as HardwareOrder[];
    },
    staleTime: 30_000,
  });
}

function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      fulfillment_status?: FulfillmentStatus;
      tracking_number?: string;
      shipping_carrier?: string;
      notes?: string;
    }) => {
      const update: Record<string, unknown> = {};
      if (params.fulfillment_status) update.fulfillment_status = params.fulfillment_status;
      if (params.tracking_number !== undefined) update.tracking_number = params.tracking_number;
      if (params.shipping_carrier !== undefined) update.shipping_carrier = params.shipping_carrier;
      if (params.notes !== undefined) update.notes = params.notes;

      if (params.fulfillment_status === 'shipped') update.shipped_at = new Date().toISOString();
      if (params.fulfillment_status === 'delivered') update.delivered_at = new Date().toISOString();

      const { error } = await supabase
        .from('hardware_orders')
        .update(update)
        .eq('id', params.id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-hardware-orders'] });
      toast.success('Order updated');
    },
    onError: (e) => toast.error('Update failed: ' + e.message),
  });
}

function KpiCards({ orders }: { orders: HardwareOrder[] }) {
  const pending = orders.filter((o) => o.fulfillment_status === 'pending').length;
  const processing = orders.filter((o) => o.fulfillment_status === 'processing').length;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const shippedRecent = orders.filter(
    (o) => o.fulfillment_status === 'shipped' && o.shipped_at && o.shipped_at >= thirtyDaysAgo
  ).length;
  const totalScales = orders.filter((o) => o.fulfillment_status !== 'cancelled').reduce((s, o) => s + o.quantity, 0);

  const kpis = [
    { label: 'Pending', value: pending, color: 'text-amber-400' },
    { label: 'Processing', value: processing, color: 'text-blue-400' },
    { label: 'Shipped (30d)', value: shippedRecent, color: 'text-violet-400' },
    { label: 'Total Scales', value: totalScales, color: 'text-foreground' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((k) => (
        <div key={k.label} className={tokens.kpi.tile}>
          <span className={tokens.kpi.label}>{k.label}</span>
          <span className={cn(tokens.kpi.value, k.color)}>{k.value}</span>
        </div>
      ))}
    </div>
  );
}

function OrderRow({ order, onUpdate }: { order: HardwareOrder; onUpdate: ReturnType<typeof useUpdateOrder> }) {
  const [editTracking, setEditTracking] = useState(false);
  const [tracking, setTracking] = useState(order.tracking_number || '');
  const [carrier, setCarrier] = useState(order.shipping_carrier || '');
  const cfg = STATUS_CONFIG[order.fulfillment_status];

  const handleStatusChange = (status: FulfillmentStatus) => {
    onUpdate.mutate({ id: order.id, fulfillment_status: status });
  };

  const handleSaveTracking = () => {
    onUpdate.mutate({ id: order.id, tracking_number: tracking, shipping_carrier: carrier });
    setEditTracking(false);
  };

  return (
    <TableRow>
      <TableCell className="font-sans text-sm font-medium">{order.organization_name}</TableCell>
      <TableCell className="font-sans text-sm">{order.quantity}</TableCell>
      <TableCell>
        <Badge className={cn('border', cfg.color)}>{cfg.label}</Badge>
      </TableCell>
      <TableCell className="font-sans text-sm text-muted-foreground">
        {format(new Date(order.created_at), 'MMM d, yyyy')}
      </TableCell>
      <TableCell>
        {editTracking ? (
          <div className="flex items-center gap-2">
            <Input
              className="h-8 w-24 text-xs"
              placeholder="Carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            />
            <Input
              className="h-8 w-32 text-xs"
              placeholder="Tracking #"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
            />
            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={handleSaveTracking}>
              Save
            </Button>
          </div>
        ) : (
          <span
            className="font-sans text-sm text-muted-foreground cursor-pointer hover:text-foreground"
            onClick={() => setEditTracking(true)}
          >
            {order.tracking_number ? `${order.shipping_carrier || ''} ${order.tracking_number}` : '—'}
          </span>
        )}
      </TableCell>
      <TableCell>
        <Select value={order.fulfillment_status} onValueChange={(v) => handleStatusChange(v as FulfillmentStatus)}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
    </TableRow>
  );
}

export function HardwareOrdersTab() {
  const { data: orders, isLoading } = useHardwareOrders();
  const updateOrder = useUpdateOrder();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Card>
          <CardContent className="p-6">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className={tokens.loading.skeleton} />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  const allOrders = orders ?? [];

  return (
    <div className="space-y-6">
      <KpiCards orders={allOrders} />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Package className={tokens.card.icon} />
            </div>
            <CardTitle className={tokens.card.title}>Hardware Orders</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {allOrders.length === 0 ? (
            <div className={tokens.empty.container}>
              <Package className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No hardware orders yet</h3>
              <p className={tokens.empty.description}>Orders will appear here when customers purchase scales.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={tokens.table.columnHeader}>Organization</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Qty</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Status</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Ordered</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Tracking</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allOrders.map((order) => (
                  <OrderRow key={order.id} order={order} onUpdate={updateOrder} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
