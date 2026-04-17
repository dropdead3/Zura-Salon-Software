/**
 * Tier 1 contact validation — format-only.
 * Tier 2 (deliverability via Twilio Lookup / SendGrid) deferred to Wave 22.34b.
 *
 * Returns:
 *   - valid:   true only when format is well-formed AND not an obvious test pattern
 *   - warning: human-readable hint for soft-warn UI (operator-facing surfaces).
 *              Hard-blockers (e.g., empty when required) live in the caller.
 */

import { z } from 'zod';

export type ContactValidationResult = {
  valid: boolean;
  warning?: string;
};

const emailSchema = z.string().trim().email().max(254);

// Obvious junk / placeholder patterns we've seen in the wild
const EMAIL_TEST_PATTERNS = [
  /^(na|none|noemail|n\/a|test|fake|asdf|none@none|no@email)/i,
  /@(test|example|fake|none)\./i,
  /@gmial\.|@gnail\.|@gmali\./i, // common typos worth flagging
];

// Repeated-digit / sequential patterns that indicate a fake number
const PHONE_FAKE_PATTERNS = [
  /^(\d)\1{9,}$/, // 1111111111
  /^1?(555)555\d{4}$/, // 555-555-XXXX (Hollywood placeholder)
  /^1?(123|000|999)\d{7}$/,
];

export function validateEmail(raw: string | null | undefined): ContactValidationResult {
  const value = (raw ?? '').trim();
  if (!value) return { valid: false, warning: 'Email is required' };

  const parsed = emailSchema.safeParse(value);
  if (!parsed.success) {
    return { valid: false, warning: 'Enter a valid email (name@domain.com)' };
  }

  if (EMAIL_TEST_PATTERNS.some((re) => re.test(value))) {
    return { valid: false, warning: 'Looks like a placeholder — confirm with the client' };
  }

  return { valid: true };
}

export function validatePhone(raw: string | null | undefined): ContactValidationResult {
  const value = (raw ?? '').trim();
  if (!value) return { valid: false, warning: 'Phone is required' };

  // Strip everything except digits and a leading +
  const digits = value.replace(/[^\d]/g, '');

  if (digits.length < 10 || digits.length > 15) {
    return { valid: false, warning: 'Phone must be 10–15 digits' };
  }

  if (PHONE_FAKE_PATTERNS.some((re) => re.test(digits))) {
    return { valid: false, warning: 'Looks like a placeholder number — confirm with the client' };
  }

  return { valid: true };
}
