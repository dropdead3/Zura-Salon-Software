

## Light Mode: Lighter Nested Cards (Cream Direction)

The screenshot shows the current light mode where nested cards at 93% and 90% lightness look too dark/grey against the cream parent card (98%). The fix is to flip the light-mode direction so nested cards get *lighter* (closer to white), while keeping dark mode as-is (darker/recessed).

### Depth Architecture (Light Mode)

```text
Light mode lightness (Cream theme):
┌─────────────────────────────────────────┐  bg-card         (98%)
│  ┌───────────────────────────────────┐  │  bg-card-inner   (99%)  ← lighter
│  │  ┌─────────┐  ┌─────────┐        │  │  bg-card-inner-deep (100%)  ← lightest
│  │  │Services │  │ Retail  │        │  │
│  │  └─────────┘  └─────────┘        │  │
│  └───────────────────────────────────┘  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │  bg-card-inner   (99%)
│  │ Trans.  │ │AvgTicket│ │Rev/Hour │   │
│  └─────────┘ └─────────┘ └─────────┘   │
└─────────────────────────────────────────┘
```

Dark mode stays the same (darker = recessed). Light mode goes lighter = elevated/airy.

### Changes

**File: `src/index.css`** -- Update only the **light mode** `--card-inner` and `--card-inner-deep` values across all 4 themes:

| Theme | Variable | Current (darker) | New (lighter) |
|-------|----------|-------------------|---------------|
| Cream | `--card-inner` | `40 20% 93%` | `40 20% 99%` |
| Cream | `--card-inner-deep` | `40 15% 90%` | `40 15% 100%` |
| Rose | `--card-inner` | `350 15% 93%` | `350 15% 99%` |
| Rose | `--card-inner-deep` | `350 10% 90%` | `350 10% 100%` |
| Sage | `--card-inner` | `145 12% 93%` | `145 12% 99%` |
| Sage | `--card-inner-deep` | `145 8% 90%` | `145 8% 100%` |
| Ocean | `--card-inner` | `210 15% 93%` | `210 15% 99%` |
| Ocean | `--card-inner-deep` | `210 10% 90%` | `210 10% 100%` |

Dark mode values remain untouched (8%/5% recessed pattern stays).

### Scope

8 single-line value changes in `src/index.css`, light-mode blocks only. No other files change.

