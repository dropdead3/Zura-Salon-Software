

## Make Product Budget Ceiling a Clear Sentence — Not Just a Pill

### What's happening now

The budget ceiling exists as a small colored pill (e.g., "Upgrade budget: $12.00") next to the health percentage badge. The user is seeing it but wants a **full contextual sentence** that explicitly connects service price → 8% target → dollar ceiling. The current pill format doesn't communicate the "why" at a glance.

### Change

Replace the small budget pills with a clear, full-sentence indicator below the health badge row. One line, always visible when health data exists.

**File:** `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`

**Replace** the three separate budget pill blocks (lines 1626-1711) with a single unified sentence that renders for all statuses:

```
Based on your $150 service price and an 8% target, your product budget ceiling is $12.00.
```

Status-specific framing:
- **High**: "Based on your $X service price and an 8% target, your product budget ceiling is $Y. You are currently $Z over budget."
- **Healthy**: "Based on your $X service price and an 8% target, your product budget ceiling is $Y."
- **Low**: "Based on your $X service price and an 8% target, you could spend up to $Y on product to go more luxury."

Styling: `text-[11px] font-sans text-muted-foreground mt-1.5` — subtle but readable, using the status color only for the dollar amounts. This replaces the pills, not the health percentage badge above it (that stays).

### Scope
- Single file, ~30 lines replaced
- No logic changes — same `suggestedAllowance` value, just different presentation

