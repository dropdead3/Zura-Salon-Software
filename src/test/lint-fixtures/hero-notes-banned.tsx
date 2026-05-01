// Lint fixture: must trigger the hero shared-component selector.
// Inline <p>{config.consultation_note_lineN}</p> JSX is forbidden in hero
// files — the canonical owner is <HeroNotes /> from @/components/home/HeroNotes.
//
// This file is intentionally violating the rule. It is excluded from
// `npm run lint` via the top-level `ignores` entry; the smoke test
// `src/test/lint-rule-hero-notes-shared.test.ts` lints it explicitly
// with `ignore: false`.
//
// Note: filename matches the `hero-notes-*.tsx` glob in the hero block's
// `files` array — DO NOT rename without updating eslint.config.js.

interface FakeConfig {
  consultation_note_line1: string;
  consultation_note_line2: string;
}

export function HeroVariantBanned({ config }: { config: FakeConfig }) {
  return (
    <div>
      <p>{config.consultation_note_line1}</p>
      <p>{config.consultation_note_line2}</p>
    </div>
  );
}
