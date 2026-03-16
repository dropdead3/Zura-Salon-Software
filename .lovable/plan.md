

# Add Before/After Workflow Transformation Section

## Placement
Insert between **Section 1.5 (Product Preview)** and **Section 2 (Loss Aversion)** — approximately after line 419. This positions it after the hero + product visual and before the data-heavy savings section.

## File
`src/components/dashboard/backroom-settings/BackroomPaywall.tsx`

## Structure

A new `<section>` with:
1. **Section header**: "How Zura Backroom Transforms Your Color Room" + subtitle "From guesswork to a controlled, measurable system."
2. **Two-column grid** (`grid-cols-1 md:grid-cols-2 gap-6`):
   - **Left card** — "Without Backroom" — soft destructive tint (`bg-destructive/[0.03]`), `XCircle` icon bullets in muted red
   - **Right card** — "With Backroom" — soft success tint (`bg-success/[0.03]`), `CheckCircle2` icon bullets in success green
3. **Subtle CTA** below: `<ActivateButton />` centered

## Content

**Without Backroom** (7 bullets):
- Stylists guess how much color to mix
- Formulas are scribbled in notebooks or forgotten
- Assistants mix bowls without standard measurements
- Inventory runs out mid-service without warning
- Product costs per service are unknown
- Chemical waste goes untracked
- Service profitability is a blind spot

**With Backroom** (7 bullets):
- Every formula is saved automatically per client
- Stylists see the last formula instantly at the chair
- Assistants prep bowls from guided mixing screens
- Product usage is tracked to the gram
- Inventory shortages are predicted before they happen
- Waste is visible, measurable, and reducible
- Service-level profitability becomes clear

## Visual Design
- Cards use `p-6 md:p-8`, `rounded-xl`, `border-border/50`, `hover-lift`
- Column headers use `font-display text-base tracking-wide` with icon
- Bullets use `text-sm font-sans text-muted-foreground` with `gap-3` icon+text rows
- Import `XCircle` from lucide-react for the "without" column indicators
- Section spacing matches page rhythm: `pb-20 md:pb-24`

