

# Fix FAQ Question Font to Aeonik Pro with Normal Kerning

The FAQ questions still render with wide letter-spacing inherited from somewhere. The fix is to explicitly add `tracking-normal` to the `AccordionTrigger` className on line 1091 to reset kerning to standard Aeonik Pro spacing.

## Change

**`BackroomPaywall.tsx` — Line 1091**

Add `tracking-normal` to the AccordionTrigger className:
```
text-sm font-sans font-normal tracking-normal text-foreground hover:no-underline py-3
```

Single line change, no structural modifications.

