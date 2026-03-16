import { useState, useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Loader2, Save, ArrowUpRight } from 'lucide-react';
import { addMonths, format, differenceInDays } from 'date-fns';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
} from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformTextarea } from '@/components/platform/ui/PlatformTextarea';
import { PlatformLabel } from '@/components/platform/ui/PlatformLabel';
import { BillingStatusCard } from './BillingStatusCard';
import { PlanSelector } from './PlanSelector';
import { CustomPricingForm } from './CustomPricingForm';
import { PromoConfigForm } from './PromoConfigForm';
import { ContractTermsForm } from './ContractTermsForm';
import { SetupFeesForm } from './SetupFeesForm';
import { InvoicePreview } from './InvoicePreview';
import { CapacityUsageCard } from './CapacityUsageCard';
import { AddOnsConfigForm } from './AddOnsConfigForm';
import { BillingHistoryCard } from './BillingHistoryCard';
import { PlanUpgradeDialog } from './PlanUpgradeDialog';
import { PandaDocDocumentsCard } from './PandaDocDocumentsCard';
import { ContractAdjustmentsPanel } from './ContractAdjustmentsPanel';
import {
  useOrganizationBilling,
  useSubscriptionPlans,
  useUpsertOrganizationBilling,
  type BillingCycle,
  type DiscountType,
  type BillingStatus,
} from '@/hooks/useOrganizationBilling';
import { useBillingCalculations } from '@/hooks/useBillingCalculations';
import { useOrganizationUsage, calculateCapacity } from '@/hooks/useOrganizationCapacity';
import { useCreateBillingChange } from '@/hooks/useBillingHistory';

interface BillingConfigurationPanelProps {
  organizationId: string;
  billingStatus: BillingStatus;
  locationCount: number;
  userCount?: number;
}

