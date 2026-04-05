

# Separate Commission Rows from Criteria Table

## Problem
The Service Commission and Retail Commission rows are currently rendered inside the "Promotion — To Reach This Level" section, making them look like KPI thresholds a stylist must meet to level up. They are not criteria — they are the **reward** at each level.

## Solution
Move the two commission rows out of the `metrics` array and render them as a distinct visual section **above** the Promotion section header, with their own section header and styling that differentiates them from the governance criteria.

### Design
- Add a new section header: `💰 Compensation — At This Level` (using a DollarSign icon) with a slightly different background tint (`bg-primary/5` instead of `bg-muted/30`) to visually separate it from the governance sections
- Render the two commission rows immediately after this header, before the Promotion section
- Remove the two commission entries from the `metrics` array so they no longer appear under "Promotion"
- Give commission rows a subtle left border accent (`border-l-2 border-primary/20`) so they read as "informational context" rather than "settings to configure"

### File Changed
| File | Change |
|------|--------|
| `src/components/dashboard/settings/StylistLevelsEditor.tsx` | Extract commission rows from `metrics` array, render as separate "Compensation" section above Promotion in the table body |

**1 file. No database changes.**

