

## Redesign "Map Components" Step with Educational Onboarding

### Problem
The "Map Components" step shows a bare list of services with "Add Product" buttons. Stylists don't understand what "components" are, why they matter, or what they're supposed to do. The step needs contextual education and a more intuitive interaction.

### Changes — `ServiceTrackingQuickSetup.tsx`

**1. Add an educational intro card above the service list (components step only)**

A short, calm explainer block at the top of the step:

```text
┌──────────────────────────────────────────────────────────┐
│  📦  What are product components?                        │
│                                                          │
│  Each color or chemical service uses specific products   │
│  — lightener, color, developer, toner. Linking them      │
│  here tells Zura what to track and measure per service.  │
│                                                          │
│  Example: "Full Balayage" might use Lightener + Developer│
└──────────────────────────────────────────────────────────┘
```

Uses a subtle `bg-muted/30 border rounded-xl` card with a Package icon. No emojis — on-brand, declarative copy.

**2. Rename "Add Product" → "Link Product"**

Clearer verb — stylists aren't "adding" products to the catalog, they're linking existing backroom supplies to a service.

**3. Improve the step description (line 44)**

Change from `'Link products to tracked services.'` → `'Connect the products each service uses so Zura can track usage automatically.'`

**4. Add inline helper text per service row**

Below each service name, show a subtle hint: `"Which products does this service use?"` in `text-[10px] text-muted-foreground` — only for services that have no components yet.

**5. Show linked product count for services that already have some**

If a service already has components mapped (from `componentsByService`), show a small badge like `"2 linked"` instead of just the Add button, with an option to add more.

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingQuickSetup.tsx` (components step content + step description)

