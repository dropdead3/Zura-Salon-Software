

## Operations Hub Design Audit and Fixes

Good instinct to audit after structural changes -- catching drift early prevents compounding inconsistencies.

### Issues Found

1. **Page container** uses raw `p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8` instead of `tokens.layout.pageContainer` (`px-6 pb-6 lg:px-8 lg:pb-8 pt-4 lg:pt-6 space-y-6`). Spacing is `space-y-8` instead of canonical `space-y-6`.

2. **ManagementCard icon container** uses `p-2.5 rounded-xl` (padding-based sizing) instead of the canonical `tokens.card.iconBox` pattern (`w-10 h-10 bg-muted flex items-center justify-center rounded-lg`). Also missing `bg-muted` base -- currently relies solely on the colorClass for background.

3. **HubGatewayCard icon container** uses `p-3 rounded-xl` with oversized `w-6 h-6` icon instead of canonical `w-10 h-10 rounded-lg` container with `w-5 h-5` icon.

4. **ManagementCard title** uses raw `font-medium text-sm` (implicit font-sans). Should use `font-sans text-sm font-medium` explicitly for clarity, which is correct per rules (these are utility cards, not analytics headlines).

5. **Card wrappers** don't reference `tokens.card.wrapper` -- missing the canonical `rounded-xl` token.

### Changes (single file: `TeamHub.tsx`)

1. Replace page container classes with `tokens.layout.pageContainer` + `max-w-[1600px] mx-auto`
2. Normalize `ManagementCard` icon box to `w-10 h-10 rounded-lg` (matching `tokens.card.iconBox` shape) while preserving per-card colorClass
3. Normalize `HubGatewayCard` icon box to `w-10 h-10 rounded-lg` with `w-5 h-5` icon (consistent with card token dimensions)
4. Add `tokens.card.wrapper` to Card className in both components
5. Import `tokens` from `@/lib/design-tokens`

No route, database, or structural changes.

