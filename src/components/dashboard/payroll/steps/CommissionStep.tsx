import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, TrendingUp, DollarSign } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmployeePayrollSettings } from '@/hooks/useEmployeePayrollSettings';
import { EmployeeCompensation, EmployeeSalesData } from '@/hooks/usePayrollCalculations';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatDate } from '@/hooks/useFormatDate';

interface CommissionStepProps {
  employees: EmployeePayrollSettings[];
  salesData: EmployeeSalesData[];
  compensations: EmployeeCompensation[];
  overrides: Record<string, number>;
  onOverrideChange: (overrides: Record<string, number>) => void;
  isLoading: boolean;
  payPeriodStart: string | null;
  payPeriodEnd: string | null;
}

export function CommissionStep({
  employees,
  salesData,
  compensations,
  overrides,
  onOverrideChange,
  isLoading,
  payPeriodStart,
  payPeriodEnd,
}: CommissionStepProps) {
  const { formatCurrency } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const commissionEmployees = employees.filter((e) => e.commission_enabled);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleOverride = (employeeId: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || value === '') {
      const newOverrides = { ...overrides };
      delete newOverrides[employeeId];
      onOverrideChange(newOverrides);
    } else {
      onOverrideChange({
        ...overrides,
        [employeeId]: numValue,
      });
    }
  };

  const totalServiceRevenue = salesData.reduce((sum, s) => sum + s.serviceRevenue, 0);
  const totalProductRevenue = salesData.reduce((sum, s) => sum + s.productRevenue, 0);
  const totalCommissions = compensations.reduce((sum, c) => sum + c.commissionPay, 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (commissionEmployees.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2">Commission Review</h3>
          <p className="text-sm text-muted-foreground">
            Review and adjust commission amounts based on sales performance.
          </p>
        </div>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No employees have commission-based pay enabled. You can skip this step.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Commission Review</h3>
        <p className="text-sm text-muted-foreground">
          Review commissions calculated from sales data for{' '}
          {payPeriodStart && payPeriodEnd && (
            <>
              {formatDate(new Date(payPeriodStart), 'MMM d')} -{' '}
              {formatDate(new Date(payPeriodEnd), 'MMM d, yyyy')}
            </>
          )}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Service Revenue</span>
          </div>
          <p className="text-2xl font-medium">
            {formatCurrency(totalServiceRevenue)}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Product Revenue</span>
          </div>
          <p className="text-2xl font-medium">
            {formatCurrency(totalProductRevenue)}
          </p>
        </div>
        <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
          <div className="flex items-center gap-2 text-primary mb-1">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Total Commissions</span>
          </div>
          <p className="text-2xl font-medium text-primary">
            {formatCurrency(totalCommissions)}
          </p>
        </div>
      </div>

      {/* Commission Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead className="text-right">Service Revenue</TableHead>
            <TableHead className="text-right">Service Commission</TableHead>
            <TableHead className="text-right">Product Revenue</TableHead>
            <TableHead className="text-right">Product Commission</TableHead>
            <TableHead className="text-right">Total Commission</TableHead>
            <TableHead className="w-36">Override</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {commissionEmployees.map((emp) => {
            const sales = salesData.find((s) => s.employeeId === emp.employee_id);
            const compensation = compensations.find((c) => c.employeeId === emp.employee_id);
            const hasOverride = overrides[emp.employee_id] !== undefined;

            return (
              <TableRow key={emp.employee_id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={emp.employee?.photo_url || undefined} />
                      <AvatarFallback>
                        {getInitials(emp.employee?.full_name || '')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {emp.employee?.display_name || emp.employee?.full_name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(sales?.serviceRevenue || 0)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(compensation?.serviceCommission || 0)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(sales?.productRevenue || 0)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(compensation?.productCommission || 0)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  <div className="flex items-center justify-end gap-2">
                    {formatCurrency(compensation?.commissionPay || 0)}
                    {hasOverride && (
                      <Badge variant="secondary" className="text-xs">
                        Modified
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={overrides[emp.employee_id] ?? ''}
                    onChange={(e) => handleOverride(emp.employee_id, e.target.value)}
                    placeholder="Override"
                    min={0}
                    step={0.01}
                    className={hasOverride ? 'border-primary' : ''}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {salesData.length === 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No sales data found for the selected pay period. Commissions will be $0 unless you enter
            overrides. Make sure Phorest sales data has been synced.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
