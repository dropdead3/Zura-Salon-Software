import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { EmployeeCompensation } from '@/hooks/usePayrollCalculations';
import { EmployeePayrollSettings } from '@/hooks/useEmployeePayrollSettings';
import { useStylistLevels } from '@/hooks/useStylistLevels';
import { TrendingUp, Award } from 'lucide-react';

interface EarningsBreakdownCardProps {
  estimatedCompensation: EmployeeCompensation | null;
  salesData: { serviceRevenue: number; productRevenue: number };
  settings: EmployeePayrollSettings;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function EarningsBreakdownCard({ estimatedCompensation, salesData, settings }: EarningsBreakdownCardProps) {
  const { data: levels } = useStylistLevels();
  const comp = estimatedCompensation;
  
  const totalRevenue = salesData.serviceRevenue + salesData.productRevenue;

  // Find the stylist's level based on their settings (if available)
  // For the My Pay view, show current level info
  const currentLevel = levels?.find(l => {
    // Match based on commission rate if available
    if (comp?.serviceCommission && salesData.serviceRevenue > 0) {
      const effectiveRate = comp.serviceCommission / salesData.serviceRevenue;
      return Math.abs((l.service_commission_rate ?? 0) - effectiveRate) < 0.01;
    }
    return false;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Earnings Breakdown</CardTitle>
        </div>
        <CardDescription>Based on your current sales</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Earnings Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Base Pay</p>
            <BlurredAmount className="text-sm font-medium">
              {formatCurrency((comp?.hourlyPay || 0) + (comp?.salaryPay || 0))}
            </BlurredAmount>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Commission</p>
            <BlurredAmount className="text-sm font-medium text-primary">
              {formatCurrency(comp?.commissionPay || 0)}
            </BlurredAmount>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Tips/Bonus</p>
            <BlurredAmount className="text-sm font-medium">
              {formatCurrency((comp?.tips || 0) + (comp?.bonusPay || 0))}
            </BlurredAmount>
          </div>
        </div>

        {/* Commission Level Info */}
        {settings.commission_enabled && currentLevel && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {currentLevel.label}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {Math.round((currentLevel.service_commission_rate ?? 0) * 100)}% commission
              </span>
            </div>
          </div>
        )}

        {/* Total Revenue */}
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Sales This Period</span>
            <BlurredAmount className="text-sm font-medium">
              {formatCurrency(totalRevenue)}
            </BlurredAmount>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-muted-foreground">Services</span>
            <BlurredAmount className="text-xs text-muted-foreground">
              {formatCurrency(salesData.serviceRevenue)}
            </BlurredAmount>
          </div>
          <div className="flex justify-between items-center mt-0.5">
            <span className="text-xs text-muted-foreground">Products</span>
            <BlurredAmount className="text-xs text-muted-foreground">
              {formatCurrency(salesData.productRevenue)}
            </BlurredAmount>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
