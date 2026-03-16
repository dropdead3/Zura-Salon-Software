

# Clarify "Projected Annual Recovery" Banner

## Change
Update the banner title and add a brief explanation so it's clear this represents what happens **after** implementing Backroom, not current state.

### In `BackroomPaywall.tsx` (lines 530–562):

1. **Title**: Change "Projected Annual Recovery" → "When Backroom Is Implemented"
2. **Subtitle**: Add a line below the title: "Estimated annual savings based on your salon's current numbers"
3. **Big number label**: Add a small label above/beside the big number: "You could recover"
4. **Breakdown labels**: Prefix with "↓" or keep as-is but add context like "reduced by" or keep simple
5. **Footer**: Change from "Based on your salon's current appointment volume" → "Projections based on your actual appointment data and industry benchmarks for salons using automated color tracking"

This is a copy-only change — no structural or logic changes needed.

