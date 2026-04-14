import type { BookingSurfaceTheme } from '@/hooks/useBookingSurfaceConfig';

interface AfterpayPromoBadgeProps {
  theme: BookingSurfaceTheme;
  amount?: number | null;
}

const AFTERPAY_MIN = 1;
const AFTERPAY_MAX = 4000;

export function AfterpayPromoBadge({ theme, amount }: AfterpayPromoBadgeProps) {
  // Only show if amount is within Afterpay's range
  if (amount != null && (amount < AFTERPAY_MIN || amount > AFTERPAY_MAX)) return null;

  const installment = amount ? `$${(amount / 4).toFixed(2)}` : null;

  return (
    <div
      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm"
      style={{
        backgroundColor: `${theme.primaryColor}08`,
        border: `1px solid ${theme.borderColor}`,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="11" stroke={theme.primaryColor} strokeWidth="1.5" />
        <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="500" fill={theme.primaryColor}>4</text>
      </svg>
      <span style={{ color: theme.textColor }}>
        Pay in 4 interest-free installments with Afterpay
        {installment && <span style={{ color: theme.mutedTextColor }}> — {installment}/ea</span>}
      </span>
    </div>
  );
}
