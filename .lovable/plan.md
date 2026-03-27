

# Zura Insights: Intent-First Wizard Flow

## Concept
Add a wizard entry screen to the insights panel. When opened, instead of dumping all data, the panel asks "What do you need right now?" with 5-6 tappable intent cards. Selection filters the feed to exactly what the user needs. A "Show everything" option bypasses the wizard for power users.

## Layout

```text
┌─────────────────────────────────────────────────────┐
│  ZURA BUSINESS INSIGHTS          [Refresh] [Close]  │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 🔮 Summary strip (always visible)    · 2m ago  │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  What would you like to focus on?                    │
│                                                      │
│  ┌──────────────────┐  ┌──────────────────┐         │
│  │ 🚨 Where am I    │  │ ⚡ Quickest      │         │
│  │    failing?       │  │    wins          │         │
│  │ Critical issues   │  │ High-impact,     │         │
│  │ hurting you now   │  │ low-effort items │         │
│  └──────────────────┘  └──────────────────┘         │
│  ┌──────────────────┐  ┌──────────────────┐         │
│  │ 💰 Revenue       │  │ 👥 Team          │         │
│  │    opportunities  │  │    performance   │         │
│  │ Growth & margin   │  │ Staffing &       │         │
│  │ insights          │  │ capacity gaps    │         │
│  └──────────────────┘  └──────────────────┘         │
│  ┌──────────────────┐  ┌──────────────────┐         │
│  │ ❤️ Client        │  │ 📊 Show me       │         │
│  │    retention      │  │    everything    │         │
│  │ Rebook & churn    │  │ Full insights    │         │
│  │ signals           │  │ feed             │         │
│  └──────────────────┘  └──────────────────┘         │
│                                                      │
│  Powered by Zura AI · Based on your data            │
└─────────────────────────────────────────────────────┘
```

After selecting an intent, the wizard slides out and the filtered feed slides in (reusing existing `slideVariants`). A "← Change focus" button in the header lets users return to the intent picker.

## Intent Definitions

| Intent | Label | Description | Filter Logic |
|--------|-------|-------------|-------------|
| `failing` | Where am I failing? | Critical issues hurting you now | severity === 'critical' OR severity === 'warning', sorted by impact desc |
| `quick_wins` | Quickest wins | High-impact, low-effort items | effortLevel === 'quick_win', sorted by impactEstimateNumeric desc |
| `revenue` | Revenue opportunities | Growth & margin insights | category in ['revenue_pulse', 'cash_flow'] |
| `team` | Team performance | Staffing & capacity gaps | category in ['staffing', 'capacity'] |
| `retention` | Client retention | Rebook & churn signals | category === 'client_health' |
| `everything` | Show me everything | Full insights feed | No filter (current behavior) |

## Changes

### 1. Add wizard state to `AIInsightsPanel`

New state: `selectedIntent: WizardIntent | null` — starts as `null` (wizard screen shown). When an intent is selected, it transitions to the filtered feed.

### 2. Add `WizardIntentPicker` component (inline in same file)

A 2-column grid of intent cards. Each card has an icon, title, one-line description, and a count badge showing how many insights match that intent (so users can see "Where am I failing? (3)" vs empty intents).

- Cards with 0 matching insights show as muted/disabled with "No items" label
- Cards with critical items get a subtle red accent
- Clicking sets `selectedIntent` and triggers the slide transition

### 3. Modify feed rendering

When `selectedIntent` is set (and not `'everything'`), apply the intent's filter function to `sortedInsights` and `sortedActionItems` before rendering. The existing category filters and view toggle still work within the filtered set.

When intent is `'everything'`, render exactly as current (no change).

### 4. Add "Change focus" header button

When `selectedIntent` is set, show a `← Change focus` button in the header (left of title) that resets `selectedIntent` to `null`, returning to the wizard picker.

### 5. Animation

Reuse existing `slideVariants` — wizard picker exits left, filtered feed enters from right (same pattern as the Guidance panel transition).

## Files Changed
- **Modified:** `src/components/dashboard/AIInsightsDrawer.tsx` — add `WizardIntent` type, `WizardIntentPicker` component, `selectedIntent` state, intent filter logic, "Change focus" button, and slide transitions between wizard and feed

Single file change. No new files needed.

