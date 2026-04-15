

## Remove Glassmorphism from Appointment Cards

### Change
**1 file**: `src/components/dashboard/schedule/AppointmentCardContent.tsx`

Remove the two backdrop-filter lines from the dark+category card style block (~lines 555-556):

```tsx
// Remove these two lines:
backdropFilter: 'blur(8px)',
WebkitBackdropFilter: 'blur(8px)',
```

Also remove the `boxShadow: darkStyle.glow` on line 557 since the glow effect is part of the glass aesthetic. The category tint, accent bar, and border remain — only the frosted blur and glow are removed.

