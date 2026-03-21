import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Trash2, Download, Loader2, QrCode } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useVouchers, useDeleteVoucher, type Voucher } from '@/hooks/useVouchers';
import { VoucherFormDialog } from './VoucherFormDialog';
import { VoucherBulkDialog } from './VoucherBulkDialog';

interface VouchersListProps {
  organizationId?: string;
}

const VOUCHER_TYPE_LABELS: Record<string, string> = {
  discount: 'Discount',
  free_service: 'Free Service',
  credit: 'Credit',
  upgrade: 'Upgrade',
};

export function VouchersList({ organizationId }: VouchersListProps) {
  const { formatDate } = useFormatDate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const { formatCurrency } = useFormatCurrency();
  
  const { data: vouchers, isLoading } = useVouchers(organizationId);
  const deleteVoucher = useDeleteVoucher();

  const getStatus = (voucher: Voucher) => {
    if (voucher.is_redeemed) return { label: 'Redeemed', variant: 'secondary' as const };
    if (!voucher.is_active) return { label: 'Inactive', variant: 'outline' as const };
    if (voucher.expires_at && isPast(new Date(voucher.expires_at))) return { label: 'Expired', variant: 'destructive' as const };
    return { label: 'Active', variant: 'default' as const };
  };

  const handleDelete = async (voucher: Voucher) => {
    if (!organizationId) return;
    if (!confirm(`Delete voucher "${voucher.code}"?`)) return;
    await deleteVoucher.mutateAsync({ id: voucher.id, organizationId });
  };

  const exportVouchers = () => {
    if (!vouchers?.length) return;
    
    const csv = [
      ['Code', 'Type', 'Value', 'Issued To', 'Status', 'Expires', 'Redeemed'].join(','),
      ...vouchers.map(v => [
        v.code,
        VOUCHER_TYPE_LABELS[v.voucher_type],
        v.value_type === 'percentage' ? `${v.value}%` : `$${v.value}`,
        v.issued_to_name || v.issued_to_email || '-',
        getStatus(v).label,
        v.expires_at ? format(new Date(v.expires_at), 'yyyy-MM-dd') : '-',
        v.is_redeemed ? 'Yes' : 'No',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vouchers-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!organizationId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Select an organization to manage vouchers
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Vouchers</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportVouchers} disabled={!vouchers?.length}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={() => setIsBulkOpen(true)}>
              <QrCode className="h-4 w-4 mr-2" />
              Bulk Generate
            </Button>
            <Button onClick={() => setIsFormOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Voucher
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !vouchers?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No vouchers yet</p>
              <p className="text-sm mt-1">Create individual vouchers or bulk generate codes</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Issued To</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((voucher) => {
                  const status = getStatus(voucher);
                  return (
                    <TableRow key={voucher.id}>
                      <TableCell>
                        <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                          {voucher.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {VOUCHER_TYPE_LABELS[voucher.voucher_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {voucher.value_type === 'percentage' 
                          ? `${voucher.value}%`
                          : voucher.value 
                          ? formatCurrency(voucher.value)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {voucher.issued_to_name || voucher.issued_to_email || (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {voucher.expires_at ? (
                          formatDate(new Date(voucher.expires_at), 'MMM d, yyyy')
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={voucher.is_redeemed}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleDelete(voucher)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <VoucherFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        organizationId={organizationId}
      />

      <VoucherBulkDialog
        open={isBulkOpen}
        onOpenChange={setIsBulkOpen}
        organizationId={organizationId}
      />
    </>
  );
}
