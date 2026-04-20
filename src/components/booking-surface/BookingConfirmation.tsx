import { Calendar, Clock, User, Scissors, MapPin, CheckCircle2, CalendarPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import type { BookingSurfaceTheme } from '@/hooks/useBookingSurfaceConfig';
import type { BookingClientInfo } from './BookingClientForm';
import type { ServiceFormRequirement } from '@/hooks/useServiceFormRequirements';
import { BookingPaymentForm } from './BookingPaymentForm';
import { AfterpayPromoBadge } from './AfterpayPromoBadge';
import { InlineFormSigningCard } from './InlineFormSigningCard';
import { PolicyDisclosure } from '@/components/policy/PolicyDisclosure';

interface BookingConfirmationProps {
  theme: BookingSurfaceTheme;
  serviceName: string;
  categoryName: string;
  stylistName: string | null;
  locationName: string | null;
  date: string;
  time: string;
  clientInfo: BookingClientInfo;
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
  isConfirmed?: boolean;
  depositAmount?: number | null;
  depositPolicyText?: string;
  cancellationPolicyText?: string;
  requiresCardOnFile?: boolean;
  /** Wave 28.11.2 — for surface-mapped policy disclosures. */
  organizationId?: string | null;
  // Payment integration props
  paymentClientSecret?: string | null;
  paymentIntentType?: 'payment' | 'setup' | null;
  stripePublishableKey?: string | null;
  stripeConnectedAccountId?: string | null;
  onPaymentComplete?: (intentId: string) => void;
  showPaymentForm?: boolean;
  afterpayEnabled?: boolean;
  afterpaySurchargeRate?: number | null;
  // Wave 9: Inline required-form gating (hybrid model — sign now or defer)
  requiredForms?: ServiceFormRequirement[];
  signedFormTemplateIds?: string[];
  onSignForms?: () => void;
  onDeferForms?: () => void;
}

export function BookingConfirmation({
  theme, serviceName, categoryName, stylistName, locationName,
  date, time, clientInfo, onConfirm, onBack, isSubmitting, isConfirmed,
  depositAmount, depositPolicyText, cancellationPolicyText, requiresCardOnFile,
  organizationId,
  paymentClientSecret, paymentIntentType, stripePublishableKey, stripeConnectedAccountId,
  onPaymentComplete, showPaymentForm, afterpayEnabled, afterpaySurchargeRate,
  requiredForms, signedFormTemplateIds, onSignForms, onDeferForms,
}: BookingConfirmationProps) {
  if (isConfirmed) {
    const calTitle = encodeURIComponent(`${serviceName} at ${locationName || 'Salon'}`);
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calTitle}&dates=${date.replace(/-/g, '')}/${date.replace(/-/g, '')}`;

    return (
      <motion.div
        className="text-center py-12"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <motion.div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ backgroundColor: `${theme.primaryColor}15` }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <CheckCircle2 className="w-10 h-10" style={{ color: theme.primaryColor }} />
        </motion.div>
        <h3 className="text-xl font-medium mb-2" style={{ color: theme.textColor }}>
          Booking Request Submitted
        </h3>
        <p className="text-sm max-w-sm mx-auto mb-6" style={{ color: theme.mutedTextColor }}>
          We've received your booking request. You'll receive a confirmation email at{' '}
          <strong>{clientInfo.email}</strong> once it's confirmed.
        </p>
        <a
          href={googleCalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors"
          style={{
            color: theme.primaryColor,
            border: `1.5px solid ${theme.borderColor}`,
          }}
        >
          <CalendarPlus className="w-4 h-4" />
          Add to Calendar
        </a>
      </motion.div>
    );
  }

  const details = [
    { icon: Scissors, label: 'Service', value: `${serviceName} (${categoryName})` },
    { icon: User, label: 'Stylist', value: stylistName || 'Any Available' },
    { icon: MapPin, label: 'Location', value: locationName || '—' },
    { icon: Calendar, label: 'Date', value: date },
    { icon: Clock, label: 'Time', value: time },
  ];

  return (
    <div className="max-w-md">
      <h3 className="text-lg font-medium mb-4" style={{ color: theme.textColor }}>
        Review Your Booking
      </h3>

      <div
        className="p-4 mb-4"
        style={{
          backgroundColor: theme.surfaceColor,
          borderRadius: 'var(--bk-card-radius, 8px)',
          border: `1px solid ${theme.borderColor}`,
        }}
      >
        {details.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 py-2.5 border-b last:border-b-0" style={{ borderColor: theme.borderColor }}>
            <Icon className="w-4 h-4" style={{ color: theme.mutedTextColor }} />
            <span className="text-sm" style={{ color: theme.mutedTextColor }}>{label}</span>
            <span className="text-sm font-medium ml-auto" style={{ color: theme.textColor }}>{value}</span>
          </div>
        ))}
      </div>

      <div
        className="p-4 mb-6"
        style={{
          backgroundColor: theme.surfaceColor,
          borderRadius: 'var(--bk-card-radius, 8px)',
          border: `1px solid ${theme.borderColor}`,
        }}
      >
        <p className="text-sm font-medium mb-1" style={{ color: theme.textColor }}>
          {clientInfo.firstName} {clientInfo.lastName}
        </p>
        <p className="text-sm" style={{ color: theme.mutedTextColor }}>{clientInfo.email}</p>
        {clientInfo.phone && <p className="text-sm" style={{ color: theme.mutedTextColor }}>{clientInfo.phone}</p>}
        {clientInfo.notes && (
          <p className="text-sm mt-2 italic" style={{ color: theme.mutedTextColor }}>"{clientInfo.notes}"</p>
        )}
      </div>

      {/* Deposit & Policy Info */}
      {(depositAmount != null && depositAmount > 0) && (
        <div
          className="p-4 mb-4"
          style={{
            backgroundColor: `${theme.primaryColor}08`,
            borderRadius: 'var(--bk-card-radius, 8px)',
            border: `1px solid ${theme.primaryColor}30`,
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium" style={{ color: theme.textColor }}>
              Deposit Required
            </span>
            <span className="text-sm font-medium" style={{ color: theme.primaryColor }}>
              ${depositAmount.toFixed(2)}
            </span>
          </div>
          {depositPolicyText && (
            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: theme.mutedTextColor }}>
              {depositPolicyText}
            </p>
          )}
        </div>
      )}

      {requiresCardOnFile && cancellationPolicyText && (
        <div
          className="p-4 mb-4"
          style={{
            backgroundColor: theme.surfaceColor,
            borderRadius: 'var(--bk-card-radius, 8px)',
            border: `1px solid ${theme.borderColor}`,
          }}
        >
          <span className="text-xs font-medium" style={{ color: theme.textColor }}>
            Cancellation & No-Show Policy
          </span>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: theme.mutedTextColor }}>
            {cancellationPolicyText}
          </p>
        </div>
      )}

      {/* Afterpay Promo Badge */}
      {afterpayEnabled && !(afterpaySurchargeRate != null && afterpaySurchargeRate > 0) && depositAmount != null && depositAmount > 0 && depositAmount <= 4000 && (
        <div className="mb-4">
          <AfterpayPromoBadge theme={theme} amount={depositAmount} />
        </div>
      )}
      {/* Afterpay note when surcharge hides the badge */}
      {afterpayEnabled && afterpaySurchargeRate != null && afterpaySurchargeRate > 0 && (
        <div className="mb-4">
          <p className="text-xs" style={{ color: theme.mutedTextColor }}>
            Afterpay is available at checkout via payment link after your appointment.
          </p>
        </div>
      )}

      {/* Wave 9: Inline form-gating card (hybrid: sign now or defer to check-in) */}
      {requiredForms && requiredForms.length > 0 && !showPaymentForm && (
        <InlineFormSigningCard
          theme={theme}
          forms={requiredForms}
          signedFormTemplateIds={signedFormTemplateIds ?? []}
          onSignForms={onSignForms}
          onDeferForms={onDeferForms}
        />
      )}

      {/* Payment Form (shown after appointment creation) */}
      {showPaymentForm && paymentClientSecret && paymentIntentType && stripePublishableKey && stripeConnectedAccountId && onPaymentComplete ? (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-3" style={{ color: theme.textColor }}>
            {paymentIntentType === 'payment' ? 'Pay Deposit' : 'Save Card on File'}
          </h4>
          <BookingPaymentForm
            publishableKey={stripePublishableKey}
            clientSecret={paymentClientSecret}
            connectedAccountId={stripeConnectedAccountId}
            intentType={paymentIntentType}
            theme={theme}
            depositAmount={depositAmount}
            onPaymentComplete={onPaymentComplete}
            onError={() => {}}
          />
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3 text-sm font-medium transition-colors active:scale-[0.98]"
            style={{
              color: theme.textColor,
              borderRadius: 'var(--bk-btn-radius, 8px)',
              border: `1px solid ${theme.borderColor}`,
            }}
          >
            Back
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 py-3 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 active:scale-[0.98]"
            style={{
              backgroundColor: theme.primaryColor,
              borderRadius: 'var(--bk-btn-radius, 8px)',
            }}
          >
            {isSubmitting
              ? 'Submitting...'
              : (depositAmount && depositAmount > 0)
                ? `Confirm & Pay $${depositAmount.toFixed(2)} Deposit`
                : requiresCardOnFile
                  ? 'Confirm & Save Card'
                  : 'Confirm Booking'
            }
          </button>
        </div>
      )}
    </div>
  );
}
