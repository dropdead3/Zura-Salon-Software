// Lint fixture: must trigger the hero eyebrow parity selector.
// Inline <Eyebrow> JSX is forbidden in hero files — the canonical owner
// is <HeroEyebrow /> from @/components/home/HeroEyebrow.
//
// This file is intentionally violating the rule. It is excluded from
// `npm run lint` via the top-level `ignores` entry; the smoke test
// `src/test/lint-rule-hero-eyebrow-shared.test.ts` lints it explicitly
// with `ignore: false`.

function Eyebrow(_props: { className?: string; children?: React.ReactNode }) {
  return null;
}

export function HeroVariantBanned() {
  return (
    <div>
      <Eyebrow className="text-muted-foreground mb-6">SOMETHING</Eyebrow>
    </div>
  );
}
