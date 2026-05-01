// Lint fixture: must NOT trigger the hero eyebrow parity selector.
// Importing and rendering <HeroEyebrow /> is the canonical pattern.

function HeroEyebrow(_props: { show: boolean; text: string }) {
  return null;
}

export function HeroVariantAllowed() {
  return (
    <div>
      <HeroEyebrow show={true} text="LUXURY" />
    </div>
  );
}
