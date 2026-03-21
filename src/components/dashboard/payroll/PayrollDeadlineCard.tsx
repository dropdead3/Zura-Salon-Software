import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { LiveCountdown } from '@/components/dashboard/LiveCountdown';
import { VisibilityGate } from '@/components/visibility';
import { usePaySchedule } from '@/hooks/usePaySchedule';
import { usePayrollRunForPeriod } from '@/hooks/usePayrollRunForPeriod';
import { useHasEffectivePermission } from '@/hooks/useEffectivePermissions';
import { differenceInDays, addDays } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { AlertTriangle, CheckCircle2, ChevronRight, DollarSign, Settings, X, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

type UrgencyLevel = 'calm' | 'urgent' | 'critical';

function getUrgencyLevel(daysUntilDeadline: number): UrgencyLevel {
  if (daysUntilDeadline < 0) return 'critical';
  if (daysUntilDeadline <= 2) return 'urgent';
  return 'calm';
}

const urgencyStyles: Record<UrgencyLevel, { card: string; icon: string; iconBg: string }> = {
  calm: {
    card: 'border-border/40',
    icon: 'text-primary',
    iconBg: 'bg-primary/10',
  },
  urgent: {
    card: 'border-amber-500/50',
    icon: 'text-amber-600',
    iconBg: 'bg-amber-500/10',
  },
  critical: {
    card: 'border-destructive/50',
    icon: 'text-destructive',
    iconBg: 'bg-destructive/10',
  },
};

export function PayrollDeadlineCard() {
  const { formatDate } = useFormatDate();
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');
  const hasPayrollPermission = useHasEffectivePermission('manage_payroll');
  const { settings, currentPeriod, isLoading } = usePaySchedule();
  const { hasRun, isLoading: isCheckingRun } = usePayrollRunForPeriod(
    currentPeriod?.periodStart ?? null,
    currentPeriod?.periodEnd ?? null
  );
  const [configDismissed, setConfigDismissed] = useState(
    () => localStorage.getItem('payroll-deadline-config-dismissed') === 'true'
  );

  // Only visible to users with manage_payroll permission
  if (!hasPayrollPermission) return null;
  if (isLoading || isCheckingRun) return null;

  // No pay schedule configured
  if (!settings) {
    if (configDismissed) return null;

    const handleDismiss = () => {
      setConfigDismissed(true);
      localStorage.setItem('payroll-deadline-config-dismissed', 'true');
    };

    return (
      <VisibilityGate
        elementKey="payroll_deadline_countdown"
        elementName="Payroll Deadline Countdown"
        elementCategory="Payroll"
      >
        <Card className="border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                <Settings className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{t('payroll.pay_schedule_not_configured')}</p>
                <p className="text-xs">{t('payroll.setup_pay_schedule_desc')}</p>
              </div>
              <Button variant="ghost" size={tokens.button.inline} asChild>
                <Link to="/dashboard/admin/payroll?tab=settings">
                  {tc('configure')} <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      </VisibilityGate>
    );
  }

  // Payroll already submitted for this period — hide
  if (hasRun) return null;

  const periodEndDate = currentPeriod.periodEnd;
  const checkDate = currentPeriod.nextPayDay;
  const now = new Date();
  const daysUntilDeadline = differenceInDays(periodEndDate, now);
  const isAutomatic = settings.processing_mode === 'automatic';

  // More than 5 days away — too early, hide
  if (daysUntilDeadline > 5) return null;

  // Calculate scheduled auto-run date for automatic mode
  const autoRunDate = isAutomatic
    ? addDays(checkDate, -(settings.auto_run_days_before_check ?? 2))
    : null;
  const daysUntilAutoRun = autoRunDate ? differenceInDays(autoRunDate, now) : null;

  const urgency = isAutomatic ? 'calm' : getUrgencyLevel(daysUntilDeadline);
  const styles = urgencyStyles[urgency];
  const isPastDeadline = daysUntilDeadline < 0;

  return (
    <VisibilityGate
      elementKey="payroll_deadline_countdown"
      elementName="Payroll Deadline Countdown"
      elementCategory="Payroll"
    >
      <Card className={cn(styles.card)}>
        <CardHeader className="pb-2 pt-4 px-5">
          <div className="flex items-center gap-2">
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', styles.iconBg)}>
              {isAutomatic ? (
                <Zap className={cn('h-4 w-4', styles.icon)} />
              ) : isPastDeadline ? (
                <AlertTriangle className={cn('h-4 w-4', styles.icon)} />
              ) : (
                <DollarSign className={cn('h-4 w-4', styles.icon)} />
              )}
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm font-display tracking-wide">
                {isAutomatic
                  ? t('payroll.auto_payroll_scheduled')
                  : isPastDeadline
                    ? t('payroll.payroll_overdue_title')
                    : t('payroll.payroll_submission')}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {formatDate(currentPeriod.periodStart, 'MMM d')} – {formatDate(periodEndDate, 'MMM d')}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4 pt-1 space-y-3">
          {isAutomatic ? (
            /* Automatic payroll mode */
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-medium text-primary">{t('payroll.auto_run_enabled')}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {autoRunDate && daysUntilAutoRun !== null
                    ? daysUntilAutoRun <= 0
                      ? t('payroll.scheduled_today')
                      : daysUntilAutoRun === 1
                        ? t('payroll.runs_tomorrow', { date: formatDate(autoRunDate, 'MMM d') })
                        : t('payroll.runs_in_days', { date: formatDate(autoRunDate, 'MMM d'), days: daysUntilAutoRun })
                    : t('payroll.scheduled_via_provider')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">{t('payroll.check_date')}</p>
                <p className="text-sm font-medium">{formatDate(checkDate, 'MMM d')}</p>
              </div>
            </div>
          ) : isPastDeadline ? (
            /* Manual mode — overdue */
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-destructive font-medium mb-1">{t('payroll.deadline_passed')}</p>
                <p className="text-sm font-medium text-destructive">
                  {Math.abs(daysUntilDeadline) === 1
                    ? t('payroll.days_overdue_one', { count: Math.abs(daysUntilDeadline) })
                    : t('payroll.days_overdue_other', { count: Math.abs(daysUntilDeadline) })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">{t('payroll.check_date')}</p>
                <p className="text-sm font-medium">{formatDate(checkDate, 'MMM d')}</p>
              </div>
            </div>
          ) : (
            /* Manual mode — upcoming */
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('payroll.manual_submission_due')}</p>
                <LiveCountdown
                  expiresAt={periodEndDate}
                  displayMode="days"
                  urgentThresholdMs={24 * 60 * 60 * 1000}
                  hideIcon
                  className="text-base font-medium"
                />
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">{t('payroll.check_date')}</p>
                <p className="text-sm font-medium">{formatDate(checkDate, 'MMM d')}</p>
              </div>
            </div>
          )}

          <Button
            variant={isPastDeadline && !isAutomatic ? 'destructive' : 'outline'}
            size={tokens.button.card}
            className="w-full"
            asChild
          >
            <Link to="/dashboard/admin/payroll">
              {isAutomatic
                ? t('payroll.view_payroll')
                : isPastDeadline
                  ? t('payroll.run_payroll_now')
                  : t('payroll.run_payroll')}{' '}
              <ChevronRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </VisibilityGate>
  );
}
