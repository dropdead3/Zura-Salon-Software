/**
 * extract-receipt-sentence (Wave 28.17.1)
 *
 * Pure helper that pulls the most relevant sentence from a rendered policy
 * variant `body_md` so the POS Cancellations & Fees tab can show operators
 * exactly what their client will see on the receipt.
 *
 * Doctrine: read-only. Never mutates body_md. Never returns text containing
 * unresolved Liquid/Mustache placeholders (`{{ ... }}`) — those signal an
 * unrendered draft and should fall back to null.
 */

const MAX_LEN = 140;

/** Per-policy keywords; we pick the first sentence containing any of these. */
const POLICY_KEYWORDS: Record<string, string[]> = {
  payment_policy: ['deposit', 'card on file', 'hold', 'reserve', 'payment'],
  cancellation_policy: ['cancel', 'cancellation', 'reschedul', 'cut-off', 'cutoff', 'notice'],
  no_show_policy: ['no-show', 'no show', 'miss', 'fail to arrive', 'absent'],
  booking_policy: ['book', 'consultation', 'card on file', 'new client'],
};

function stripMarkdown(input: string): string {
  return input
    // headings
    .replace(/^#{1,6}\s+/gm, '')
    // bold/italic
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // inline code
    .replace(/`([^`]+)`/g, '$1')
    // links → keep label
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // list bullets
    .replace(/^[\s]*[-*+]\s+/gm, '')
    // collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(s: string, max = MAX_LEN): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}

/**
 * Extract the most relevant sentence from rendered policy prose for a given
 * policy library_key. Returns null when:
 *   - body is empty/whitespace
 *   - body contains unresolved `{{ token }}` placeholders
 *   - no sentence can be found
 */
export function extractReceiptSentence(
  bodyMd: string | null | undefined,
  policyKey: string,
): string | null {
  if (!bodyMd || !bodyMd.trim()) return null;
  // Bail on any unrendered placeholder — never show clients template syntax.
  if (/\{\{[^}]+\}\}/.test(bodyMd)) return null;

  const flat = stripMarkdown(bodyMd);
  if (!flat) return null;

  // Split on sentence terminators, keep non-empty.
  const sentences = flat
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length === 0) return null;

  const keywords = POLICY_KEYWORDS[policyKey] ?? [];
  const lowered = sentences.map((s) => s.toLowerCase());

  for (const kw of keywords) {
    const idx = lowered.findIndex((s) => s.includes(kw.toLowerCase()));
    if (idx >= 0) return truncate(sentences[idx]);
  }

  // Fall back to the first sentence.
  return truncate(sentences[0]);
}
