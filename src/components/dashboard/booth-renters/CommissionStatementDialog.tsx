import { useState } from 'react';
import { useCreateCommissionStatement, CreateStatementData } from '@/hooks/useCommissionStatements';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { CalendarIcon, FileText, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface CommissionStatementDialogProps {
  organizationId: string;
  boothRenterId: string;
  renterName: string;
  commissionRate: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommissionStatementDialog({
  organizationId,
  boothRenterId,
  renterName,
  commissionRate,
  open,
  onOpenChange,
}: CommissionStatementDialogProps) {
  const createStatement = useCreateCommissionStatement();
  const { formatDate } = useFormatDate();
  const { formatCurrency, currency } = useFormatCurrency();
  
  const lastMonth = subMonths(new Date(), 1);
  const [periodStart, setPeriodStart] = useState<Date>(startOfMonth(lastMonth));
  const [periodEnd, setPeriodEnd] = useState<Date>(endOfMonth(lastMonth));
  const [totalRetailSales, setTotalRetailSales] = useState<number>(0);
  const [totalServiceRevenue, setTotalServiceRevenue] = useState<number>(0);
  const [deductions, setDeductions] = useState<number>(0);
  const [deductionNotes, setDeductionNotes] = useState('');

  const totalCommission = totalRetailSales * commissionRate;
  const netPayout = totalCommission - deductions;

  const handleSubmit = async () => {
    await createStatement.mutateAsync({
      organization_id: organizationId,
      booth_renter_id: boothRenterId,
      period_start: format(periodStart, 'yyyy-MM-dd'),
      period_end: format(periodEnd, 'yyyy-MM-dd'),
      total_retail_sales: totalRetailSales,
      total_service_revenue: totalServiceRevenue,
      commission_rate: commissionRate,
      deductions,
      deduction_notes: deductionNotes || undefined,
    });
    
    onOpenChange(false);
    
    // Reset form
    setTotalRetailSales(0);
    setTotalServiceRevenue(0);
    setDeductions(0);
    setDeductionNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Commission Statement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium">{renterName}</p>
            <p className="text-xs text-muted-foreground">
              Commission Rate: {(commissionRate * 100).toFixed(1)}%
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Period Start</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !periodStart && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {periodStart ? formatDate(periodStart, "MMM d, yyyy") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={periodStart}
                    onSelect={(date) => date && setPeriodStart(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Period End</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !periodEnd && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {periodEnd ? formatDate(periodEnd, "MMM d, yyyy") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={periodEnd}
                    onSelect={(date) => date && setPeriodEnd(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Total Retail Sales</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">{currency}</span>
              <Input
                type="number"
                step="0.01"
                className="pl-7"
                value={totalRetailSales || ''}
                onChange={(e) => setTotalRetailSales(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Total Service Revenue (Optional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">{currency}</span>
              <Input
                type="number"
                step="0.01"
                className="pl-7"
                value={totalServiceRevenue || ''}
                onChange={(e) => setTotalServiceRevenue(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              For reference only - commission is calculated on retail sales
            </p>
          </div>

          <div className="space-y-2">
            <Label>Deductions</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">{currency}</span>
              <Input
                type="number"
                step="0.01"
                className="pl-7"
                value={deductions || ''}
                onChange={(e) => setDeductions(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          </div>

          {deductions > 0 && (
            <div className="space-y-2">
              <Label>Deduction Notes</Label>
              <Textarea
                value={deductionNotes}
                onChange={(e) => setDeductionNotes(e.target.value)}
                placeholder="Reason for deductions..."
                rows={2}
              />
            </div>
          )}

          <div className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Retail Sales</span>
              <span>{formatCurrency(totalRetailSales)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Commission ({(commissionRate * 100).toFixed(1)}%)</span>
              <span>{formatCurrency(totalCommission)}</span>
            </div>
            {deductions > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Deductions</span>
                <span>-{formatCurrency(deductions)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-medium">
              <span>Net Payout</span>
              <span className="flex items-center gap-1">
                {formatCurrency(netPayout)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createStatement.isPending || totalRetailSales <= 0}
          >
            Generate Statement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
