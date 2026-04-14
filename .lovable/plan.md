

# Amber Ghost Style for Activation Progress Card

## Change

Replace the standard `<Card>` wrapper in `ZuraPayActivationChecklist.tsx` with an amber-tinted ghost card — transparent background with a subtle amber border and glow, matching the warning/attention aesthetic used elsewhere in the app (e.g., the "Payment Issues Detected" banner on the Zura Pay Health page).

## Styling

- **Border**: `border border-amber-500/30` (subtle amber outline)
- **Background**: `bg-amber-500/[0.04]` (barely-there amber wash)
- **Icon box**: Amber-tinted (`bg-amber-500/15` with `text-amber-500` icon)
- **Progress bar track**: `bg-amber-500/15` instead of `bg-muted`
- **Progress bar fill**: `bg-amber-500` instead of `bg-primary`
- **Completed step icons**: `text-amber-500` instead of `text-primary`
- **Card radius**: Keep `rounded-xl` per bento system

## File

`src/components/dashboard/settings/terminal/ZuraPayActivationChecklist.tsx` — Replace the `<Card>` with a styled `<div>` using the amber ghost classes, and update the icon/progress colors to amber.

