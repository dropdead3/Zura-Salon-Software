interface AfterpayLogoProps {
  className?: string;
  color?: string;
}

/**
 * Official Afterpay triangular "A" brand mark.
 * Default color is Afterpay's brand mint (#B2FCE4).
 */
export function AfterpayLogo({ className = 'w-5 h-5', color = '#B2FCE4' }: AfterpayLogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Afterpay"
    >
      {/* Afterpay triangular "A" mark */}
      <path
        d="M12 2L2 20h7.2l2.8-5.2L14.8 20H22L12 2Z"
        fill={color}
      />
    </svg>
  );
}
