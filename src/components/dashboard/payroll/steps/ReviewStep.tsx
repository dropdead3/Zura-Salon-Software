import { useState } from 'react';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  DollarSign, 
  Users, 
  Calendar, 
  ChevronDown, 
  FileDown, 
  Save, 
  Send,
  Building2
} from 'lucide-react';
import { EmployeeCompensation, PayrollTotals } from '@/hooks/usePayrollCalculations';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { tokens } from '@/lib/design-tokens';

interface ReviewStepProps {
  compensations: EmployeeCompensation[];
  totals: PayrollTotals;
  payPeriodStart: string;
  payPeriodEnd: string;
  checkDate: string;
  isSubmitting: boolean;
  onSaveAsDraft: () => void;
  onFinalize: () => void;
}

const PAY_TYPE_LABELS: Record<string, string> = {
  hourly: 'Hourly',
  salary: 'Salary',
  commission: 'Commission',
  hourly_plus_commission: 'Hourly + Comm',
  salary_plus_commission: 'Salary + Comm',
};

export function ReviewStep({
  compensations,
  totals,
  payPeriodStart,
  payPeriodEnd,
  checkDate,
  isSubmitting,
  onSaveAsDraft,
  onFinalize,
}: ReviewStepProps) {
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const { formatCurrency, formatCurrencyWhole } = useFormatCurrency();
  const { formatDate } = useFormatDate();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const exportToCSV = () => {
    const headers = [
      'Employee',
      'Pay Type',
      'Regular Hours',
      'Overtime Hours',
      'Hourly Pay',
      'Salary Pay',
      'Commission',
      'Bonus',
      'Tips',
      'Gross Pay',
      'Est. Taxes',
      'Deductions',
      'Net Pay',
    ];

    const rows = compensations.map((c) => [
      c.employeeName,
      c.payType,
      c.regularHours,
      c.overtimeHours,
      c.hourlyPay.toFixed(2),
      c.salaryPay.toFixed(2),
      c.commissionPay.toFixed(2),
      c.bonusPay.toFixed(2),
      c.tips.toFixed(2),
      c.grossPay.toFixed(2),
      c.estimatedTaxes.toFixed(2),
      c.deductions.toFixed(2),
      c.netPay.toFixed(2),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${payPeriodStart}-${payPeriodEnd}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Review & Submit</h3>
        <p className="text-sm text-muted-foreground">
          Review the payroll summary before saving or finalizing.
        </p>
      </div>

      {/* Payroll Summary Header */}
      <div className="bg-muted/50 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Pay Period</p>
              <p className="font-medium">
                {formatDate(new Date(payPeriodStart), 'MMM d')} -{' ')}
                {formatDate(new Date(payPeriodEnd), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Check Date</p>
              <p className="font-medium">{formatDate(new Date(checkDate), 'MMM d, yyyy')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Employees</p>
              <p className="font-medium">{totals.employeeCount}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant="secondary">Draft</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Gross Pay</p>
          <p className="text-2xl font-medium text-primary">
            {formatCurrency(totals.grossPay)}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Employee Taxes</p>
          <p className="text-2xl font-medium">
            {formatCurrency(totals.employeeTaxes)}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Employer Taxes</p>
          <p className="text-2xl font-medium">
            {formatCurrency(totals.employerTaxes)}
          </p>
        </div>
        <div className="bg-success/10 border border-success/20 rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Net Pay</p>
          <p className="text-2xl font-medium text-success-foreground">
            {formatCurrency(totals.netPay)}
          </p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
        <div className="bg-muted/30 rounded p-3">
          <p className="text-muted-foreground">Hourly Pay</p>
          <p className="font-medium">{formatCurrencyWhole(totals.totalHourlyPay)}</p>
        </div>
        <div className="bg-muted/30 rounded p-3">
          <p className="text-muted-foreground">Salary Pay</p>
          <p className="font-medium">{formatCurrencyWhole(totals.totalSalaryPay)}</p>
        </div>
        <div className="bg-muted/30 rounded p-3">
          <p className="text-muted-foreground">Commissions</p>
          <p className="font-medium">{formatCurrencyWhole(totals.totalCommissions)}</p>
        </div>
        <div className="bg-muted/30 rounded p-3">
          <p className="text-muted-foreground">Bonuses</p>
          <p className="font-medium">{formatCurrencyWhole(totals.totalBonuses)}</p>
        </div>
        <div className="bg-muted/30 rounded p-3">
          <p className="text-muted-foreground">Tips</p>
          <p className="font-medium">{formatCurrencyWhole(totals.totalTips)}</p>
        </div>
      </div>

      <Separator />

      {/* Employee Details */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium">Employee Breakdown</h4>
          <Button variant="outline" size={tokens.button.card} onClick={exportToCSV}>
            <FileDown className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>

        <div className="space-y-2">
          {compensations.map((comp) => (
            <Collapsible
              key={comp.employeeId}
              open={expandedEmployee === comp.employeeId}
              onOpenChange={(open) => setExpandedEmployee(open ? comp.employeeId : null)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={comp.photoUrl || undefined} />
                      <AvatarFallback>{getInitials(comp.employeeName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{comp.employeeName}</p>
                      <Badge variant="outline" className="text-xs">
                        {PAY_TYPE_LABELS[comp.payType]}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Gross</p>
                      <p className="font-medium">
                        {formatCurrency(comp.grossPay)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Net</p>
                      <p className="font-medium text-success-foreground">
                        {formatCurrency(comp.netPay)}
                      </p>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition-transform ${
                        expandedEmployee === comp.employeeId ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 bg-muted/20 rounded-b-lg -mt-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {comp.hourlyPay > 0 && (
                    <div>
                      <p className="text-muted-foreground">Hourly Pay</p>
                      <p>
                        {formatCurrency(comp.hourlyPay)} ({comp.regularHours}h + {comp.overtimeHours}h OT)
                      </p>
                    </div>
                  )}
                  {comp.salaryPay > 0 && (
                    <div>
                      <p className="text-muted-foreground">Salary Pay</p>
                      <p>{formatCurrency(comp.salaryPay)}</p>
                    </div>
                  )}
                  {comp.commissionPay > 0 && (
                    <div>
                      <p className="text-muted-foreground">Commission</p>
                      <p>{formatCurrency(comp.commissionPay)}</p>
                    </div>
                  )}
                  {comp.bonusPay > 0 && (
                    <div>
                      <p className="text-muted-foreground">Bonus</p>
                      <p>{formatCurrency(comp.bonusPay)}</p>
                    </div>
                  )}
                  {comp.tips > 0 && (
                    <div>
                      <p className="text-muted-foreground">Tips</p>
                      <p>{formatCurrency(comp.tips)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Federal Tax (Est.)</p>
                    <p>{formatCurrency(comp.estimatedFederalTax)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">State Tax (Est.)</p>
                    <p>{formatCurrency(comp.estimatedStateTax)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">FICA (Est.)</p>
                    <p>{formatCurrency(comp.estimatedFICA)}</p>
                  </div>
                  {comp.deductions > 0 && (
                    <div>
                      <p className="text-muted-foreground">Deductions</p>
                      <p>-{formatCurrency(comp.deductions)}</p>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onSaveAsDraft}
          disabled={isSubmitting}
        >
          <Save className="h-4 w-4 mr-2" />
          Save as Draft
        </Button>
        <Button className="flex-1" onClick={onFinalize} disabled={isSubmitting}>
          <Send className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Processing...' : 'Finalize Payroll')}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        * Tax estimates are approximate. Actual taxes will be calculated by your payroll provider when
        connected.
      </p>
    </div>
  );
}
