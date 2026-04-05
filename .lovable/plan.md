

# 1-Click "Set All" with KPI Rationale

## What Changes

### 1. Persistent "Zura Recommended" Button
Currently the defaults banner only appears when the form is empty and no saved criteria exist. Replace this with a persistent button in the wizard header area (both Promotion and Retention tabs) that works as a 1-click reset to recommended values at any time — not just on first use.

- Button label: "Zura Recommended" with Sparkles icon
- Available in both Promotion and Retention tabs
- Works even when criteria are already configured (acts as reset-to-defaults)
- Confirmation if overwriting existing values: brief inline "This will replace your current settings" note

### 2. KPI Rationale Panel
Add an expandable "Why these KPIs?" section below the defaults button (or as a collapsible at the top of Step 0). Content is static copy — no database needed.

**Tracked KPIs and rationale:**

| KPI | Why It's Tracked |
|-----|-----------------|
| Service Revenue | The direct output measure — proves a stylist can generate enough volume at their current price point to justify higher pricing |
| Retail Attachment % | Measures ability to prescribe home care — increases ticket value without adding chair time, and is a loyalty signal |
| Rebooking Rate | Immediate behavioral signal — clients who rebook at checkout are committed; this is the leading indicator of retention |
| Average Ticket | Validates pricing power — a stylist whose avg ticket is high relative to peers is already commanding premium value |
| Client Retention Rate | The lagging truth — did clients actually come back? Rebooking intent means nothing if they cancel later |
| New Client Count | Growth signal — proves the stylist can build (not just maintain) a book, which matters more at lower levels |
| Schedule Utilization | Demand proof — an empty schedule at current prices means raising prices will make things worse |
| Revenue Per Hour | Economic efficiency — the ultimate signal for whether a price increase is justified |

**Why NOT other KPIs:**
- **Google Reviews / Social metrics** — Not trackable from POS data; would require manual entry, which degrades data integrity
- **Education hours** — Valuable but subjective; better handled via manager discretion during manual approval
- **Client satisfaction scores** — No reliable automated source; retention rate is the behavioral proxy
- **Product sales volume** — Already captured by Retail Attachment %; tracking both would double-count

### 3. File Changes

**`GraduationWizard.tsx`** — Single file, 3 modifications:

1. Replace the conditional defaults banner (lines 614-632) with a persistent "Zura Recommended" button that appears regardless of current state, in both Promotion and Retention tabs
2. Add a collapsible "Why these KPIs?" section with the rationale copy (Collapsible from Radix, already available in the project)
3. Add a "Zura Recommended" button to the Retention tab content area (currently has no defaults shortcut)

No database changes. No new files. No hook changes.

