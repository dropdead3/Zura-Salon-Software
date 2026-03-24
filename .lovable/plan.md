

## Fix Down Arrow Indicator Not Showing at Top of Scroll

**Problem:** The `showScrollIndicator` state initializes as `false`, and `checkScroll` runs on mount — but the scroll container may not have rendered its content yet when `checkScroll` first fires, so `scrollHeight` equals `clientHeight` and the indicator stays hidden.

**Root cause:** The `checkScroll` runs synchronously on mount via `useEffect`. At that point, the appointment cards may not have fully rendered, so the container doesn't report overflow yet.

### Change — `src/components/dock/schedule/DockScheduleTab.tsx`

1. Add a `ResizeObserver` on the scroll container to re-run `checkScroll` whenever content size changes. This catches the moment cards finish rendering and the container becomes scrollable:

```ts
useEffect(() => {
  const el = scrollRef.current;
  if (!el) return;
  checkScroll();
  el.addEventListener('scroll', checkScroll, { passive: true });
  
  const resizeObserver = new ResizeObserver(() => checkScroll());
  resizeObserver.observe(el);
  // Also observe the first child (content container) for height changes
  if (el.firstElementChild) {
    resizeObserver.observe(el.firstElementChild);
  }
  
  return () => {
    el.removeEventListener('scroll', checkScroll);
    resizeObserver.disconnect();
  };
}, [checkScroll, appointments]);
```

This ensures `checkScroll` re-evaluates once the content actually renders and `scrollHeight > clientHeight` becomes true. One file, one block updated.

