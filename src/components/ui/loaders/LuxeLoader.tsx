import { cn } from '@/lib/utils';
import { ZuraZIcon } from '@/components/icons/ZuraZIcon';

const SIZES = {
  sm: { icon: 'h-4 w-4', bar: 'w-16', barHeight: 'h-px', gap: 'gap-2' },
  md: { icon: 'h-5 w-5', bar: 'w-24', barHeight: 'h-px', gap: 'gap-3' },
  lg: { icon: 'h-7 w-7', bar: 'w-32', barHeight: 'h-[1.5px]', gap: 'gap-3.5' },
  xl: { icon: 'h-10 w-10', bar: 'w-44', barHeight: 'h-0.5', gap: 'gap-4' },
} as const;

interface LuxeLoaderProps {
  size?: keyof typeof SIZES;
  className?: string;
  caption?: string;
}

/**
 * LuxeLoader — calm, executive default loader.
 * Static ZuraZIcon mark with a thin animated bar underneath.
 * Theme-aware via foreground tokens; renders identically in light and dark.
 */
export function LuxeLoader({ size = 'md', className, caption }: LuxeLoaderProps) {
  const { icon, bar, barHeight, gap } = SIZES[size];

  return (
    <div
      className={cn('flex flex-col items-center justify-center', gap, className)}
      role="status"
      aria-label={caption || 'Loading'}
    >
      <ZuraZIcon className={cn(icon, 'text-foreground/80')} />
      <div className={cn('relative overflow-hidden rounded-full bg-foreground/10', bar, barHeight)}>
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full bg-foreground/50', barHeight)}
          style={{
            width: '40%',
            animation: 'luxe-bar-slide 1.4s ease-in-out infinite',
          }}
        />
      </div>
      {caption && (
        <span className="font-sans text-xs text-muted-foreground">{caption}</span>
      )}
      <style>{`
        @keyframes luxe-bar-slide {
          0% { left: -40%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