export function BillingConfigurationPanel({
  organizationId,
  billingStatus,
  locationCount,
  userCount: propUserCount,
}: BillingConfigurationPanelProps) {
  const { data: billing, isLoading: billingLoading } = useOrganizationBilling(organizationId);
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const { data: usage } = useOrganizationUsage(organizationId);
  const upsertBilling = useUpsertOrganizationBilling();
  const createBillingChange = useCreateBillingChange();

  // Dialogs
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

  // Form state
  const [planId, setPlanId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [contractLengthMonths, setContractLengthMonths] = useState(12);
  const [contractStartDate, setContractStartDate] = useState<string | null>(null);
  const [autoRenewal, setAutoRenewal] = useState(true);
  const [trialDays, setTrialDays] = useState(0);
  
  // Custom pricing
  const [customPriceEnabled, setCustomPriceEnabled] = useState(false);
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [discountType, setDiscountType] = useState<DiscountType | null>(null);
  const [discountValue, setDiscountValue] = useState<number | null>(null);
  const [discountReason, setDiscountReason] = useState<string | null>(null);
  
  // Promo
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [promoMonths, setPromoMonths] = useState<number | null>(null);
  const [promoPrice, setPromoPrice] = useState<number | null>(null);
  
  // Fees
  const [setupFee, setSetupFee] = useState(0);
  const [setupFeePaid, setSetupFeePaid] = useState(false);
  const [perLocationFee, setPerLocationFee] = useState(0);
  const [perUserFee, setPerUserFee] = useState(0);
  
  // Add-ons
  const [additionalLocationsPurchased, setAdditionalLocationsPurchased] = useState(0);
  const [additionalUsersPurchased, setAdditionalUsersPurchased] = useState(0);
  const [includedLocations, setIncludedLocations] = useState<number | null>(null);
  const [includedUsers, setIncludedUsers] = useState<number | null>(null);
  
  // Notes
  const [notes, setNotes] = useState('');

  // Use actual usage or props
  const actualLocationCount = usage?.locationCount ?? locationCount;
  const actualUserCount = usage?.userCount ?? propUserCount ?? 0;

  // Initialize from existing billing
  useEffect(() => {
    if (billing) {
      setPlanId(billing.plan_id);
      setBillingCycle(billing.billing_cycle);
      setContractLengthMonths(billing.contract_length_months);
      setContractStartDate(billing.contract_start_date);
      setAutoRenewal(billing.auto_renewal);
      setTrialDays(billing.trial_days);
      setCustomPriceEnabled(billing.custom_price !== null || billing.discount_type !== null);
      setCustomPrice(billing.custom_price);
      setDiscountType(billing.discount_type);
      setDiscountValue(billing.discount_value);
      setDiscountReason(billing.discount_reason);
      setPromoEnabled(billing.promo_months !== null && billing.promo_months > 0);
      setPromoMonths(billing.promo_months);
      setPromoPrice(billing.promo_price);
      setSetupFee(billing.setup_fee);
      setSetupFeePaid(billing.setup_fee_paid);
      setPerLocationFee(billing.per_location_fee);
      setPerUserFee(billing.per_user_fee);
      setAdditionalLocationsPurchased(billing.additional_locations_purchased);
      setAdditionalUsersPurchased(billing.additional_users_purchased);
      setIncludedLocations(billing.included_locations);
      setIncludedUsers(billing.included_users);
      setNotes(billing.notes || '');
    }
  }, [billing]);

  // Get selected plan
  const selectedPlan = plans?.find(p => p.id === planId) || null;
  const basePrice = selectedPlan?.price_monthly || 0;

  // Calculate promo end date
  const getPromoEndsAt = () => {
    if (!promoEnabled || !promoMonths || !contractStartDate) return null;
    return addMonths(new Date(contractStartDate), promoMonths).toISOString();
  };

  // Calculate trial end date
  const getTrialEndsAt = () => {
    if (!trialDays || !contractStartDate) return null;
    const start = new Date(contractStartDate);
    start.setDate(start.getDate() + trialDays);
    return start.toISOString();
  };

  // Calculate contract end date
  const getContractEndDate = () => {
    if (!contractStartDate) return null;
    return format(addMonths(new Date(contractStartDate), contractLengthMonths), 'yyyy-MM-dd');
  };

  // Build billing object for calculations
  const billingForCalc = {
    id: billing?.id || '',
    organization_id: organizationId,
    plan_id: planId,
    billing_cycle: billingCycle,
    contract_length_months: contractLengthMonths,
    contract_start_date: contractStartDate,
    contract_end_date: getContractEndDate(),
    base_price: basePrice,
    custom_price: customPriceEnabled ? customPrice : null,
    discount_type: customPriceEnabled ? discountType : null,
    discount_value: customPriceEnabled ? discountValue : null,
    discount_reason: customPriceEnabled ? discountReason : null,
    promo_months: promoEnabled ? promoMonths : null,
    promo_price: promoEnabled ? promoPrice : null,
    promo_ends_at: getPromoEndsAt(),
    trial_days: trialDays,
    trial_ends_at: getTrialEndsAt(),
    billing_starts_at: contractStartDate,
    setup_fee: setupFee,
    setup_fee_paid: setupFeePaid,
    per_location_fee: perLocationFee,
    per_user_fee: perUserFee,
    additional_locations_purchased: additionalLocationsPurchased,
    additional_users_purchased: additionalUsersPurchased,
    included_locations: includedLocations,
    included_users: includedUsers,
    auto_renewal: autoRenewal,
    non_renewal_requested_at: billing?.non_renewal_requested_at || null,
    non_renewal_reason: billing?.non_renewal_reason || null,
    notes: notes || null,
    created_at: billing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const calculation = useBillingCalculations(
    billingForCalc, 
    selectedPlan, 
    actualLocationCount,
    actualUserCount
  );

  // Calculate capacity
  const capacity = calculateCapacity(
    billingForCalc,
    selectedPlan,
    { locationCount: actualLocationCount, userCount: actualUserCount }
  );

  // Calculate days remaining for proration
  const daysRemainingInCycle = contractStartDate 
    ? Math.max(0, differenceInDays(new Date(getContractEndDate() || new Date()), new Date()))
    : 30;

  const handleSave = () => {
    upsertBilling.mutate({
      organization_id: organizationId,
      plan_id: planId,
      billing_cycle: billingCycle,
      contract_length_months: contractLengthMonths,
      contract_start_date: contractStartDate,
      contract_end_date: getContractEndDate(),
      base_price: basePrice,
      custom_price: customPriceEnabled ? customPrice : null,
      discount_type: customPriceEnabled ? discountType : null,
      discount_value: customPriceEnabled ? discountValue : null,
      discount_reason: customPriceEnabled ? discountReason : null,
      promo_months: promoEnabled ? promoMonths : null,
      promo_price: promoEnabled ? promoPrice : null,
      promo_ends_at: getPromoEndsAt(),
      trial_days: trialDays,
      trial_ends_at: getTrialEndsAt(),
      billing_starts_at: contractStartDate,
      setup_fee: setupFee,
      setup_fee_paid: setupFeePaid,
      per_location_fee: perLocationFee,
      per_user_fee: perUserFee,
      additional_locations_purchased: additionalLocationsPurchased,
      additional_users_purchased: additionalUsersPurchased,
      included_locations: includedLocations,
      included_users: includedUsers,
      auto_renewal: autoRenewal,
      notes: notes || null,
    });
  };

  const handlePlanUpgrade = (newPlanId: string, effectiveDate: 'immediately' | 'next_cycle') => {
    const newPlan = plans?.find(p => p.id === newPlanId);
    const oldPlan = selectedPlan;
    
    // Log the billing change
    createBillingChange.mutate({
      organization_id: organizationId,
      change_type: newPlan && oldPlan && newPlan.price_monthly > oldPlan.price_monthly 
        ? 'plan_upgrade' 
        : 'plan_downgrade',
      previous_value: { plan_id: planId, plan_name: oldPlan?.name },
      new_value: { plan_id: newPlanId, plan_name: newPlan?.name },
      effective_date: effectiveDate === 'immediately' ? new Date().toISOString().split('T')[0] : getContractEndDate() || undefined,
      notes: `Plan changed from ${oldPlan?.name} to ${newPlan?.name}`,
    });

    setPlanId(newPlanId);
    setUpgradeDialogOpen(false);
  };

  if (billingLoading || plansLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <BillingStatusCard
        billingStatus={billingStatus}
        calculation={calculation}
        billingCycle={billingCycle}
        nextInvoiceDate={null}
        planName={selectedPlan?.name}
      />

      {/* Capacity Usage */}
      <CapacityUsageCard
        capacity={capacity}
        onAddCapacity={() => {
          // Scroll to add-ons section
          document.getElementById('add-ons-section')?.scrollIntoView({ behavior: 'smooth' });
        }}
        onUpgradePlan={() => setUpgradeDialogOpen(true)}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Plan Selection */}
          <PlatformCard variant="glass">
            <PlatformCardHeader className="flex flex-row items-center justify-between">
              <PlatformCardTitle>Subscription Plan</PlatformCardTitle>
              {selectedPlan && plans && plans.length > 1 && (
                <PlatformButton
                  variant="outline"
                  size={tokens.button.card}
                  onClick={() => setUpgradeDialogOpen(true)}
                >
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  Change Plan
                </PlatformButton>
              )}
            </PlatformCardHeader>
            <PlatformCardContent>
              {plans && (
                <PlanSelector
                  plans={plans}
                  selectedPlanId={planId}
                  onSelect={setPlanId}
                />
              )}
            </PlatformCardContent>
          </PlatformCard>

          {/* Add-Ons Configuration */}
          <PlatformCard variant="glass" id="add-ons-section">
            <PlatformCardHeader>
              <PlatformCardTitle>Capacity Add-Ons</PlatformCardTitle>
            </PlatformCardHeader>
            <PlatformCardContent>
              <AddOnsConfigForm
                perLocationFee={perLocationFee}
                onPerLocationFeeChange={setPerLocationFee}
                additionalLocationsPurchased={additionalLocationsPurchased}
                onAdditionalLocationsPurchasedChange={setAdditionalLocationsPurchased}
                includedLocations={includedLocations}
                onIncludedLocationsChange={setIncludedLocations}
                planMaxLocations={selectedPlan?.max_locations ?? 1}
                locationMetrics={capacity.locations}
                perUserFee={perUserFee}
                onPerUserFeeChange={setPerUserFee}
                additionalUsersPurchased={additionalUsersPurchased}
                onAdditionalUsersPurchasedChange={setAdditionalUsersPurchased}
                includedUsers={includedUsers}
                onIncludedUsersChange={setIncludedUsers}
                planMaxUsers={selectedPlan?.max_users ?? 5}
                userMetrics={capacity.users}
              />
            </PlatformCardContent>
          </PlatformCard>

          {/* Custom Pricing */}
          <PlatformCard variant="glass">
            <PlatformCardHeader>
              <PlatformCardTitle>Custom Pricing</PlatformCardTitle>
            </PlatformCardHeader>
            <PlatformCardContent>
              <CustomPricingForm
                customPriceEnabled={customPriceEnabled}
                onCustomPriceEnabledChange={setCustomPriceEnabled}
                customPrice={customPrice}
                onCustomPriceChange={setCustomPrice}
                discountType={discountType}
                onDiscountTypeChange={setDiscountType}
                discountValue={discountValue}
                onDiscountValueChange={setDiscountValue}
                discountReason={discountReason}
                onDiscountReasonChange={setDiscountReason}
                basePrice={basePrice}
              />
            </PlatformCardContent>
          </PlatformCard>

          {/* Promotional Pricing */}
          <PlatformCard variant="glass">
            <PlatformCardHeader>
              <PlatformCardTitle>Promotional Pricing</PlatformCardTitle>
            </PlatformCardHeader>
            <PlatformCardContent>
              <PromoConfigForm
                promoEnabled={promoEnabled}
                onPromoEnabledChange={setPromoEnabled}
                promoMonths={promoMonths}
                onPromoMonthsChange={setPromoMonths}
                promoPrice={promoPrice}
                onPromoPriceChange={setPromoPrice}
                basePrice={customPriceEnabled && customPrice ? customPrice : basePrice}
              />
            </PlatformCardContent>
          </PlatformCard>

          {/* Contract Terms */}
          <PlatformCard variant="glass">
            <PlatformCardHeader>
              <PlatformCardTitle>Contract Terms</PlatformCardTitle>
            </PlatformCardHeader>
            <PlatformCardContent>
              <ContractTermsForm
                billingCycle={billingCycle}
                onBillingCycleChange={setBillingCycle}
                contractLengthMonths={contractLengthMonths}
                onContractLengthChange={setContractLengthMonths}
                contractStartDate={contractStartDate}
                onContractStartDateChange={setContractStartDate}
                autoRenewal={autoRenewal}
                onAutoRenewalChange={setAutoRenewal}
                trialDays={trialDays}
                onTrialDaysChange={setTrialDays}
              />
            </PlatformCardContent>
          </PlatformCard>

          {/* Setup Fees */}
          <PlatformCard variant="glass">
            <PlatformCardHeader>
              <PlatformCardTitle>Setup & One-Time Fees</PlatformCardTitle>
            </PlatformCardHeader>
            <PlatformCardContent>
              <SetupFeesForm
                setupFee={setupFee}
                onSetupFeeChange={setSetupFee}
                setupFeePaid={setupFeePaid}
                onSetupFeePaidChange={setSetupFeePaid}
                perLocationFee={perLocationFee}
                onPerLocationFeeChange={setPerLocationFee}
                locationCount={actualLocationCount}
              />
            </PlatformCardContent>
          </PlatformCard>

          {/* Notes */}
          <PlatformCard variant="glass">
            <PlatformCardHeader>
              <PlatformCardTitle>Internal Notes</PlatformCardTitle>
            </PlatformCardHeader>
            <PlatformCardContent>
              <div className="space-y-2">
                <PlatformLabel htmlFor="billingNotes">Billing Notes</PlatformLabel>
                <PlatformTextarea
                  id="billingNotes"
                  placeholder="Internal notes about billing arrangements, negotiations, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </PlatformCardContent>
          </PlatformCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <InvoicePreview
            calculation={calculation}
            billingCycle={billingCycle}
            planName={selectedPlan?.name || 'No Plan Selected'}
            setupFee={setupFee}
            setupFeePaid={setupFeePaid}
            locationCount={actualLocationCount}
            perLocationFee={perLocationFee}
            userCount={actualUserCount}
            perUserFee={perUserFee}
            additionalLocationsPurchased={additionalLocationsPurchased}
            additionalUsersPurchased={additionalUsersPurchased}
          />

          <PlatformButton
            className="w-full"
            onClick={handleSave}
            disabled={upsertBilling.isPending || !planId}
          >
            {upsertBilling.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Billing Configuration
          </PlatformButton>

          {/* PandaDoc Documents */}
          <PandaDocDocumentsCard organizationId={organizationId} />

          {/* Contract Adjustments */}
          <ContractAdjustmentsPanel
            organizationId={organizationId}
            contractStartDate={contractStartDate}
            contractEndDate={getContractEndDate()}
            monthlyRate={calculation.effectiveMonthlyAmount}
          />

          {/* Billing History */}
          <BillingHistoryCard organizationId={organizationId} />
        </div>
      </div>

      {/* Plan Upgrade Dialog */}
      {plans && (
        <PlanUpgradeDialog
          open={upgradeDialogOpen}
          onOpenChange={setUpgradeDialogOpen}
          currentPlan={selectedPlan}
          plans={plans}
          onConfirm={handlePlanUpgrade}
          isLoading={upsertBilling.isPending}
          daysRemainingInCycle={daysRemainingInCycle}
          currentMonthlyAmount={calculation.effectiveMonthlyAmount}
        />
      )}
    </div>
  );
}
