/**
 * PolicyLivePreview (Wave 28.14)
 *
 * Right-pane composer that renders the in-flight policy prose as the operator
 * answers questions. Reuses the same brand-token + rule-token interpolation
 * that the configurator already uses for the `policy_summary` longtext field —
 * no new edge-function calls, no new prose generation. The most-recently-
 * changed token is briefly highlighted so the operator sees which words their
 * answer just rewrote.
 *
 * Doctrine alignment:
 *  - Live preview *is* the simulation (Recommend → Simulate → Approval → Execute).
 *  - Brand tokens resolve through `interpolateBrandTokens` (single source of truth).
 *  - Unresolved tokens render as `{{token}}` so wiring gaps stay visible.
 */
import { useEffect, useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { humanize, interpolateBrandTokens } from '@/lib/policy/render-starter-draft';
import { getPolicySummaryDefaults } from '@/lib/policy/starter-drafts';
import { PLATFORM_NAME } from '@/lib/brand';
import type { ConfiguratorSchema } from '@/lib/policy/configurator-schemas';

interface PolicyLivePreviewProps {
  schema: ConfiguratorSchema;
  values: Record<string, unknown>;
  /** The block_key of the field whose value most recently changed. Used to
   *  highlight the corresponding token span. */
  recentlyChangedKey: string | null;
  libraryKey: string;
  category: string;
  audience: 'internal' | 'external' | 'both';
  orgName?: string;
  schemaHasAuthorityRole: boolean;
  locationCount: number;
}

/**
 * Substitute `{{rule_field_key}}` tokens with the humanized value, wrapping
 * the substitution for the recently-changed key in a `<mark>` so the UI can
 * draw attention to it. Brand tokens ({{ORG_NAME}}, {{PLATFORM_NAME}}) are
 * left untouched — handled by `interpolateBrandTokens` upstream.
 */
function substituteWithHighlight(
  text: string,
  ruleValues: Record<string, unknown>,
  highlightKey: string | null,
): Array<{ kind: 'text' | 'mark'; value: string; key?: string }> {
  if (!text) return [];
  const segments: Array<{ kind: 'text' | 'mark'; value: string; key?: string }> = [];
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', value: text.slice(lastIndex, match.index) });
    }
    const key = match[1];
    if (key === 'ORG_NAME' || key === 'PLATFORM_NAME') {
      segments.push({ kind: 'text', value: match[0] });
    } else if (key in ruleValues) {
      const v = ruleValues[key];
      const resolved = v === null || v === undefined || v === '' ? match[0] : humanize(v);
      segments.push({
        kind: key === highlightKey ? 'mark' : 'text',
        value: resolved,
        key,
      });
    } else {
      segments.push({ kind: 'text', value: match[0] });
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ kind: 'text', value: text.slice(lastIndex) });
  }
  return segments;
}

export function PolicyLivePreview({
  schema,
  values,
  recentlyChangedKey,
  libraryKey,
  category,
  audience,
  orgName,
  schemaHasAuthorityRole,
  locationCount,
}: PolicyLivePreviewProps) {
  // Highlight only briefly. After 1.5s, fade back to plain text.
  const [showHighlight, setShowHighlight] = useState<string | null>(null);
  useEffect(() => {
    if (!recentlyChangedKey) return;
    setShowHighlight(recentlyChangedKey);
    const t = setTimeout(() => setShowHighlight(null), 1500);
    return () => clearTimeout(t);
  }, [recentlyChangedKey]);

  // The starter draft summary is the operator-facing prose. Schemas that
  // declare a `policy_summary` field already wire to this; for schemas that
  // don't, we synthesize a section-by-section outline so the preview is never
  // empty (silence is meaningful only when intentional).
  const composed = useMemo(() => {
    const policySpecific = getPolicySummaryDefaults(libraryKey, {
      category,
      audience,
      locationCount,
      schemaHasAuthorityRole,
    });
    const summaryTemplate =
      (typeof values.policy_summary === 'string' && values.policy_summary) ||
      (typeof policySpecific.policy_summary === 'string' && policySpecific.policy_summary) ||
      '';
    if (summaryTemplate) {
      return interpolateBrandTokens(summaryTemplate, {
        orgName,
        platformName: PLATFORM_NAME,
      });
    }
    // Fallback: outline the schema sections + their current values so the
    // preview pane always shows *something* while the operator answers.
    const lines: string[] = [];
    schema.sections.forEach((section) => {
      lines.push(`${section.title}`);
      section.fields.forEach((f) => {
        const v = values[f.key];
        const display =
          v === null || v === undefined || v === '' ? `{{${f.key}}}` : humanize(v);
        lines.push(`  • ${f.label}: ${display}`);
      });
      lines.push('');
    });
    return interpolateBrandTokens(lines.join('\n'), {
      orgName,
      platformName: PLATFORM_NAME,
    });
  }, [
    schema,
    values,
    libraryKey,
    category,
    audience,
    orgName,
    schemaHasAuthorityRole,
    locationCount,
  ]);

  const segments = substituteWithHighlight(composed, values, showHighlight);

  const previewBody = (
    <div className="font-sans text-sm leading-7 text-foreground whitespace-pre-wrap">
      {segments.map((seg, i) =>
        seg.kind === 'mark' ? (
          <mark
            key={i}
            className="bg-primary/20 text-foreground rounded px-0.5 transition-colors duration-700"
          >
            {seg.value}
          </mark>
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
    </div>
  );

  return (
    <>
      {/* Inline preview pane — visible only on lg+ to avoid stacking on tablets */}
      <aside
        className={cn(
          'hidden lg:block rounded-xl border border-border bg-card p-6 sticky top-4 self-start',
          'min-h-[260px] max-h-[calc(100vh-8rem)] overflow-y-auto',
        )}
        aria-label="Live policy preview"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h4 className={cn(tokens.card.title, 'text-xs')}>Live preview</h4>
          <span className="font-sans text-[10px] uppercase tracking-wider text-muted-foreground">
            Updates as you answer
          </span>
        </div>
        {previewBody}
      </aside>

      {/* Below lg: collapsed bottom-sheet trigger so the questionnaire owns
          the full viewport width without inline stacking pushing the form
          off-screen. */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full font-sans"
              type="button"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview policy
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className={cn(tokens.card.title, 'text-xs text-left')}>
                Live preview
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4">{previewBody}</div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
