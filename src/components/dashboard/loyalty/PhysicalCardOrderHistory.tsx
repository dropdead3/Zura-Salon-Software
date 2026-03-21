import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Package } from 'lucide-react';
import { useGiftCardOrders, GiftCardOrder } from '@/hooks/useGiftCardOrders';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface PhysicalCardOrderHistoryProps {
  organizationId?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  printing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  shipped: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  delivered: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function PhysicalCardOrderHistory({ organizationId }: PhysicalCardOrderHistoryProps) {
  const { formatDate } = useFormatDate();
  const { formatCurrency } = useFormatCurrency();
  const { data: orders = [], isLoading } = useGiftCardOrders(organizationId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg mb-2">No Orders Yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Order custom printed gift cards from the Print tab to see your order history here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Order History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Design</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tracking</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-sm">
                  {order.id.slice(0, 8).toUpperCase()}
                </TableCell>
                <TableCell>
                  {formatDate(new Date(order.ordered_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>{order.quantity}</TableCell>
                <TableCell className="capitalize">{order.card_design}</TableCell>
                <TableCell className="capitalize">{order.card_stock}</TableCell>
                <TableCell>{formatCurrency(order.total_price)}</TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[order.status] || ''}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {order.tracking_number ? (
                    <a 
                      href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${order.tracking_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-mono text-xs"
                    >
                      {order.tracking_number.slice(0, 12)}...
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
