

# Redesign Checkout Confirm Dialog for Clarity

## Current Issues
- Savings buried at the bottom — should be the first thing they see (value-first)
- "Due today" vs "Est. monthly total" are crammed together in one box
- No clear explanation that monthly total varies with appointment volume

## New Layout (top → bottom)

### 1. Estimated Savings Banner (moved to top, right after header)
- Green border card with savings + net benefit — anchors the value proposition immediately

### 2. Due Today (clear standalone section)
- Section label: **"Due Today"**
- Hardware one-time cost (scales × $199) — only if scaleCount > 0
- If no hardware, skip this section entirely

### 3. Monthly Costs — Fixed
- Section label: **"Fixed Monthly"**
- Location line items + scale license line items
- Subtotal row

### 4. Monthly Costs — Variable  
- Section label: **"Variable Monthly"**
- Per-color-service fee with estimate
- Clarifying text: *"Varies each month based on the number of appointments with color services."*

### 5. Estimated Monthly Total (summary box)
- Prominent total with `/mo` suffix
- Subtitle: *"Fixed costs + estimated usage across {n} locations. Actual monthly bill depends on color service volume."*

### 6. Card on file (unchanged)

### 7. Action buttons (unchanged)

## File
`src/components/dashboard/backroom-settings/BackroomCheckoutConfirmDialog.tsx` — restructure the content within `space-y-4` div (lines 55–188). No new files or dependencies.

