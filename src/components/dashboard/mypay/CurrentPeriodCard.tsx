import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { EmployeeCompensation } from '@/hooks/usePayrollCalculations';
import { EmployeePayrollSettings } from '@/hooks/useEmployeePayrollSettings';
import { CurrentPeriod } from '@/hooks/useMyPayData';
import { LiveCountdown } from '@/components/dashboard/LiveCountdown';
import { parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { CalendarDays, TrendingUp } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Badge } from '@/components/ui/badge';

interface CurrentPeriodCardProps {
  currentPeriod: CurrentPeriod;
  estimatedCompensation: EmployeeCompensation | null;
  settings: EmployeePayrollSettings;
}

export function CurrentPeriodCard({ currentPeriod, estimatedCompensation, settings }: CurrentPeriodCardProps) {
  const { formatDate: formatDateLocale } = useFormatDate();
  const { formatCurrencyWhole, formatCurrency } = useFormatCurrency();

  const formatDate = (dateStr: string): string => {
    try {
      return formatDateLocale(parseISO(dateStr), 'MMM d');
    } catch {
      return dateStr;
    }
  };
  const comp = estimatedCompensation;

  // Determine if hourly rate is from level fallback
  const isLevelRate = comp && comp.hourlyPay > 0 && !settings.hourly_rate && comp.hourlyRate;
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Current Period</CardTitle>
        </div>
        <CardDescription>
          {formatDate(currentPeriod.startDate)} – {formatDate(currentPeriod.endDate)}
        </CardDescription>
        {currentPeriod.checkDate && (
          <div className="pt-2">
            <LiveCountdown
              expiresAt={parseISO(currentPeriod.checkDate)}
              displayMode="days"
              urgentThresholdMs={3 * 24 * 60 * 60 * 1000}
              className="text-sm"
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {comp ? (
          <>
            {/* Base Pay Section */}
            {(comp.hourlyPay > 0 || comp.salaryPay > 0) && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-muted-foreground">
                      {comp.salaryPay > 0 ? 'Salary' : 'Hourly Pay'}
                    </span>
                    {isLevelRate && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        Level Rate
                      </Badge>
                    )}
                  </div>
                  <BlurredAmount className="text-sm">
                    {formatCurrencyWhole(comp.salaryPay > 0 ? comp.salaryPay : comp.hourlyPay)}
                  </BlurredAmount>
                </div>
                {comp.hourlyPay > 0 && comp.hourlyRate && (
                  <p className="text-[10px] text-muted-foreground text-right">
                    {comp.regularHours} hrs × {formatCurrency(comp.hourlyRate)}/hr
                  </p>
                )}
              </div>
            )}

            {/* Commission */}
            {settings.commission_enabled && comp.commissionPay > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Commission*</span>
                <BlurredAmount className="text-sm text-primary">
                  {formatCurrencyWhole(comp.commissionPay)}
                </BlurredAmount>
              </div>
            )}

            <Separator />

            {/* Gross */}
            <div className="flex justify-between items-center">
              <span className="text-sm">Est. Gross</span>
              <BlurredAmount className="text-sm font-medium">
                {formatCurrencyWhole(comp.grossPay)}
              </BlurredAmount>
            </div>

            {/* Taxes */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Est. Taxes</span>
              <BlurredAmount className="text-sm text-muted-foreground">
                ~{formatCurrencyWhole(comp.estimatedTaxes)}
              </BlurredAmount>
            </div>

            <Separator />

            {/* Net */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Est. Net</span>
              <BlurredAmount className="text-lg font-medium text-primary">
                ~{formatCurrencyWhole(comp.netPay)}
              </BlurredAmount>
            </div>

            {settings.commission_enabled && (
              <p className="text-xs text-muted-foreground mt-4">
                *Commission is estimated based on current sales data and may change.
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Unable to calculate estimates</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
