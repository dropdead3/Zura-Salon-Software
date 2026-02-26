import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { PayStub } from '@/hooks/useMyPayData';
import { PayStubDetailDialog } from './PayStubDetailDialog';
import { parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Eye, FileText, Receipt } from 'lucide-react';

interface MyPayStubHistoryProps {
  payStubs: PayStub[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'submitted':
    case 'processed':
      return <Badge variant="default">Paid</Badge>;
    case 'draft':
      return <Badge variant="secondary">Pending</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function MyPayStubHistory({ payStubs }: MyPayStubHistoryProps) {
  const { formatDate: formatDateLocale } = useFormatDate();
  const [selectedStub, setSelectedStub] = useState<PayStub | null>(null);

  const formatDate = (dateStr: string): string => {
    try {
      return formatDateLocale(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  if (payStubs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pay History</CardTitle>
          <CardDescription>Your finalized pay stubs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Receipt className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-center">No pay stubs available yet.</p>
            <p className="text-sm text-center mt-1 opacity-70">
              Pay stubs will appear here after payroll is processed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Pay History</CardTitle>
          </div>
          <CardDescription>Your finalized pay stubs</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Check Date</TableHead>
                <TableHead>Pay Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payStubs.map((stub) => (
                <TableRow key={stub.id}>
                  <TableCell className="font-medium">
                    {formatDate(stub.checkDate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(stub.payPeriodStart)} – {formatDate(stub.payPeriodEnd)}
                  </TableCell>
                  <TableCell>{getStatusBadge(stub.status)}</TableCell>
                  <TableCell className="text-right">
                    <BlurredAmount>{formatCurrency(stub.grossPay)}</BlurredAmount>
                  </TableCell>
                  <TableCell className="text-right">
                    <BlurredAmount className="font-medium">
                      {formatCurrency(stub.netPay)}
                    </BlurredAmount>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size={tokens.button.inline}
                      onClick={() => setSelectedStub(stub)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PayStubDetailDialog
        payStub={selectedStub}
        open={!!selectedStub}
        onOpenChange={(open) => !open && setSelectedStub(null)}
      />
    </>
  );
}
