

## Fix Website Hub Card Height

The Website Hub card appears taller than sibling hub cards because it sits alone in its grid row. With `min-h-[108px]` and `h-full`, cards in filled rows align to each other's tallest content, but the solo card renders at its natural height which differs slightly.

### Change (single file: `TeamHub.tsx`)

Replace `min-h-[108px]` with a fixed `h-[108px]` on the `HubGatewayCard` `CardContent`, and remove `h-full` from the outer `Card` so that all hub gateway cards are exactly the same height regardless of row occupancy.

- Line 100: Remove `h-full` from Card className
- Line 101: Change `min-h-[108px]` to `h-[108px]` on CardContent

This ensures every `HubGatewayCard` renders at exactly 108px content height, whether it shares a row with other cards or sits alone.

