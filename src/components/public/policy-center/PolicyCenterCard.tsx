/**
 * Wave 28.8 — Single policy card on the public Client Policy Center.
 *
 * Renders the approved `client` variant body as markdown inside a collapsible.
 * Read-only — operators edit upstream via Policy OS.
 */
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { PublicPolicyEntry } from '@/hooks/policy/usePublicOrgPolicies';

interface PolicyCenterCardProps {
  policy: PublicPolicyEntry;
  defaultOpen?: boolean;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return null;
  }
}

export function PolicyCenterCard({ policy, defaultOpen = false }: PolicyCenterCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const lastUpdated = formatDate(policy.approvedAt);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden transition-colors hover:border-border/80"
    >
      <CollapsibleTrigger
        className={cn(
          'flex w-full items-center justify-between gap-4 px-5 py-4 text-left',
          'transition-colors hover:bg-muted/40 focus:outline-none focus-visible:bg-muted/40'
        )}
      >
        <div className="min-w-0 flex-1">
          <h3 className="font-sans text-base text-foreground">{policy.title}</h3>
          {lastUpdated && (
            <p className="mt-1 font-sans text-xs text-muted-foreground">
              Updated {lastUpdated}
            </p>
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="border-t border-border/60 px-5 py-5">
          <article className="prose prose-sm dark:prose-invert max-w-none font-sans text-sm leading-relaxed text-foreground/90 prose-headings:font-sans prose-headings:text-foreground prose-headings:font-medium prose-p:text-foreground/80 prose-li:text-foreground/80 prose-strong:font-medium prose-strong:text-foreground">
            <ReactMarkdown>{policy.bodyMd}</ReactMarkdown>
          </article>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
