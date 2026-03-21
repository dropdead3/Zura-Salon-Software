import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Users } from 'lucide-react';
import { EmployeePayrollSettings } from '@/hooks/useEmployeePayrollSettings';
import { EmployeeHours } from '@/hooks/usePayrollCalculations';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface EmployeeHoursStepProps {
  employees: EmployeePayrollSettings[];
  hours: Record<string, EmployeeHours>;
  onHoursChange: (hours: Record<string, EmployeeHours>) => void;
}

const PAY_TYPE_LABELS: Record<string, string> = {
  hourly: 'Hourly',
  salary: 'Salary',
  commission: 'Commission',
  hourly_plus_commission: 'Hourly + Commission',
  salary_plus_commission: 'Salary + Commission',
};

export function EmployeeHoursStep({ employees, hours, onHoursChange }: EmployeeHoursStepProps) {
  const [standardHours, setStandardHours] = useState(80); // Default bi-weekly
  const { formatCurrency, formatCurrencyWhole, currency } = useFormatCurrency();

  const updateHours = (employeeId: string, field: 'regularHours' | 'overtimeHours', value: number) => {
    const existing = hours[employeeId] || {
      employeeId,
      regularHours: 0,
      overtimeHours: 0,
    };
    onHoursChange({
      ...hours,
      [employeeId]: {
        ...existing,
        [field]: value,
      },
    });
  };

  const applyStandardHours = () => {
    const hourlyEmployees = employees.filter(
      (e) => e.pay_type === 'hourly' || e.pay_type === 'hourly_plus_commission'
    );
    
    const updatedHours = { ...hours };
    hourlyEmployees.forEach((emp) => {
      updatedHours[emp.employee_id] = {
        employeeId: emp.employee_id,
        regularHours: standardHours,
        overtimeHours: 0,
      };
    });
    onHoursChange(updatedHours);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isHourlyEmployee = (payType: string) => {
    return payType === 'hourly' || payType === 'hourly_plus_commission';
  };

  const hourlyEmployees = employees.filter((e) => isHourlyEmployee(e.pay_type));
  const nonHourlyEmployees = employees.filter((e) => !isHourlyEmployee(e.pay_type));

  const totalRegularHours = Object.values(hours).reduce((sum, h) => sum + h.regularHours, 0);
  const totalOvertimeHours = Object.values(hours).reduce((sum, h) => sum + h.overtimeHours, 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Enter Hours Worked</h3>
        <p className="text-sm text-muted-foreground">
          Enter regular and overtime hours for hourly employees. Salaried employees are calculated automatically.
        </p>
      </div>

      {/* Bulk Action */}
      {hourlyEmployees.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <span className="text-sm">Apply</span>
            <Input
              type="number"
              value={standardHours}
              onChange={(e) => setStandardHours(Number(e.target.value))}
              className="w-20"
              min={0}
            />
            <span className="text-sm">hours to all hourly employees</span>
          </div>
          <Button size={tokens.button.inline} variant="secondary" onClick={applyStandardHours}>
            Apply
          </Button>
        </div>
      )}

      {/* Hourly Employees */}
      {hourlyEmployees.length > 0 && (
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Hourly Employees ({hourlyEmployees.length})
          </h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Pay Type</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead className="w-32">Regular Hours</TableHead>
                <TableHead className="w-32">Overtime Hours</TableHead>
                <TableHead className="text-right">Estimated Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hourlyEmployees.map((emp) => {
                const empHours = hours[emp.employee_id] || { regularHours: 0, overtimeHours: 0 };
                const rate = emp.hourly_rate || 0;
                const regularPay = empHours.regularHours * rate;
                const overtimePay = empHours.overtimeHours * rate * 1.5;
                const totalPay = regularPay + overtimePay;

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
                      <Badge variant="outline">{PAY_TYPE_LABELS[emp.pay_type]}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(rate)}/hr</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={empHours.regularHours || ''}
                        onChange={(e) =>
                          updateHours(emp.employee_id, 'regularHours', Number(e.target.value))
                        }
                        min={0}
                        step={0.5}
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={empHours.overtimeHours || ''}
                        onChange={(e) =>
                          updateHours(emp.employee_id, 'overtimeHours', Number(e.target.value))
                        }
                        min={0}
                        step={0.5}
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(totalPay)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Non-Hourly Employees */}
      {nonHourlyEmployees.length > 0 && (
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Salaried / Commission Employees ({nonHourlyEmployees.length})
          </h4>
          <div className="bg-muted/30 rounded-lg p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Pay Type</TableHead>
                  <TableHead>Compensation</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nonHourlyEmployees.map((emp) => (
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
                      <Badge variant="outline">{PAY_TYPE_LABELS[emp.pay_type]}</Badge>
                    </TableCell>
                    <TableCell>
                      {emp.salary_amount ? (
                        <span>{formatCurrencyWhole(emp.salary_amount)}/year</span>
                      ) : emp.commission_enabled ? (
                        <span className="text-muted-foreground">Commission-based</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">Auto-calculated</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            * Salary and commission amounts are calculated automatically based on employee settings
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <h4 className="font-medium mb-2">Hours Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Regular Hours:</span>
            <span className="ml-2 font-medium">{totalRegularHours.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Overtime Hours:</span>
            <span className="ml-2 font-medium">{totalOvertimeHours.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
