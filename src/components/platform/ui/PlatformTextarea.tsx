import * as React from 'react';
import { cn } from '@/lib/utils';
import { Textarea, type TextareaProps } from '@/components/ui/textarea';

const PlatformTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <Textarea
      ref={ref}
      className={cn(
        'bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus-visible:border-violet-500/50',
        className,
      )}
      {...props}
    />
  ),
);
PlatformTextarea.displayName = 'PlatformTextarea';

export { PlatformTextarea };
