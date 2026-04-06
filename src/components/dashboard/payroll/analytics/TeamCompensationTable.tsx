import { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { EmployeeProjection } from '@/hooks/usePayrollForecasting';

interface TeamCompensationTableProps {
  employees: EmployeeProjection[];
  isLoading: boolean;
  periodLabel: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const payTypeLabels: Record<string, string> = {
  hourly: 'Hourly',
  salary: 'Salary',
  commission: 'Commission',
  hourly_plus_commission: 'Hourly+Comm',
  salary_plus_commission: 'Salary+Comm',
};

interface EmployeeRowProps {
  employee: EmployeeProjection;
  isExpanded: boolean;
  onToggle: () => void;
}

function EmployeeRow({ employee, isExpanded, onToggle }: EmployeeRowProps) {
  const isNearNextTier = employee.nextTier && employee.tierProgress >= 75;

  return (
    <>
      <TableRow 
        className="cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <TableCell>
          <Button variant="ghost" size={tokens.button.inline} className="h-6 w-6 p-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={employee.photoUrl || undefined} />
              <AvatarFallback className="text-xs">
                {employee.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{employee.employeeName}</p>
              <Badge variant="outline" className="text-xs mt-0.5">
                {payTypeLabels[employee.payType] || employee.payType}
              </Badge>
            </div>
          </div>
        </TableCell>
        <TableCell>
          {employee.currentTier ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{employee.currentTier.name}</span>
              <span className="text-xs text-muted-foreground">
                ({(employee.currentTier.rate * 100).toFixed(0)}%)
              </span>
              {isNearNextTier && (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              )}
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
        </TableCell>
        <TableCell className="text-right">
          <div className="text-sm">
            <p>{formatCurrency(employee.projectedSales.services)}</p>
            <p className="text-xs text-muted-foreground">
              +{formatCurrency(employee.projectedSales.products)} products
            </p>
          </div>
        </TableCell>
        <TableCell className="text-right font-medium">
          {formatCurrency(employee.projectedCompensation.totalGross)}
        </TableCell>
      </TableRow>
      
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/30 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground font-display uppercase tracking-wide">Base Pay</p>
                <p className="font-medium">{formatCurrency(employee.projectedCompensation.basePay)}</p>
                {employee.projectedCompensation.basePay > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {(employee.payType === 'hourly' || employee.payType === 'hourly_plus_commission')
                      ? '80 hrs estimated'
                      : employee.payType === 'salary' || employee.payType === 'salary_plus_commission'
                      ? 'Bi-weekly salary'
                      : ''}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-display uppercase tracking-wide">Service Commission</p>
                <p className="font-medium text-blue-600">
                  {formatCurrency(employee.projectedCompensation.serviceCommission)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-display uppercase tracking-wide">Product Commission</p>
                <p className="font-medium text-purple-600">
                  {formatCurrency(employee.projectedCompensation.productCommission)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-display uppercase tracking-wide">Projected Total</p>
                <p className="font-medium text-lg">
                  {formatCurrency(employee.projectedCompensation.totalGross)}
                </p>
              </div>
            </div>

            {/* Commission Source */}
            {employee.commissionSource && (
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {employee.commissionSourceType === 'override' ? 'Personal Override' :
                   employee.commissionSourceType === 'location_override' ? 'Location Override' :
                   employee.commissionSourceType === 'level' ? 'Level Rate' : 'Default'}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{employee.commissionSource}</span>
              </div>
            )}
            
            {/* Tier Progression */}
            {employee.nextTier && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">
                    Progress to {employee.nextTier.name} ({(employee.nextTier.rate * 100).toFixed(0)}%)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(employee.amountToNextTier)} more needed
                  </p>
                </div>
                <Progress value={employee.tierProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {employee.tierProgress.toFixed(1)}% complete
                </p>
              </div>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function TeamCompensationTable({ employees, isLoading, periodLabel }: TeamCompensationTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (employees.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Team Compensation</CardTitle>
            <MetricInfoTooltip description="Full compensation breakdown per team member including base pay, commission, bonuses, and total gross. Data is from the most recent completed payroll run." />
          </div>
          <CardDescription>Projected earnings for current period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
            <p className="font-medium">No active employees</p>
            <p className="text-sm">Add employees to payroll to see projections.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalProjected = employees.reduce((sum, e) => sum + e.projectedCompensation.totalGross, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Team Compensation</CardTitle>
              <MetricInfoTooltip description="Full compensation breakdown per team member including base pay, commission, bonuses, and total gross. Data is from the most recent completed payroll run." />
            </div>
            <CardDescription>Projected earnings for {periodLabel}</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Projected</p>
            <p className="text-2xl font-medium">{formatCurrency(totalProjected)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-lg border mx-6 mb-6 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Employee</TableHead>
                <TableHead>Current Tier</TableHead>
                <TableHead className="text-right">Period Sales</TableHead>
                <TableHead className="text-right">Projected Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <EmployeeRow
                  key={employee.employeeId}
                  employee={employee}
                  isExpanded={expandedId === employee.employeeId}
                  onToggle={() => setExpandedId(
                    expandedId === employee.employeeId ? null : employee.employeeId
                  )}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
