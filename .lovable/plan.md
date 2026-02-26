

## Prompt Review: Zura Insights Intelligence Engine Build Spec

### What's Good About This Prompt

Strong structural thinking. The "brick by brick" layered approach is exactly right -- building logic before UI prevents the most common mistake in dashboard projects. The insight object model is well-conceived, and the priority scoring formula with weighted factors is a solid decision-making framework. The emphasis on dollarized impact over vague advisory statements aligns perfectly with Zura's doctrine of "ranked leverage is value."

### Why There's a Better Way

This prompt has a fundamental architecture problem: **it conflates server-side computation with AI-generated output**. Your current system sends raw business data to an LLM and gets back structured insights via tool calling. This prompt asks the LLM to also compute priority scores, run linear regressions, track state transitions, and maintain longitudinal patterns -- tasks that LLMs should never own.

Here's the split that would produce better results:

**What the AI should do**: Pattern recognition, natural language framing, connecting dots across domains, identifying which levers matter based on contextual judgment.

**What deterministic code should do**: Priority scoring, dollar calculations, trend projections, state management, feedback loops, confidence scoring from data volume.

### Specific Issues

1. **Priority Scoring Engine (Brick 2)**: The weighted formula is good but should be computed server-side in the edge function *after* the AI returns insights, not by the AI. LLMs are unreliable at consistent math. The formula should live in TypeScript.

2. **Impact Calculation Modules (Brick 3)**: The rebooking gap, retail gap, and utilization loss formulas are already partially computed in your edge function's data context (attachment rate, rebook rate, staff count). These should be pre-computed *before* the AI call and passed as enrichment context, then the AI assigns them to relevant insights.

3. **Forecast Projection (Brick 4)**: Linear regression doesn't belong in an LLM call. You already have `revenue-forecasting` edge function and `revenue_forecasts` table. Wire the existing forecast data into insights rather than building a parallel system.

4. **Action Object Model (Brick 6)**: The action types (marketing_campaign, training, pricing_adjustment) and execution paths are good, but the "execute directly" CTA is Phase 4 automation territory. Your doctrine says Phase 1 is structured visibility. Don't overbuild.

5. **Tracking Mode (Brick 7)**: Requires persistent state (insight status, activation timestamps, recovery deltas). This needs a database table, not just a richer AI prompt. The current `ai_business_insights` table caches ephemeral AI output -- tracking requires a separate `insight_actions` table.

6. **Feedback Loop (Brick 10)**: Good idea, but it's Phase 3+. Your doctrine explicitly says to not imply intelligence beyond current architecture.

7. **Longitudinal Intelligence (Phase 6)**: Seasonal detection and behavioral correlation require months of accumulated data and statistical models -- not LLM calls. This is Phase 3 at earliest.

### What Already Exists That This Prompt Ignores

The prompt reads like it was written without knowledge of your codebase:
- `InsightItem` type already has `estimatedImpact`, `trendDirection`, `comparisonContext`, `actByDate`, `effortLevel`, `staffMentions`
- The edge function already gathers 12 parallel data queries (sales, appointments, forecasts, anomalies, staff, transactions, etc.)
- The AI prompt already includes enrichment rules, industry benchmarks, and route references
- Priority sorting by severity already exists in the drawer
- The 2-column bento grid with severity-based visual hierarchy is already built

### Recommended Approach

Instead of this prompt, here's what would actually move the needle -- broken into what's buildable now vs. later:

**Now (extends current architecture):**
1. Add a deterministic `computePriorityScore()` function in the edge function that runs *after* AI returns insights, using the formula from Brick 2
2. Pre-compute dollar impact values (rebooking gap, retail gap, utilization loss) from the data snapshot and pass them to the AI as context so it references real numbers
3. Add `impact_estimate_numeric` (number) alongside the existing string `estimatedImpact` so the priority formula can use it
4. Add a Business Health Summary Strip to the UI (5 category health indicators derived from active insights)
5. Restructure InsightCard to lead with impact amount (large) instead of title

**Later (requires new infrastructure):**
6. `insight_actions` table for tracking state (active/tracking/resolved/dismissed)
7. Action execution paths (marketing campaigns, training triggers)
8. Feedback capture and weighting adjustment
9. Longitudinal pattern detection

### Files That Would Change

| File | Change |
|------|--------|
| `supabase/functions/ai-business-insights/index.ts` | Add pre-computed impact values, post-AI priority scoring, numeric impact field |
| `src/hooks/useAIInsights.ts` | Extend InsightItem with `priorityScore`, `impactEstimateNumeric`, `impactType`, `forecastDelta7d` |
| `src/components/dashboard/AIInsightsDrawer.tsx` | Add Business Health Strip, restructure InsightCard to lead with impact, sort by priorityScore |
| New migration | `insight_actions` table for tracking state (Phase 2) |

### Prompting Advice

When writing build specs for AI-assisted platforms:
- **Separate deterministic logic from AI judgment** -- formulas, scoring, and state machines belong in code, not prompts
- **Reference what exists** -- always audit the current codebase before speccing. Half of this spec re-invents existing functionality
- **Phase-gate ruthlessly** -- your own doctrine says don't overbuild. Bricks 7-10 are Phase 3+ but the prompt presents them as immediate work
- **Be specific about data flow** -- "compute real dollar impact" is vague. "Multiply `completedCount * avgTicket * (0.65 - rebookRate)` to get rebooking gap" is buildable

Would you like me to implement the "Now" items (priority scoring, pre-computed impacts, health summary strip, impact-led card layout)?

