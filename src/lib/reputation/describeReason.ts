/**
 * describeReason — shared translator for `review_platform_connections.last_error`
 * codes written by the verify-locations cron. Used by both the global
 * ReputationOAuthGraceBanner and the per-location PlatformConnectorTile so
 * the two surfaces never drift in copy.
 *
 * Unknown reasons fall back to the raw code (better than silent erasure) so
 * we get bug reports instead of mysteries.
 */
export function describeReason(reason: string | null | undefined): string | null {
  if (!reason) return null;
  switch (reason) {
    case 'token_revoked':
      return 'Google access was revoked from the Google account';
    case 'refresh_failed':
      return 'Google refused to refresh the access token';
    case 'gbp_suspended_or_merged':
      return 'The Business Profile was suspended or merged on Google';
    default:
      return `Last error: ${reason}`;
  }
}
