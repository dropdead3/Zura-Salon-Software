import { cn } from '@/lib/utils';
import { ZuraZIcon } from '@/components/icons/ZuraZIcon';

const sizeStyles = {
  sm: 'h-6 w-6',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const iconSizeStyles = {
  sm: 'w-3 h-3',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

interface ZuraAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ZuraAvatar({ size = 'md', className }: ZuraAvatarProps) {
  return (
    <div
      className={cn(
        'rounded-full bg-primary/10 flex items-center justify-center',
        sizeStyles[size],
        className
      )}
    >
      <ZuraZIcon className={cn('text-primary', iconSizeStyles[size])} />
    </div>
  );
}
