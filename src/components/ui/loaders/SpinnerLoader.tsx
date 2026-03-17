import { cn } from '@/lib/utils';

const SIZES = {
  sm: 'h-5 w-5',
  md: 'h-7 w-7',
  lg: 'h-10 w-10',
  xl: 'h-12 w-12',
} as const;

interface SpinnerLoaderProps {
  size?: keyof typeof SIZES;
  className?: string;
}

export function SpinnerLoader({ size = 'md', className }: SpinnerLoaderProps) {
  return (
    <div className={cn('flex items-center justify-center', className)} role="status" aria-label="Loading">
      <svg
        className={cn('animate-spin text-foreground/70', SIZES[size])}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path
          className="opacity-80"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}
