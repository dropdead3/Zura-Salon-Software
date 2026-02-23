
## Make Analytics Callout Card Collapsible

### Change

Wrap the analytics quick-links card in a `Collapsible` component from `@radix-ui/react-collapsible` (already available at `@/components/ui/collapsible`). The header row (icon, title, description) becomes the `CollapsibleTrigger`, and only the 4 link chips are wrapped in `CollapsibleContent`. A small chevron indicator will be added to signal expand/collapse state.

### Visual Behavior

- **Expanded (default):** Card looks exactly as it does now -- icon, header, description, and 4 link chips
- **Collapsed:** Icon, header, and description remain visible; the 4 link chips are hidden. A `ChevronDown`/`ChevronUp` icon on the right side of the header row indicates state
- Card maintains full width span in both states

### Technical Details

**File:** `src/pages/dashboard/AppointmentsHub.tsx`

1. Add imports: `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` from `@/components/ui/collapsible`; add `ChevronDown` to the lucide import
2. Add `const [analyticsOpen, setAnalyticsOpen] = useState(true)` for default-expanded state
3. Wrap the `Card` contents:
   - The header `div` (icon + title + description) becomes a `CollapsibleTrigger` with a chevron on the right that rotates based on open state
   - The links grid gets wrapped in `CollapsibleContent`
4. The outer `Card` element stays unchanged (same glass aesthetic, full width)

No new files. No database changes. Single file edit.
