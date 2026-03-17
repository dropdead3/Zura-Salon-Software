import { cn } from '@/lib/utils';

const SIZES = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-3 w-3',
  xl: 'h-3.5 w-3.5',
} as const;

const GAPS = {
  sm: 'gap-1',
  md: 'gap-1.5',
  lg: 'gap-2',
  xl: 'gap-2.5',
} as const;

interface DotsLoaderProps {
  size?: keyof typeof SIZES;
  className?: string;
}

export function DotsLoader({ size = 'md', className }: DotsLoaderProps) {
  return (
    <div
      className={cn('flex items-center justify-center', GAPS[size], className)}
      role="status"
      aria-label="Loading"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn('rounded-full bg-foreground/60 animate-bounce', SIZES[size])}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '0.6s',
          }}
        />
      ))}
    </div>
  );
}
