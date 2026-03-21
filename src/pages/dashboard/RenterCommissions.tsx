import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCommissionStatements } from '@/hooks/useCommissionStatements';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFormatDate } from '@/hooks/useFormatDate';
import { FileText, Download, TrendingUp, DollarSign } from 'lucide-react';
import { useState } from 'react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useBoothRenter } from '@/hooks/useBoothRenters';
import { useAuth } from '@/contexts/AuthContext';
import { tokens } from '@/lib/design-tokens';

export default function RenterCommissions() {
  const { formatDate } = useFormatDate();
  const { user } = useAuth();
  const { formatCurrency } = useFormatCurrency();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [statusFilter, setStatusFilter] = useState('all');

  // Get booth renter profile - would need to query by user_id in real implementation
  const { data: renterProfile } = useBoothRenter(undefined);
  
  const { data: statements, isLoading } = useCommissionStatements({
    boothRenterId: renterProfile?.id,
    year: selectedYear,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const totalEarned = statements?.reduce((sum, s) => sum + s.total_commission, 0) || 0;
  const totalPaid = statements?.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.net_payout, 0) || 0;
  const totalPending = statements?.filter(s => s.status !== 'paid').reduce((sum, s) => sum + s.net_payout, 0) || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'approved':
        return <Badge className="bg-blue-500">Approved</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'disputed':
        return <Badge variant="destructive">Disputed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium">Commission Statements</h1>
          <p className="text-muted-foreground">View your retail commission earnings</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{selectedYear} Total Earned</p>
                <p className="text-2xl font-medium">{formatCurrency(totalEarned)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-blue-500/10">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-medium">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-amber-500/10">
                <FileText className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Payout</p>
                <p className="text-2xl font-medium">{formatCurrency(totalPending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="disputed">Disputed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Statements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Statements</CardTitle>
          <CardDescription>Monthly commission statements</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
          ) : statements && statements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Retail Sales</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net Payout</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statements.map((statement) => (
                  <TableRow key={statement.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {formatDate(new Date(statement.period_start), 'MMM yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(new Date(statement.period_start), 'MMM d')} - {formatDate(new Date(statement.period_end), 'MMM d')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(statement.total_retail_sales)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(statement.total_commission)}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({(statement.commission_rate * 100).toFixed(0)}%)
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {statement.deductions && statement.deductions > 0 
                        ? `-${formatCurrency(statement.deductions)}`
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(statement.net_payout)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(statement.status)}
                    </TableCell>
                    <TableCell>
                      {statement.statement_pdf_url && (
                        <Button size={tokens.button.inline} variant="ghost" asChild>
                          <a href={statement.statement_pdf_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No commission statements for {selectedYear}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
