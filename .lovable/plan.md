

# Expand Struggle Input Suggestions

## Change

Update the `SUGGESTIONS` array in `src/components/marketing/StruggleInput.tsx` (lines 15-20) to include more software-specific salon pain points. These also cycle through the typing animation placeholder.

### New suggestions list

1. "I can't track commissions accurately"
2. "I want to run my commission salon better"
3. "I need booth renter tracking and management"
4. "I want custom commission levels per service and retail"
5. "I need to track color bar costs per service"
6. "I want an AI assistant to handle calls and scheduling"
7. "My team keeps quitting"
8. "I don't know which services are profitable"
9. "Scheduling is a nightmare"

Nine total — the typing animation cycles through all of them; the pill buttons below the input will show a random or first-N subset (4-5) to avoid clutter.

### Pill display logic

To prevent the suggestion area from becoming too tall, show only 5 pills at a time, randomly selected on mount. The full list still cycles in the typing placeholder animation.

## File Changes

| File | Action |
|------|--------|
| `src/components/marketing/StruggleInput.tsx` | **Modify** — expand `SUGGESTIONS` array, add display subset logic for pills |

**1 file modified.**

