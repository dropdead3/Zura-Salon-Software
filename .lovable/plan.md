## Goal

Close the loop between domain configuration and Preview behavior. When a domain is verified and SSL has provisioned, the Domains card should explicitly tell the operator: "Preview opens at this domain" — with a one-click way to confirm by opening it.

Right now the active-state block just says "DNS is pointing correctly." That's true but doesn't connect to the Website Hub Preview button operators just used. This makes the connection visible.

## Implementation

### Edit `src/components/dashboard/settings/DomainConfigCard.tsx`

Expand the existing "active" success block (lines 246–253) so it does three things instead of one:

1. **Confirms verification** — keep the existing "verified and active" message.
2. **Names the loop closure** — adds a second line: `Preview opens at this domain.` (Truthful only when `useOrgPublicUrl` confirms it; if the public-URL hook is still loading or the cache hasn't caught up, omit this line — silence is valid output rather than asserting something we can't yet confirm.)
3. **Provides a one-click verifier** — small `Open site →` button that opens `https://{domain}` in a new tab. This is the Preview button reduced to its most local form, right next to the domain it just verified.

### Why use `useOrgPublicUrl`

`DomainConfigCard` already knows `domain.domain` directly, so it could string-build `https://{domain}`. But routing through `useOrgPublicUrl()` means:
- The Domains card and the Website Hub Preview button resolve through the same code path.
- If a future doctrine change adds a path prefix (e.g., `/preview` mode), it lands once.
- Confirming the loop becomes structural, not coincidental: the card asserts what the hook would actually return.

If `useOrgPublicUrl()` returns a URL that doesn't match `https://{domain.domain}`, that's a real bug surface (cache stale, RLS misfire, status row drift) — the card silently degrades to "verified" only, no false claim about Preview.

### Code shape

Replace the active-state block with:

```tsx
{domain!.status === 'active' && (() => {
  const expected = `https://${domain!.domain}`;
  const loopClosed = !isPublicUrlLoading && publicUrl() === expected;

  return (
    <div className="rounded-lg bg-accent/50 border border-primary/20 p-3 space-y-2">
      <p className="text-sm text-primary flex items-center gap-2">
        <Check className="w-4 h-4" />
        Your domain is verified and active. DNS is pointing correctly.
      </p>
      {loopClosed && (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-primary/10">
          <p className="text-xs text-muted-foreground">
            Preview opens at this domain.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(expected, '_blank', 'noopener,noreferrer')}
            className="h-7 text-xs"
          >
            Open site
            <ArrowUpRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
})()}
```

Add `useOrgPublicUrl` import and `ArrowUpRight` to the lucide import.

## Files

- Edit: `src/components/dashboard/settings/DomainConfigCard.tsx`

## Out of scope

- New tests, schema changes, or domain CRUD changes.
- Changing the verification UX before active state — only the post-verification surface changes.
- Surfacing the same confirmation elsewhere (the Website Hub already shows `Live at customdomain.com` in the Preview tooltip; this card is the second anchor of the loop, not a third).
