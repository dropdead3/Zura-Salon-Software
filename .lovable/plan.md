

## Enhance AI Insights: Financial Impact, Trends, Benchmarks, Urgency, Effort, and Staff Callouts

### Overview
Enrich each insight with six new data dimensions so salon owners can instantly see dollar impact, direction, context, urgency, effort, and who to talk to. Requires changes to both the backend (AI prompt + tool schema) and frontend (InsightCard rendering).

### Files Changed

| File | Action |
|------|--------|
| `supabase/functions/ai-business-insights/index.ts` | Extend tool schema with 6 new optional fields per insight; update AI prompt to generate them |
| `src/hooks/useAIInsights.ts` | Extend `InsightItem` type with new fields |
| `src/components/dashboard/AIInsightsDrawer.tsx` | Render new fields in InsightCard: impact badge, trend arrow, benchmark bar, urgency tag, effort pill, staff names |

### Schema Additions (per insight object)

```text
estimatedImpact     string | null   "$2,246/week lost" or "$800/month opportunity"
trendDirection      "improving" | "declining" | "stable" | null
comparisonContext   string | null   "Industry avg: 30% · You: 17%"
actByDate           string | null   "Within 3 days" or "This week"
effortLevel         "quick_win" | "strategic" | null
staffMentions       string[] | null  ["Sarah M.", "Jake R."]
```

### Backend Changes (`ai-business-insights/index.ts`)

1. **Tool schema** — Add 6 optional properties to the `insights` array item schema
2. **System prompt** — Add instructions:
   - Always estimate dollar impact when revenue/cost data supports it (use weekly or monthly framing)
   - Include trend direction based on week-over-week or period comparison
   - Add comparison context: cite industry benchmarks or the salon's own historical average
   - Set `actByDate` for time-sensitive issues (cancellation spikes, no-show patterns, upcoming capacity gaps)
   - Tag `effortLevel`: "quick_win" for <30 min actions, "strategic" for multi-week initiatives
   - Include `staffMentions` when insight relates to specific team members (from staff data cross-referenced with appointments)

### Frontend Changes (`AIInsightsDrawer.tsx` — `InsightCard`)

Below the description, render a compact metadata row:

```text
┌─────────────────────────────────────────────────────┐
│ ↗ REVENUE PULSE                                     │
│ Rebooking Rate Dropping Below Target                │
│ Only 42% of clients rebooked vs 65% industry avg... │
│                                                     │
│ ↓ Declining · ~$2,246/wk lost · Industry: 65%       │
│ ⚡ Quick Win · Act within 3 days · Sarah M., Jake R. │
│                                                     │
│ [How to improve]  [See in Analytics]                │
└─────────────────────────────────────────────────────┘
```

- **Row 1**: Trend arrow (colored: green ↑, red ↓, gray →) + `estimatedImpact` in a subtle pill + `comparisonContext`
- **Row 2**: Effort pill (⚡ Quick Win = green-tinted, 🎯 Strategic = blue-tinted) + `actByDate` with clock icon + staff names as subtle chips
- All fields are optional — only render when non-null
- Financial values wrapped in `BlurredAmount`

### Type Changes (`useAIInsights.ts`)

```typescript
export interface InsightItem {
  // existing fields...
  estimatedImpact?: string | null;
  trendDirection?: 'improving' | 'declining' | 'stable' | null;
  comparisonContext?: string | null;
  actByDate?: string | null;
  effortLevel?: 'quick_win' | 'strategic' | null;
  staffMentions?: string[] | null;
}
```

### AI Prompt Additions (key excerpts)

- "For every insight, estimate the weekly or monthly dollar impact. Use actual numbers from the data snapshot. Frame as loss ('~$X/wk lost') or opportunity ('~$X/mo opportunity')."
- "Set trendDirection by comparing this week vs last week for the relevant metric."
- "Include comparisonContext citing industry benchmarks: rebooking 65%, retail attachment 30%, no-show rate <5%, cancellation <10%."
- "Set actByDate for insights where delay worsens the problem. Use 'Today', 'Within 3 days', 'This week', or 'This month'."
- "Tag effortLevel: quick_win for actions completable in one session (<30 min), strategic for multi-week initiatives."
- "When specific staff members are underperforming or excelling on the metric, include their display_name in staffMentions (max 3)."

