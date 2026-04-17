import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Link2, AlertCircle, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MatchConfidenceBadgeProps {
  matchMethod: string | null | undefined;
  matchConfidence: string | null | undefined;
  hasContactInfo: boolean;
  className?: string;
}

/**
 * Surfaces the auto-match identity bridge result for an inquiry.
 * Calm, advisory tone — never claims certainty beyond the actual confidence level.
 */
export function MatchConfidenceBadge({
  matchMethod,
  matchConfidence,
  hasContactInfo,
  className,
}: MatchConfidenceBadgeProps) {
  // Inquiry submitted without email/phone — nothing to match
  if (!hasContactInfo) return null;

  if (matchConfidence === 'ambiguous') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                'gap-1 text-[10px] py-0 h-5 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
                className,
              )}
            >
              <AlertCircle className="w-2.5 h-2.5" />
              Ambiguous
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            Email and phone match different existing clients. Review and link manually.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (matchMethod === 'auto_both' || matchMethod === 'auto_email' || matchMethod === 'auto_phone') {
    const label =
      matchMethod === 'auto_both'
        ? 'Matched (email + phone)'
        : matchMethod === 'auto_email'
        ? 'Matched (email)'
        : 'Matched (phone)';

    const isHigh = matchConfidence === 'high';
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                'gap-1 text-[10px] py-0 h-5',
                isHigh
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400',
                className,
              )}
            >
              <Link2 className="w-2.5 h-2.5" />
              {label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            Auto-linked to an existing client based on contact information they provided.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (matchMethod === 'manual') return null; // already-converted inquiries don't need a re-statement

  // Unmatched — no existing client found
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'gap-1 text-[10px] py-0 h-5 border-muted-foreground/30 text-muted-foreground',
              className,
            )}
          >
            <UserX className="w-2.5 h-2.5" />
            New lead
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          No existing client found for this email or phone — appears to be a new lead.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
