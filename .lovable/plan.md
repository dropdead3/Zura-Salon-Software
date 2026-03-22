

## Add Truncation to Client+Services Line When Card is Compressed

**Problem:** When the scheduled card slides left to reveal the 3 action buttons, the card content area shrinks significantly but the client name + services line doesn't truncate — it wraps or overflows instead of clipping gracefully.

**Fix:** Re-add `truncate` to the `<p>` tag on line 129. The previous removal was correct for the full-width resting state, but now that the card compresses during swipe, truncation is needed to handle the reduced width. The `+X more` logic still provides the programmatic limit, while `truncate` handles the visual clipping when the card is physically narrower.

### Change — `src/components/dock/schedule/DockAppointmentCard.tsx`

Line 129: Add `truncate` back to the `<p>` className:

```tsx
<p className={cn('text-lg truncate', visible ? 'font-medium text-[hsl(var(--platform-foreground))]' : '')}>
```

Single class addition, one line.

