import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Check, DollarSign } from 'lucide-react';
import { PayPeriodStep } from './steps/PayPeriodStep';
import { EmployeeHoursStep } from './steps/EmployeeHoursStep';
import { CommissionStep } from './steps/CommissionStep';
import { AdjustmentsStep } from './steps/AdjustmentsStep';
import { ReviewStep } from './steps/ReviewStep';
import { useEmployeePayrollSettings } from '@/hooks/useEmployeePayrollSettings';
import { usePayrollCalculations, usePayrollSalesData, EmployeeHours, EmployeeAdjustments, EmployeeCompensation } from '@/hooks/usePayrollCalculations';
import { usePayroll } from '@/hooks/usePayroll';

const STEPS = [
  { id: 'pay-period', label: 'Pay Period', description: 'Select dates' },
  { id: 'hours', label: 'Hours', description: 'Enter hours' },
  { id: 'commissions', label: 'Commissions', description: 'Review commissions' },
  { id: 'adjustments', label: 'Adjustments', description: 'Add bonuses/tips' },
  { id: 'review', label: 'Review', description: 'Confirm & submit' },
];

interface RunPayrollWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export function RunPayrollWizard({ onComplete, onCancel }: RunPayrollWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [payPeriodStart, setPayPeriodStart] = useState<string | null>(null);
  const [payPeriodEnd, setPayPeriodEnd] = useState<string | null>(null);
  const [checkDate, setCheckDate] = useState<string | null>(null);
  const [employeeHours, setEmployeeHours] = useState<Record<string, EmployeeHours>>({});
  const [employeeAdjustments, setEmployeeAdjustments] = useState<Record<string, EmployeeAdjustments>>({});
  const [commissionOverrides, setCommissionOverrides] = useState<Record<string, number>>({});
  
  const { employeeSettings, isLoading: loadingSettings } = useEmployeePayrollSettings();
  const { calculateEmployeeCompensation, calculatePayrollTotals, getWeeksInPeriod } = usePayrollCalculations();
  const { createLocalPayrollRun, isCreatingLocalRun } = usePayroll();

  // Get active employees for payroll
  const activeEmployees = useMemo(() =>
    employeeSettings.filter(s => s.is_payroll_active),
    [employeeSettings]
  );

  const employeeIds = useMemo(() => 
    activeEmployees.map(e => e.employee_id),
    [activeEmployees]
  );

  // Fetch sales data for the pay period
  const { data: salesData, isLoading: loadingSales } = usePayrollSalesData(
    payPeriodStart,
    payPeriodEnd,
    employeeIds
  );

  // Calculate all employee compensations
  const compensations = useMemo(() => {
    if (!payPeriodStart || !payPeriodEnd) return [];
    
    const weeksInPeriod = getWeeksInPeriod(payPeriodStart, payPeriodEnd);
    
    return activeEmployees.map(settings => {
      const hours = employeeHours[settings.employee_id] || {
        employeeId: settings.employee_id,
        regularHours: 0,
        overtimeHours: 0,
      };
      
      const sales = salesData?.find(s => s.employeeId === settings.employee_id);
      const adjustments = employeeAdjustments[settings.employee_id];
      
      const compensation = calculateEmployeeCompensation(
        settings,
        hours,
        sales,
        adjustments,
        weeksInPeriod
      );

      // Apply commission override if set
      if (commissionOverrides[settings.employee_id] !== undefined) {
        const overrideAmount = commissionOverrides[settings.employee_id];
        const diff = overrideAmount - compensation.commissionPay;
        compensation.commissionPay = overrideAmount;
        compensation.grossPay += diff;
        compensation.netPay += diff * (1 - 0.3465); // Adjust for taxes
      }

      return compensation;
    });
  }, [activeEmployees, payPeriodStart, payPeriodEnd, employeeHours, salesData, employeeAdjustments, commissionOverrides, calculateEmployeeCompensation, getWeeksInPeriod]);

  const totals = useMemo(() => 
    calculatePayrollTotals(compensations),
    [compensations, calculatePayrollTotals]
  );

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (status: 'draft' | 'submitted') => {
    if (!payPeriodStart || !payPeriodEnd || !checkDate) return;

    createLocalPayrollRun(
      {
        payPeriodStart,
        payPeriodEnd,
        checkDate,
        status,
        lineItems: compensations,
      },
      {
        onSuccess: () => {
          onComplete?.();
        },
      }
    );
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Pay period
        return payPeriodStart && payPeriodEnd && checkDate;
      case 1: // Hours
        return true; // Always can proceed, hours default to 0
      case 2: // Commissions
        return true; // Sales data is auto-loaded
      case 3: // Adjustments
        return true; // Adjustments are optional
      case 4: // Review
        return compensations.length > 0;
      default:
        return false;
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Run Payroll
        </CardTitle>
        <CardDescription>
          Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].description}
        </CardDescription>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      
      <CardContent>
        {/* Step Indicators */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm
                    ${index < currentStep 
                      ? 'bg-primary text-primary-foreground' 
                      : index === currentStep 
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                        : 'bg-muted text-muted-foreground'
                    }
                  `}
                >
                  {index < currentStep ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="text-xs mt-1 text-muted-foreground hidden sm:block">
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-8 sm:w-16 h-0.5 mx-2 ${
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {currentStep === 0 && (
              <PayPeriodStep
                payPeriodStart={payPeriodStart}
                payPeriodEnd={payPeriodEnd}
                checkDate={checkDate}
                onPayPeriodStartChange={setPayPeriodStart}
                onPayPeriodEndChange={setPayPeriodEnd}
                onCheckDateChange={setCheckDate}
              />
            )}
            {currentStep === 1 && (
              <EmployeeHoursStep
                employees={activeEmployees}
                hours={employeeHours}
                onHoursChange={setEmployeeHours}
              />
            )}
            {currentStep === 2 && (
              <CommissionStep
                employees={activeEmployees}
                salesData={salesData || []}
                compensations={compensations}
                overrides={commissionOverrides}
                onOverrideChange={setCommissionOverrides}
                isLoading={loadingSales}
                payPeriodStart={payPeriodStart}
                payPeriodEnd={payPeriodEnd}
              />
            )}
            {currentStep === 3 && (
              <AdjustmentsStep
                employees={activeEmployees}
                adjustments={employeeAdjustments}
                onAdjustmentsChange={setEmployeeAdjustments}
              />
            )}
            {currentStep === 4 && (
              <ReviewStep
                compensations={compensations}
                totals={totals}
                payPeriodStart={payPeriodStart!}
                payPeriodEnd={payPeriodEnd!}
                checkDate={checkDate!}
                isSubmitting={isCreatingLocalRun}
                onSaveAsDraft={() => handleSubmit('draft')}
                onFinalize={() => handleSubmit('submitted')}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t">
          <div>
            {currentStep > 0 ? (
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            ) : (
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
          
          {currentStep < STEPS.length - 1 && (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
