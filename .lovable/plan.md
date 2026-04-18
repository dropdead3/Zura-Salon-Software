

## Highlight day count in theme primary color

### Change
In `src/components/dashboard/InsightsNudgeBanner.tsx`, wrap the day count number in a `<span>` styled with `text-primary` so it picks up the active theme's vibrant accent (Zura purple, Rose pink, Sage green, etc.).

### Edit
Replace the headline string with a JSX expression that renders the number in `text-primary font-medium`:

```tsx
{isNeverChecked ? (
  `You haven't explored your ${PLATFORM_NAME} Insights yet`
) : (
  <>
    You haven't checked your insights in{' '}
    <span className="text-primary font-medium">{daysSinceLastCheck} days</span>
  </>
)}
```

### Out of scope
- No changes to icon, layout, or muted description copy.
- "Never checked" variant unchanged (no number to highlight).

### Verification
Reload the dashboard and confirm "21 days" renders in the active theme's primary accent. Switch themes (Zura → Rose → Sage) and confirm color tracks the theme.

