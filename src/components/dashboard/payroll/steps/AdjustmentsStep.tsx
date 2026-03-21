import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Gift, Banknote, MinusCircle } from 'lucide-react';
import { EmployeePayrollSettings } from '@/hooks/useEmployeePayrollSettings';
import { EmployeeAdjustments } from '@/hooks/usePayrollCalculations';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface AdjustmentsStepProps {
  employees: EmployeePayrollSettings[];
  adjustments: Record<string, EmployeeAdjustments>;
  onAdjustmentsChange: (adjustments: Record<string, EmployeeAdjustments>) => void;
}

export function AdjustmentsStep({
  employees,
  adjustments,
  onAdjustmentsChange,
}: AdjustmentsStepProps) {
  const { formatCurrency, currency } = useFormatCurrency();
  const updateAdjustment = (
    employeeId: string,
    field: 'bonus' | 'tips' | 'deductions',
    value: number
  ) => {
    const existing = adjustments[employeeId] || {
      employeeId,
      bonus: 0,
      tips: 0,
      deductions: 0,
    };
    onAdjustmentsChange({
      ...adjustments,
      [employeeId]: {
        ...existing,
        [field]: value,
      },
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const totalBonuses = Object.values(adjustments).reduce((sum, a) => sum + a.bonus, 0);
  const totalTips = Object.values(adjustments).reduce((sum, a) => sum + a.tips, 0);
  const totalDeductions = Object.values(adjustments).reduce((sum, a) => sum + a.deductions, 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Bonuses & Adjustments</h3>
        <p className="text-sm text-muted-foreground">
          Add one-time bonuses, tips, or deductions for this pay period. These fields are optional.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
            <Gift className="h-4 w-4" />
            <span className="text-sm">Total Bonuses</span>
          </div>
          <p className="text-2xl font-medium text-green-600 dark:text-green-400">
            {formatCurrency(totalBonuses)}
          </p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
            <Banknote className="h-4 w-4" />
            <span className="text-sm">Total Tips</span>
          </div>
          <p className="text-2xl font-medium text-blue-600 dark:text-blue-400">
            {formatCurrency(totalTips)}
          </p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
            <MinusCircle className="h-4 w-4" />
            <span className="text-sm">Total Deductions</span>
          </div>
          <p className="text-2xl font-medium text-red-600 dark:text-red-400">
            {formatCurrency(totalDeductions)}
          </p>
        </div>
      </div>

      {/* Adjustments Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead className="w-36">
              <div className="flex items-center gap-1">
                <Gift className="h-4 w-4 text-green-500" />
                Bonus
              </div>
            </TableHead>
            <TableHead className="w-36">
              <div className="flex items-center gap-1">
                <Banknote className="h-4 w-4 text-blue-500" />
                Tips
              </div>
            </TableHead>
            <TableHead className="w-36">
              <div className="flex items-center gap-1">
                <MinusCircle className="h-4 w-4 text-red-500" />
                Deductions
              </div>
            </TableHead>
            <TableHead className="text-right">Net Adjustment</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((emp) => {
            const empAdjustments = adjustments[emp.employee_id] || {
              bonus: 0,
              tips: 0,
              deductions: 0,
            };
            const netAdjustment =
              empAdjustments.bonus + empAdjustments.tips - empAdjustments.deductions;

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
                <TableCell>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {currency}
                    </span>
                    <Input
                      type="number"
                      value={empAdjustments.bonus || ''}
                      onChange={(e) =>
                        updateAdjustment(emp.employee_id, 'bonus', Number(e.target.value) || 0)
                      }
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      className="pl-7"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {currency}
                    </span>
                    <Input
                      type="number"
                      value={empAdjustments.tips || ''}
                      onChange={(e) =>
                        updateAdjustment(emp.employee_id, 'tips', Number(e.target.value) || 0)
                      }
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      className="pl-7"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {currency}
                    </span>
                    <Input
                      type="number"
                      value={empAdjustments.deductions || ''}
                      onChange={(e) =>
                        updateAdjustment(emp.employee_id, 'deductions', Number(e.target.value) || 0)
                      }
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      className="pl-7"
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  <span
                    className={
                      netAdjustment > 0
                        ? 'text-green-600'
                        : netAdjustment < 0
                        ? 'text-red-600'
                        : ''
                    }
                  >
                    {netAdjustment >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netAdjustment))}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <p className="text-xs text-muted-foreground">
        * Bonuses and tips are added to gross pay. Deductions are subtracted from net pay after taxes.
      </p>
    </div>
  );
}
