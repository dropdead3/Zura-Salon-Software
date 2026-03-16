

# Clarify Usage Fee as Variable Estimate

The ROI calculator line `Usage fee (~299 appts)` and its `$150.00/mo` value read like a fixed monthly charge. Need to make it clear this is a variable, usage-based estimate that fluctuates with actual color service volume.

## Changes (`BackroomPaywall.tsx`)

### 1. ROI Calculator line item (line 224)
- Change label from `Usage fee (~{n} appts)` to `Est. usage fee (~{n} color appts)*`
- Add `~` prefix to the dollar amount to signal it's approximate

### 2. Add footnote below the Total row (~line 240)
- Add a small footnote: `* Usage fee varies monthly based on actual color service appointments completed.`

### 3. Estimate blurb (line 720)
- Update wording from "estimated usage fee is ~$X/mo" to "based on current booking volume, we estimate ~$X/mo in usage fees — this varies with actual color service appointments each month."

