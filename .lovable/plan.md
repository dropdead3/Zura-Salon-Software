

# AI Level Configuration Analysis

## What It Does

Adds a "Zura Analysis" button to the Stylist Levels editor that sends the salon's current level structure, commission rates, promotion criteria, and retention criteria to an edge function. The AI reviews the configuration and returns structured feedback: what looks good, what needs attention, and specific recommendations — all contextualized to salon industry standards.

## User Flow

```text
┌─────────────────────────────────────────────────────────┐
│  [Export Roadmap]  [✨ Analyze Configuration]  [Save]   │
└─────────────────────────────────────────────────────────┘
         ↓ click
┌─────────────────────────────────────────────────────────┐
│  Zura Configuration Analysis          [X close]         │
│                                                         │
│  Overall: ✅ Well Structured (or ⚠️ Needs Attention)    │
│                                                         │
│  ✅ Strengths                                           │
│  • Commission spread (30→50%) is healthy...             │
│  • Retention criteria use coaching-first approach...    │
│                                                         │
│  ⚠️ Suggestions                                         │
│  • Level 3 promotion revenue ($12K) jumps 50% from     │
│    Level 2 ($8K) — consider a $10K midpoint             │
│  • No retention criteria configured for "Emerging"     │
│  • Retail attachment threshold (25%) at Senior may be   │
│    aggressive — industry avg is 18-22%                  │
│                                                         │
│  💡 Considerations                                      │
│  • Grace periods vary widely (14d→90d) — standardizing │
│    to 30-60d range improves fairness perception         │
│  • Entry level has no tenure requirement — adding 90d  │
│    prevents premature promotion conversations           │
└─────────────────────────────────────────────────────────┘
```

The dialog is read-only — advisory only, no auto-apply. Follows the platform doctrine: recommend, don't execute.

## Technical Approach

### 1. Edge Function: `ai-level-analysis`

**File: `supabase/functions/ai-level-analysis/index.ts`**

- Receives the full level configuration payload (levels, promotion criteria, retention criteria, commission rates) from the client — no DB query needed since the client already has the data
- Calls Lovable AI (`google/gemini-3-flash-preview`) with a structured system prompt that includes salon industry benchmarks
- Uses tool calling to extract structured output: `{ overallRating, strengths[], suggestions[], considerations[] }` with severity and affected level references
- Returns the structured analysis

### 2. Client: Analysis Dialog in `StylistLevelsEditor.tsx`

- Add an "Analyze Configuration" button next to "Export Roadmap" in the action buttons area (gated by `levels.length > 0`)
- On click, sends current `levels`, `promotionCriteria`, and `retentionCriteria` to the edge function via `supabase.functions.invoke`
- Renders results in a `Dialog` with three sections: Strengths (green), Suggestions (amber), Considerations (blue)
- Loading state with Sparkles spinner while AI processes
- No caching needed — this is an on-demand advisory tool

### 3. System Prompt Design

The AI prompt will include:
- Industry benchmark ranges for each KPI (revenue per level tier, typical retail %, rebooking %, etc.)
- Commission structure best practices (spread, increment consistency)
- Retention vs promotion threshold relationship checks (retention should be ~60-75% of promotion thresholds)
- Structural checks: missing criteria, inconsistent scaling, gaps in retention coverage, grace period reasonableness
- The Zura advisory tone — protective, never shaming

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/ai-level-analysis/index.ts` | **New** — Edge function with structured AI analysis |
| `src/components/dashboard/settings/StylistLevelsEditor.tsx` | **Modify** — Add analysis button + dialog component |

**2 files total. No database changes. No new hooks.**

