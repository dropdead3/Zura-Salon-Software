/**
 * Wave 28.11.2 — PolicyDisclosure primitive
 *
 * The single component that consumes wired surface mappings. Drop one of these
 * onto any operational surface (booking, checkout, intake) and policies that
 * the operator wired to that surface render automatically.
 *
 * Visibility contract: renders nothing when no policies are wired or while
 * the query resolves. Operators see exactly what clients see — silence
 * means "not configured."
 *
 * Variants:
 *   - 'compact' (default): collapsible cards, suitable for booking/checkout footers
 *   - 'inline': flat list, suitable for intake/consent forms
 *
 * Two render modes for body text:
 *   - 'markdown': full ReactMarkdown render (use on long-form surfaces)
 *   - 'plain': single-line preview (used inside compact disclosures so the
 *     footer doesn't grow unbounded; expand reveals the full body)
 */
import { useState } from 'react';
import { ChevronDown, ShieldCheck, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { usePolicyForSurface } from '@/hooks/policy/usePolicyForSurface';
import type { PolicySurface } from '@/hooks/policy/usePolicyData';

interface PolicyDisclosureProps {
  surface: PolicySurface;
  organizationId: string | null | undefined;
  /** Visual layout. Defaults to 'compact'. */
  variant?: 'compact' | 'inline';
  /** Soft cap; defaults to 4 for compact, unlimited for inline. */
  maxItems?: number;
  /** Override the default "Policies & disclosures" header. Pass null to hide. */
  header?: string | null;
  /** Tailwind class overrides for the outer container. */
  className?: string;
  /** Optional theme overrides for branded surfaces (public booking). */
  theme?: {
    textColor?: string;
    mutedTextColor?: string;
    borderColor?: string;
    surfaceColor?: string;
  };
}

export function PolicyDisclosure({
  surface,
  organizationId,
  variant = 'compact',
  maxItems,
  header = 'Policies & disclosures',
  className,
  theme,
}: PolicyDisclosureProps) {
  const cap = maxItems ?? (variant === 'compact' ? 4 : 0);
  const { data = [], isLoading } = usePolicyForSurface(organizationId, surface, {
    maxItems: cap,
  });

  // Visibility contract — silence is valid output.
  if (isLoading) return null;
  if (data.length === 0) return null;

  const isThemed = !!theme;

  return (
    <div
      className={cn(
        'rounded-xl',
        !isThemed && 'border border-border/60 bg-muted/20',
        variant === 'compact' ? 'p-4 space-y-3' : 'p-3 space-y-2',
        className,
      )}
      style={
        isThemed
          ? {
              backgroundColor: theme.surfaceColor,
              border: `1px solid ${theme.borderColor}`,
            }
          : undefined
      }
    >
      {header && (
        <div className="flex items-center gap-2">
          <ShieldCheck
            className="w-3.5 h-3.5"
            style={isThemed ? { color: theme.mutedTextColor } : undefined}
          />
          <span
            className={cn(
              !isThemed && tokens.label.tiny,
              isThemed && 'font-sans text-[10px] font-medium uppercase tracking-wider',
            )}
            style={isThemed ? { color: theme.mutedTextColor } : undefined}
          >
            {header}
          </span>
        </div>
      )}

      <ul className="space-y-2">
        {data.map((p) => (
          <DisclosureItem
            key={p.policyId}
            title={p.title}
            bodyMd={p.bodyMd}
            requiresAcknowledgment={p.requiresAcknowledgment}
            theme={theme}
          />
        ))}
      </ul>
    </div>
  );
}

interface DisclosureItemProps {
  title: string;
  bodyMd: string;
  requiresAcknowledgment: boolean;
  theme?: PolicyDisclosureProps['theme'];
}

function DisclosureItem({ title, bodyMd, requiresAcknowledgment, theme }: DisclosureItemProps) {
  const [open, setOpen] = useState(false);
  const isThemed = !!theme;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-start gap-2 text-left rounded-md px-2 py-1.5 transition-colors',
          !isThemed && 'hover:bg-muted/40',
        )}
      >
        <FileText
          className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
          style={isThemed ? { color: theme.mutedTextColor } : undefined}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn('font-sans text-xs font-medium')}
              style={isThemed ? { color: theme.textColor } : undefined}
            >
              {title}
            </span>
            {requiresAcknowledgment && (
              <Badge
                variant="outline"
                className="font-sans text-[10px] border-border/70 px-1.5 py-0 h-4"
              >
                Acknowledgment required
              </Badge>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 mt-0.5 flex-shrink-0 transition-transform',
            open && 'rotate-180',
          )}
          style={isThemed ? { color: theme.mutedTextColor } : undefined}
        />
      </button>

      {open && (
        <div
          className={cn(
            'mt-1 ml-5 pl-2 pr-2 pb-2 text-xs leading-relaxed font-sans',
            !isThemed && 'text-muted-foreground border-l border-border/40',
          )}
          style={
            isThemed
              ? {
                  color: theme.mutedTextColor,
                  borderLeft: `1px solid ${theme.borderColor}`,
                }
              : undefined
          }
        >
          <div className="prose prose-xs max-w-none [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h1]:font-medium [&_h2]:font-medium [&_h3]:font-medium">
            <ReactMarkdown>{bodyMd}</ReactMarkdown>
          </div>
        </div>
      )}
    </li>
  );
}
