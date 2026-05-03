/**
 * Non-Gating Doctrine (Reputation Engine, §3 + §10).
 *
 * Public review platform links MUST be offered to every client who completes
 * the feedback form, regardless of the rating they submitted. The only valid
 * gate is "do we have any link configured?" — never "is this client happy?".
 *
 * Violating this is a compliance risk (review gating) AND a doctrine violation
 * documented in the Reputation Engine memory. Locked by `shareScreenGate.test.ts`.
 *
 * Pure function — no hooks, no DB, safe for both submission flows and tests.
 */

export interface PublicReviewLinkBag {
  googleReviewUrl?: string | null;
  appleReviewUrl?: string | null;
  yelpReviewUrl?: string | null;
  facebookReviewUrl?: string | null;
}

/**
 * Returns true iff any public review link is configured. Rating is intentionally
 * NOT a parameter — adding it here would re-introduce the gating bug.
 */
export function shouldShowPublicShareScreen(links: PublicReviewLinkBag | null | undefined): boolean {
  if (!links) return false;
  return !!(
    links.googleReviewUrl ||
    links.appleReviewUrl ||
    links.yelpReviewUrl ||
    links.facebookReviewUrl
  );
}
