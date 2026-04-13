import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { BookingSurfaceTheme } from '@/hooks/useBookingSurfaceConfig';
import { Loader2 } from 'lucide-react';

interface BookingPaymentFormProps {
  publishableKey: string;
  clientSecret: string;
  connectedAccountId: string;
  intentType: 'payment' | 'setup';
  theme: BookingSurfaceTheme;
  depositAmount?: number | null;
  onPaymentComplete: (intentId: string) => void;
  onError: (message: string) => void;
}

function CheckoutForm({
  intentType,
  theme,
  depositAmount,
  onPaymentComplete,
  onError,
}: Omit<BookingPaymentFormProps, 'publishableKey' | 'clientSecret' | 'connectedAccountId'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      if (intentType === 'payment') {
        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams: { return_url: window.location.href },
          redirect: 'if_required',
        });

        if (error) {
          setErrorMessage(error.message || 'Payment failed. Please try again.');
          onError(error.message || 'Payment failed');
        } else if (paymentIntent?.status === 'succeeded') {
          onPaymentComplete(paymentIntent.id);
        } else {
          setErrorMessage('Payment was not completed. Please try again.');
        }
      } else {
        const { error, setupIntent } = await stripe.confirmSetup({
          elements,
          confirmParams: { return_url: window.location.href },
          redirect: 'if_required',
        });

        if (error) {
          setErrorMessage(error.message || 'Card setup failed. Please try again.');
          onError(error.message || 'Card setup failed');
        } else if (setupIntent?.status === 'succeeded') {
          onPaymentComplete(setupIntent.id);
        } else {
          setErrorMessage('Card setup was not completed. Please try again.');
        }
      }
    } catch (err: any) {
      const msg = err?.message || 'An unexpected error occurred';
      setErrorMessage(msg);
      onError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const buttonText = isProcessing
    ? 'Processing...'
    : intentType === 'payment'
      ? `Pay Deposit${depositAmount ? ` — $${depositAmount.toFixed(2)}` : ''}`
      : 'Save Card & Confirm';

  return (
    <form onSubmit={handleSubmit}>
      <div
        className="p-4 mb-4"
        style={{
          backgroundColor: theme.surfaceColor,
          borderRadius: 'var(--bk-card-radius, 8px)',
          border: `1px solid ${theme.borderColor}`,
        }}
      >
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {errorMessage && (
        <div
          className="p-3 mb-4 text-sm"
          style={{
            color: '#dc2626',
            backgroundColor: '#fef2f2',
            borderRadius: 'var(--bk-card-radius, 8px)',
            border: '1px solid #fecaca',
          }}
        >
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full py-3 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 active:scale-[0.98]"
        style={{
          backgroundColor: theme.primaryColor,
          borderRadius: 'var(--bk-btn-radius, 8px)',
        }}
      >
        {isProcessing && <Loader2 className="w-4 h-4 animate-spin inline mr-2" />}
        {buttonText}
      </button>
    </form>
  );
}

// Cache stripe instances per publishable key + connected account
const stripePromiseCache = new Map<string, ReturnType<typeof loadStripe>>();

function getStripePromise(publishableKey: string, connectedAccountId: string) {
  const cacheKey = `${publishableKey}:${connectedAccountId}`;
  if (!stripePromiseCache.has(cacheKey)) {
    stripePromiseCache.set(
      cacheKey,
      loadStripe(publishableKey, { stripeAccount: connectedAccountId })
    );
  }
  return stripePromiseCache.get(cacheKey)!;
}

export function BookingPaymentForm({
  publishableKey,
  clientSecret,
  connectedAccountId,
  intentType,
  theme,
  depositAmount,
  onPaymentComplete,
  onError,
}: BookingPaymentFormProps) {
  const stripePromise = getStripePromise(publishableKey, connectedAccountId);

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: theme.mode === 'dark' ? 'night' : 'stripe',
          variables: {
            colorPrimary: theme.primaryColor,
            fontFamily: 'var(--bk-font)',
            borderRadius: 'var(--bk-card-radius, 8px)',
          },
        },
      }}
    >
      <CheckoutForm
        intentType={intentType}
        theme={theme}
        depositAmount={depositAmount}
        onPaymentComplete={onPaymentComplete}
        onError={onError}
      />
    </Elements>
  );
}
