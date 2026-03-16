

# Expand Backroom Feature Coverage

The "What You Get" bullet list and the 4-card feature grid only cover scale/waste/cost tracking. Missing capabilities: Service Blueprints, Smart Mix Assist (formula memory + ratio lock), Client Memory Panel, Supply Intelligence (AI insights + demand forecasting), and Operational Task Engine.

## Changes (`BackroomPaywall.tsx`)

### 1. Expand the "What You Get" checklist (lines 656-662)
Add missing bullet items:
- Current 5 stay as-is
- Add: `Service blueprints for every color workflow`
- Add: `Smart Mix Assist with formula memory`
- Add: `Client history and formula recall`
- Add: `AI-powered supply intelligence`
- Add: `Operational task routing and alerts`

This brings it to 10 items, which fills the 2-column grid nicely (5 per column).

### 2. Expand the feature card grid (lines 30-51)
Add 2 more cards to the existing 4, making a 3×2 grid:

**Card 5 — "Blueprint Every Service"**
- Icon: `ClipboardList`
- Description: "Define step-by-step workflows for every color service — mix, prep, process, rinse — so your team delivers consistency every time."

**Card 6 — "Instant Formula Recall"**
- Icon: `Brain` (or `History`)
- Description: "Smart Mix Assist surfaces each client's last formula automatically. No more flipping through notes or guessing ratios."

### 3. Update grid layout (line 670)
The current `sm:grid-cols-2` works for 6 cards (3 rows of 2). No layout change needed — just adding the new entries to the array.

