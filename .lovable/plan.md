

# Add "Staff Hours Saved" Value Proposition & Cost Calculator

## Concept
Add a new savings line item that quantifies the labor hours currently wasted on manual stock audits, nightly counts, and supply checks — and shows the dollar value recovered. Backroom's predictive inventory intelligence eliminates this entirely.

## Calculations
- New state: `auditMinutesPerDay` slider (default 30, range 10–90) — "How many minutes does your team spend daily checking backroom stock?"
- `monthlyAuditHours = (auditMinutesPerDay * 30) / 60`
- `staffHourlyCost` — use a reasonable default (~$18/hr, adjustable or static)
- `monthlyAuditCost = monthlyAuditHours * staffHourlyCost`
- `yearlyAuditCost = monthlyAuditCost * 12`
- Add to `totalSavings` so it flows into net benefit, yearly impact, ROI multiplier, and CTA automatically

## Changes — `BackroomPaywall.tsx` only

### 1. New state + calculation variables (~line 56, ~line 96)
- `auditMinutesPerDay` state (default 30)
- `staffHourlyCost = 18`
- `monthlyAuditHours`, `monthlyAuditCost`, `yearlyAuditCost`
- Update `totalSavings` to include `monthlyAuditCost`

### 2. New card in left column: "Time You're Losing Today" (after Salon's Numbers, before Pricing Overview ~line 428)
A compelling card with:
- Headline: "Time your team loses every day" or similar
- Copy: Short paragraph about nightly counts, guessing stock levels, manual audits — and how Backroom's predictive intelligence replaces all of it
- Slider: "Minutes spent daily on stock checks" (10–90, default 30)
- Two stat boxes: monthly hours recovered + monthly cost recovered (animated numbers)
- Muted note: "Based on average staff cost of $18/hr"

### 3. New savings line in sticky calculator (~line 196)
Add between "Waste reduction" and "Supply fee recovery":
```
Staff hours recovered    −$XXX
```

### 4. Update feature grid (~line 28)
Add or update a feature card to emphasize predictive stock intelligence — "Knows if you have enough product for tomorrow's appointments. No more counting."

### 5. Yearly impact grid update
The annual impact section already derives from `totalSavings * 12`, so adding `monthlyAuditCost` to `totalSavings` will automatically flow the staff hours value into the yearly hero number, ROI multiplier, and CTA.

