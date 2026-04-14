import type { BookingSurfaceTheme } from '@/hooks/useBookingSurfaceConfig';
import { AfterpayLogo } from '@/components/icons/AfterpayLogo';

interface AfterpayPromoBadgeProps {
  theme: BookingSurfaceTheme;
  amount?: number | null;
}

const AFTERPAY_MIN = 1;
const AFTERPAY_MAX = 4000;

export function AfterpayPromoBadge({ theme, amount }: AfterpayPromoBadgeProps) {
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
      <AfterpayLogo className="w-5 h-5 shrink-0" color={theme.primaryColor} />
      <span style={{ color: theme.textColor }}>
        Pay in 4 interest-free installments with Afterpay
        {installment && <span style={{ color: theme.mutedTextColor }}> — {installment}/ea</span>}
      </span>
    </div>
  );
}
