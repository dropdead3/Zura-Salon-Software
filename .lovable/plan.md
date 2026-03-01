

## Remove Focus Rings from All Inputs

### What's Changing
Strip the `focus-visible:ring-*` classes from `Input`, `Textarea`, and `PlatformInput`, replacing them with a subtle border-color shift on focus — no ring, no offset, just a clean border transition that feels intentional and luxury.

### Files

1. **`src/components/ui/input.tsx`** (line 31)  
   Remove `ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`  
   Replace with `focus-visible:border-foreground/30 transition-colors`

2. **`src/components/ui/textarea.tsx`** (line 28)  
   Same removal: strip `ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`  
   Replace with `focus-visible:border-foreground/30 transition-colors`

3. **`src/components/platform/ui/PlatformInput.tsx`** (line 25)  
   Already uses a border-shift style (`focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50`). Remove the `focus:ring-2 focus:ring-violet-500/30` portion, keep only the border shift.

