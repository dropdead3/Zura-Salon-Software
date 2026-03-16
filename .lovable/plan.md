

# Add Confidence Layer Section

## File
`src/components/dashboard/backroom-settings/BackroomPaywall.tsx`

## Placement
Insert after Section 7 (Trust + FAQ, ends line 1402) and before Section 8 (Final CTA, line 1404). New section: 7.5.

## Structure

1. **Header** (centered):
   - Headline: "Powerful System. Simple Workflow."
   - Subtitle: "Zura Backroom works quietly in the background while your team continues working as normal."

2. **5 confidence cards** in `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (last card spans center on lg):

| Icon | Title | Description |
|------|-------|-------------|
| `Zap` | Fast Setup | Configured quickly and integrated into your salon workflow. |
| `Users` | Designed for Stylists | Works with the natural flow of mixing and applying color. |
| `ShieldCheck` | No Disruption | Stylists mix bowls the same way they always have. |
| `BarChart3` | Clear Visibility | See the true cost of services and product usage. |
| `Beaker` | Built for Real Salons | Designed specifically for salon operations. |

Each card: icon in `w-10 h-10 rounded-xl bg-muted` box, title `font-display text-sm`, one-line description `text-sm text-muted-foreground font-light`.

3. **Supporting message**: "Zura Backroom adds intelligence to your workflow without adding complexity."

4. **CTA**: Centered `<ActivateButton />`

## Icons
All icons already imported — no new imports needed.

