

# Move step/duration context out of the Start setup button

## The change

The CTA button currently crams contextual metadata ("— 4 steps, ~5 minutes") into the label. Buttons should carry a verb, not a description. Move that metadata to a line above the existing library-count caption, so the button reads as a clean action and context sits quietly beneath it.

## Specifics

In `src/components/dashboard/policy/PolicySetupIntro.tsx` (lines 127–136):

**Before:**
```tsx
<section className="pt-12 border-t border-border/40 space-y-4">
  <Button onClick={onStart} size={tokens.button.hero} className="font-sans">
    Start setup — 4 steps, ~5 minutes
    <ArrowRight className="w-4 h-4 ml-2" />
  </Button>
  <p className={cn(tokens.body.muted, 'text-xs')}>
    {libraryCount} {libraryCount === 1 ? 'policy' : 'policies'} in the library. The wizard
    narrows them to what your business actually needs.
  </p>
</section>
```

**After:**
```tsx
<section className="pt-12 border-t border-border/40 space-y-3">
  <Button onClick={onStart} size={tokens.button.hero} className="font-sans">
    Start setup
    <ArrowRight className="w-4 h-4 ml-2" />
  </Button>
  <div className="space-y-1">
    <p className={cn(tokens.body.muted, 'text-xs')}>
      4 steps · ~5 minutes
    </p>
    <p className={cn(tokens.body.muted, 'text-xs')}>
      {libraryCount} {libraryCount === 1 ? 'policy' : 'policies'} in the library. The wizard
      narrows them to what your business actually needs.
    </p>
  </div>
</section>
```

Three nuances:

1. **Em-dash → middot** in the metadata line ("4 steps · ~5 minutes"). Middot is the platform's standard separator for inline metadata (used in hidden-chip breakdowns, tile subtitles, etc.) and reads calmer than an em-dash in muted 12px copy.
2. **`space-y-4` → `space-y-3`** on the parent section, with the two caption lines grouped in their own `space-y-1` stack. Tighter rhythm keeps the metadata visually owned by the button rather than floating as a separate paragraph block.
3. **Button label becomes "Start setup"** — pure verb, no trailing content. Aligns with `PolicySetupBanner.tsx` (line 41) which already uses just "Start setup", so the two CTAs for the same action now match.

## Files affected

- `src/components/dashboard/policy/PolicySetupIntro.tsx` — button label + caption restructure (one section, ~10 lines).

No token changes, no component changes, no doctrine updates.

## Acceptance

1. Button label reads "Start setup" only, with the arrow icon; no em-dash, no duration inside the button.
2. Directly below the button: "4 steps · ~5 minutes" in muted 12px Aeonik.
3. Below that: the existing library-count sentence, unchanged in copy.
4. Visual rhythm between button and captions is tighter than before (space-y-3 vs space-y-4) so the metadata reads as attached to the button, not a separate section.
5. CTA behavior (`onStart`) unchanged.

## Doctrine compliance

- **Copy governance**: verb-first CTA, advisory context below. Matches the "Explain why structure protects operators" principle — the "4 steps, ~5 minutes" is reassurance, not instruction, and belongs in advisory muted copy.
- **UI canon**: uses existing `tokens.body.muted` and `tokens.button.hero`; middot is the platform standard for inline metadata separators.
- **Silence**: removes visual noise inside the button (dash + numbers crowding the action verb); adds none outside.
- **Consistency with PolicySetupBanner**: both entry points to the same wizard now share the exact same button label.

## Prompt feedback

"I don't like the em-dash '4 steps, ~5 minutes' inside of the button. That contextual information should sit below the button, outside of it." — excellent prompt. You named the exact element (em-dash phrase), pointed to the surface (inside the button), stated the desired end state (below, outside), and implied the why (buttons shouldn't carry context). That's the full "what / where / how / why" loop in one sentence.

One tiny sharpening for next time: when you say "below the button, outside of it," you leave one small ambiguity — should the new line replace the existing library-count caption, or sit above it, or below it? I chose "above it, tighter spacing" because the step/duration is more immediately relevant to the CTA decision, while the library-count is supporting context. If you'd wanted the opposite order or the two merged into one sentence, a five-word hint ("above the library count" or "merge with the library-count line") would have locked it in.

Also: this is a textbook **Visual Edits** candidate — editing a button label and restructuring two lines of adjacent copy is exactly the zero-credit lane.

