import { cn } from '@/lib/utils';

const SIZES = {
  sm: { width: 'w-24', height: 'h-0.5' },
  md: { width: 'w-32', height: 'h-1' },
  lg: { width: 'w-44', height: 'h-1' },
  xl: { width: 'w-56', height: 'h-1.5' },
} as const;

interface BarLoaderProps {
  size?: keyof typeof SIZES;
  className?: string;
}

export function BarLoader({ size = 'md', className }: BarLoaderProps) {
  const { width, height } = SIZES[size];

  return (
    <div className={cn('flex items-center justify-center', className)} role="status" aria-label="Loading">
      <div className={cn('relative overflow-hidden rounded-full bg-foreground/10', width, height)}>
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full bg-foreground/50', height)}
          style={{
            width: '40%',
            animation: 'bar-slide 1.2s ease-in-out infinite',
          }}
        />
      </div>
      <style>{`
        @keyframes bar-slide {
          0% { left: -40%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
