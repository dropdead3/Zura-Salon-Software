

# Alphabetical Quick-Jump Selector for Client Step

## Overview

Add a vertical A-Z letter strip along the right edge of the client list in the booking wizard's Client step. Tapping a letter instantly scrolls to the first client whose last name (or first name, based on sort) starts with that letter. Letters with no matching clients appear dimmed. This is the same pattern used in phone contact lists.

## How It Works

1. A narrow vertical strip of A-Z letters is positioned on the right side of the ScrollArea
2. Clients are sorted alphabetically by last name (falling back to first name)
3. Tapping a letter scrolls the list to the first client starting with that letter
4. Letters with no matching clients are dimmed (lower opacity, no pointer)
5. The currently active letter (based on scroll position) is subtly highlighted
6. On touch devices, dragging a finger along the strip continuously scrolls to each letter

## Visual Design

- Strip width: ~20px, positioned absolute right-0 inside the scroll container
- Letters: font-sans, text-[10px], text-muted-foreground
- Active letter: text-primary, slightly larger
- Disabled letters: opacity-30
- No background -- just floating letters over a subtle backdrop-blur area

## Technical Details

### Changes to `ClientStep.tsx`

1. **Sort clients alphabetically** before rendering (by last name extracted from `client.name`)
2. **Build a letter index** -- a `Map<string, number>` mapping each letter to the index of the first client starting with that letter
3. **Add refs** -- individual refs or a single container ref with `scrollIntoView` targeting the first client of each letter group
4. **Render the A-Z strip** as a vertical flex column of buttons positioned absolutely on the right side of the ScrollArea
5. **Letter tap handler** -- finds the first client for that letter and scrolls to it using `scrollIntoView({ behavior: 'smooth', block: 'start' })`
6. **Active letter tracking** (optional, lightweight) -- use an IntersectionObserver or simply derive from scroll position which letter section is currently visible

### Component structure

```
<div className="flex-1 relative">  {/* wrapper */}
  <ScrollArea ref={scrollRef}>
    {/* existing client list, now sorted */}
    {/* letter group anchors: <div id="letter-A" /> before first A client */}
  </ScrollArea>
  <AlphabetStrip
    availableLetters={availableLetters}
    activeLetter={activeLetter}
    onLetterClick={scrollToLetter}
  />
</div>
```

### AlphabetStrip sub-component (inline in ClientStep.tsx)

- Renders A-Z as a vertical column
- Each letter is a small button
- `availableLetters: Set<string>` controls which are tappable vs dimmed
- `onLetterClick(letter)` triggers the scroll

## File Summary

| Action | File |
|--------|------|
| Modify | `src/components/dashboard/schedule/booking/ClientStep.tsx` -- add alphabet strip, sort clients, scroll-to-letter logic |

No database changes. No new dependencies. Single file modification.

