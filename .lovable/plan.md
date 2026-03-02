

## Standardize Hub Card Icons to Token Colors

Clean choice -- uniform `bg-muted` / `text-primary` aligns with the design token system and ensures theme compliance across all five color themes.

### Changes (single file: `TeamHub.tsx`)

1. **Remove `colorClass` prop** from both `ManagementCard` and `HubGatewayCard` interfaces and components
2. **Replace icon containers** with `tokens.card.iconBox` (`w-10 h-10 bg-muted flex items-center justify-center rounded-lg`) and `tokens.card.icon` (`w-5 h-5 text-primary`)
3. **Remove all hardcoded color classes** from every card instance (e.g., `bg-rose-500/10 text-rose-600 dark:text-rose-400`)
4. **Clean up**: Remove the `colorClass` default parameter and `cn()` wrapping on icon containers since they no longer need dynamic classes

### What stays the same
- Card structure, layout, hover effects, stat badges
- `HubGatewayCard` vs `ManagementCard` distinction (gateway uses `font-display` title, glass background)
- Category sections and grid layout

