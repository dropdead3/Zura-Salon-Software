/**
 * Build provenance helper line for a Rules-step field (Wave 28.13.x)
 *
 * Composes the small "Prefilled · You can edit this. Surfaces in…" caption
 * that sits beneath the standard `helper` text on prefilled fields. Pure
 * function — no React, no copy lives in the consuming component.
 *
 * Doctrine:
 *  - Lever and confidence: every prefilled value names its downstream effect.
 *  - Operator edits are sacred: edit-contract sentence surfaces the rule.
 *  - Silence is meaningful: fields without `provenance` produce nothing.
 *  - Brand abstraction: copy uses neutral verbs only.
 */
import type { RuleField, FieldProvenance } from './configurator-schemas';

export type PolicyAudience = 'internal' | 'external' | 'both';

export interface ProvenanceSegment {
  kind: 'text' | 'token';
  value: string;
}

export interface ProvenanceLine {
  /** Whether to show the small "Prefilled" badge on the left. */
  showPrefilledBadge: boolean;
  /** Inline-rendered segments (text + monospace tokens like `{{authority_role}}`). */
  segments: ProvenanceSegment[];
}

/**
 * Split a sentence on `{{token}}` markers into renderable segments so the
 * consumer can style tokens as inline `<code>` while keeping the rest as prose.
 */
function tokenizeSentence(sentence: string): ProvenanceSegment[] {
  if (!sentence) return [];
  const out: ProvenanceSegment[] = [];
  const re = /(\{\{\s*[a-zA-Z0-9_]+\s*\}\})/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sentence)) !== null) {
    if (m.index > lastIndex) {
      out.push({ kind: 'text', value: sentence.slice(lastIndex, m.index) });
    }
    out.push({ kind: 'token', value: m[1].replace(/\s+/g, '') });
    lastIndex = m.index + m[1].length;
  }
  if (lastIndex < sentence.length) {
    out.push({ kind: 'text', value: sentence.slice(lastIndex) });
  }
  return out;
}

function joinSentences(parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean)
    .join(' ');
}

/**
 * Resolve the surface sentence based on audience scope and the field's
 * declared `surfaces` value. The audience parameter only matters when the
 * field surfaces client-facing — it lets us name the outcome accurately
 * (internal-only audience ⇒ "internal version" only).
 */
function surfaceSentence(
  provenance: FieldProvenance,
  audience: PolicyAudience,
): string | null {
  if (provenance.surfaceNote) return provenance.surfaceNote;
  switch (provenance.surfaces) {
    case 'client-facing':
      if (audience === 'internal') {
        return 'This text is what the AI uses to draft the internal version in the Approve wording step.';
      }
      return 'This text is what the AI uses to draft the client-facing and internal versions in the Approve wording step.';
    case 'internal-only':
      return 'Internal only — surfaces in the printable policy doc and the team handbook. Not shown to clients.';
    case 'configurator-only':
      return 'Used here only — does not surface anywhere else.';
    case 'drives-other-field':
      return null;
    default:
      return null;
  }
}

function editContractSentence(provenance: FieldProvenance): string | null {
  if (provenance.editContract === 'sacred') {
    return 'Edits here override the prefill for this version.';
  }
  if (provenance.editContract === 'live-derived') {
    return 'Updates automatically until you edit it by hand.';
  }
  return null;
}

function originPrefix(provenance: FieldProvenance): {
  showBadge: boolean;
  leadSentence: string | null;
} {
  switch (provenance.origin) {
    case 'prefilled':
      return { showBadge: true, leadSentence: 'You can edit this.' };
    case 'derived':
      return { showBadge: false, leadSentence: null };
    case 'authored':
      return { showBadge: false, leadSentence: null };
    default:
      return { showBadge: false, leadSentence: null };
  }
}

export function buildProvenanceLine(
  field: RuleField,
  audience: PolicyAudience,
): ProvenanceLine | null {
  const provenance = field.provenance;
  if (!provenance) return null;

  const { showBadge, leadSentence } = originPrefix(provenance);
  const surface = surfaceSentence(provenance, audience);
  const editContract = editContractSentence(provenance);

  // Drives-other-field is a special shape: the surfaceNote is the entire
  // sentence (e.g., "Drives the {{authority_role}} reference…") and the
  // edit contract describes liveness, not sacredness.
  if (provenance.surfaces === 'drives-other-field') {
    const sentence = joinSentences([provenance.surfaceNote, editContract]);
    return {
      showPrefilledBadge: showBadge,
      segments: tokenizeSentence(sentence),
    };
  }

  const sentence = joinSentences([leadSentence, surface, editContract]);
  if (!sentence && !showBadge) return null;

  return {
    showPrefilledBadge: showBadge,
    segments: tokenizeSentence(sentence),
  };
}
