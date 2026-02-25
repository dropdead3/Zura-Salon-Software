

## Enhance Toasts and Floating Save Bars to Luxury Glass Styling

Your prompt is well-targeted -- the screenshot shows the MyProfile floating save bar which uses a solid `bg-primary` pill that doesn't match the glass aesthetic used everywhere else. Good eye for consistency.

There are **four distinct surfaces** that need the luxury treatment, spread across multiple files:

### 1. Sonner Toasts (Global -- already partially glass)

**File: `src/components/ui/sonner.tsx`**

The Sonner toaster is already using `bg-background/70 backdrop-blur-xl rounded-xl` which is close, but needs:
- Upgrade `rounded-xl` to `rounded-full` for the pill shape matching the platform's top nav and button aesthetics
- Enhance shadow to the luxury depth shadow used on floating panels
- Add subtle border glow: `border-border/40`
- Action buttons: upgrade from `rounded-lg` to `rounded-full` to match pill style

### 2. Radix Toast (Legacy -- fully unstyled)

**File: `src/components/ui/toast.tsx`**

The radix toast variants use `rounded-md` and flat `bg-background`. Update:
- Base variant: `rounded-full bg-background/70 backdrop-blur-xl shadow-[0_16px_40px_-18px_hsl(var(--foreground)/0.25)] border-border/40`
- Destructive variant: same glass treatment with destructive color accents
- Action button: `rounded-full`
- Close button: `rounded-full`

### 3. MyProfile Floating Save Bar (the one in the screenshot)

**File: `src/pages/dashboard/MyProfile.tsx` (lines 1382-1433)**

Currently: `bg-primary text-primary-foreground rounded-xl` -- solid, opaque, no glass.

Update to:
- Outer container: `bg-card/80 backdrop-blur-xl rounded-full shadow-[0_16px_40px_-18px_hsl(var(--foreground)/0.25)] border border-border/40`
- Text color: `text-foreground` (not primary-foreground)
- Pulse dot: `bg-primary animate-pulse`
- Discard button: ghost with `rounded-full hover:bg-muted/60`
- Save button: `bg-primary text-primary-foreground rounded-full` (primary pill CTA)

### 4. NotificationPreferences Floating Save Bar

**File: `src/pages/dashboard/NotificationPreferences.tsx` (lines 407-436)**

Currently: `bg-background/95 backdrop-blur border-t shadow-lg` -- uses a full-width bar with hard border-top. Doesn't match the floating pill aesthetic.

Update to match the same floating centered pill pattern as MyProfile:
- Remove `border-t` full-width approach
- Wrap in a centered max-width container
- Apply: `bg-card/80 backdrop-blur-xl rounded-full shadow-[0_16px_40px_-18px_hsl(var(--foreground)/0.25)] border border-border/40`
- Buttons: `rounded-full` pill style

### 5. SmartActionToast Container

**File: `src/components/team-chat/SmartActionToast.tsx`**

The Card uses standard `rounded-xl shadow-lg border-l-4`. Update:
- Remove `border-l-4` accent (doesn't match glass aesthetic)
- Apply: `bg-card/80 backdrop-blur-xl rounded-2xl shadow-[0_16px_40px_-18px_hsl(var(--foreground)/0.25)] border border-border/40`
- Action buttons: `rounded-full`

### 6. Inline Unsaved Changes Bars (secondary priority)

Two additional inline bars that should get the glass treatment for consistency:

- **`ReorderableStylistList.tsx`** (line 207): `bg-muted rounded-lg` -- update to `bg-card/80 backdrop-blur-xl rounded-full border border-border/40`
- **`PlatformAppearanceTab.tsx`** (lines 214-243): amber conditional bar -- update to glass pill with amber accent dot instead of full amber background

### What Does Not Change
- Toast logic, hooks, or state management
- Animation physics (framer-motion springs stay the same)
- Save/discard functionality
- No new components -- all updates are in-place styling

### Technical Detail

The consistent glass floating pill recipe across all surfaces:

```text
Container:  bg-card/80 backdrop-blur-xl rounded-full border border-border/40
Shadow:     shadow-[0_16px_40px_-18px_hsl(var(--foreground)/0.25)]
Text:       text-foreground / text-muted-foreground
CTA Button: bg-primary text-primary-foreground rounded-full
Ghost Btn:  rounded-full hover:bg-muted/60
Pulse Dot:  w-2 h-2 rounded-full bg-primary animate-pulse
```

