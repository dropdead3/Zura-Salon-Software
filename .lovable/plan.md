

# Fix Pricing Acronyms in Competitor Comparison

The screenshot shows the pricing row using `$20/loc + $0.50/svc` — acronyms that aren't intuitive. The user also wants to clarify the $0.50 charge is per appointment that has a color service attached.

## Change

**File:** `src/components/dashboard/backroom-settings/CompetitorComparison.tsx` (line 72)

Update the Zura pricing text:

```typescript
// From:
zura: { pricing: '$20/loc + $0.50/svc', note: 'Usage-based' },

// To:
zura: { pricing: '$20/location + $0.50/appt', note: 'Per appointment with color service' },
```

This removes the `/loc` and `/svc` acronyms and makes the note explicitly clarify that the $0.50 charge applies per appointment with a color service attached.

