import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface IdentityBlockProps {
  fullName: string;
  employeeId: string | null;
  hireDate?: string | null;
  /**
   * `sm` is for compact contexts (e.g. inside a wizard header where a title
   * already renders the name). `md` is the default standalone size used on
   * cards.
   */
  size?: 'sm' | 'md';
  /** When true, suppress the name line (caller renders it). */
  hideName?: boolean;
  className?: string;
}

/**
 * Shared identity row for HR/archive surfaces.
 *
 *   ARCHIVE CHELSEA RODRIGUEZ
 *   EMPLOYEE ID  EMP-00417  [copy]   ·   Hired Mar 2023
 *
 * Same component is used in the Archive Wizard header and the Delivery
 * Receipt card so both audit moments display identical identity strings.
 */
export function IdentityBlock({
  fullName,
  employeeId,
  hireDate,
  size = 'md',
  hideName = false,
  className,
}: IdentityBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!employeeId) return;
    try {
      await navigator.clipboard.writeText(employeeId);
      setCopied(true);
      toast.success('Employee ID copied');
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const labelSize = size === 'sm' ? 'text-[10px]' : 'text-[11px]';
  const valueSize = size === 'sm' ? 'text-[11px]' : 'text-xs';
  const nameSize = size === 'sm' ? 'text-base' : 'text-lg';

  return (
    <div className={cn('space-y-1', className)}>
      {!hideName && (
        <p className={cn('font-display tracking-wide uppercase truncate', nameSize)}>
          {fullName}
        </p>
      )}

      {(employeeId || hireDate) && (
        <div className="flex items-center gap-2 flex-wrap">
          {employeeId && (
            <div className="flex items-center gap-1.5">
              <span className={cn('font-display tracking-[0.12em] uppercase text-muted-foreground', labelSize)}>
                Employee ID
              </span>
              <span className={cn('font-mono text-foreground/85 tracking-wider', valueSize)}>
                {employeeId}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                    onClick={handleCopy}
                    aria-label="Copy employee ID"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy employee ID</TooltipContent>
              </Tooltip>
            </div>
          )}

          {employeeId && hireDate && (
            <span className="text-muted-foreground/50 text-xs">·</span>
          )}

          {hireDate && (
            <span className={cn('font-sans text-muted-foreground', valueSize)}>
              {hireDate}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
