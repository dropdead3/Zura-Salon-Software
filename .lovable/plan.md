

## Sort Retail Categories by Revenue with Rank Numbers

### Change
**`src/components/dashboard/AggregateSalesCard.tsx`** (~line 1007-1068)

1. After defining `subCategories` array, sort it descending by `amount`:
   ```js
   .sort((a, b) => b.amount - a.amount)
   ```

2. In the `.map()` rendering (line 1068), use the index to display a rank number before the icon:
   ```jsx
   {subCategories.map(({ label, icon: Icon, amount }, index) => {
     ...
     <span className="text-[10px] text-muted-foreground/50 w-3 tabular-nums">{index + 1}</span>
     <Icon ... />
   ```

Two small additions — a `.sort()` call and a rank `<span>`.

