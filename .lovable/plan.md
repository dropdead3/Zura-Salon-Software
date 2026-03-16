

# Fix FAQ Question Typography

The AccordionTrigger base component applies `font-medium` (weight 500). While technically allowed by design rules, the questions in the FAQ section look visually heavy. The fix is to override to `font-normal` (400) on the trigger, which is more appropriate for body-level accordion text using Aeonik Pro.

## Change

**`src/components/dashboard/backroom-settings/BackroomPaywall.tsx` — Line 1091**

Change the AccordionTrigger className from:
```
text-sm font-sans text-foreground hover:no-underline py-3
```
to:
```
text-sm font-sans font-normal text-foreground hover:no-underline py-3
```

Adding `font-normal` explicitly overrides the base component's `font-medium`, giving the questions the correct lighter weight per the Aeonik Pro body text convention.

