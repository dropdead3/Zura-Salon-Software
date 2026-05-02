import { ShieldCheck } from 'lucide-react';

/**
 * Permanent, non-dismissible compliance banner for the Reputation Engine.
 * Required by spec — clarifies that the system never gates reviews by rating.
 */
export function ComplianceBanner() {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-4">
      <div className="flex gap-3">
        <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Reputation compliance</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Zura helps you request legitimate client feedback. Do not use this system to selectively
            request only positive reviews, suppress negative feedback, offer incentives for positive
            reviews, or create staff review quotas. All clients see public review options regardless
            of their rating.
          </p>
        </div>
      </div>
    </div>
  );
}
