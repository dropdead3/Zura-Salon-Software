import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import '@/styles/silver-shine.css';

interface SilverShineWrapperProps {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  /** Use 'card' for rounded-xl containers, 'button' for rounded-md elements */
  variant?: 'card' | 'button';
}

/**
 * Generic wrapper that applies the silver shine stroke effect to any element.
 * The shine travels along the border only — the interior is masked by bg-background.
 *
 * @example
 * <SilverShineWrapper variant="card">
 *   <div className="p-6">Card content</div>
 * </SilverShineWrapper>
 */
export function SilverShineWrapper({
  children,
  className,
  innerClassName,
  variant = 'card',
}: SilverShineWrapperProps) {
  const borderToken = variant === 'button' ? tokens.shine.borderButton : tokens.shine.border;
  const innerToken = variant === 'button' ? tokens.shine.innerButton : tokens.shine.inner;

  return (
    <div className={cn(borderToken, className)}>
      <div className={cn(innerToken, innerClassName)}>
        {children}
      </div>
    </div>
  );
}
