// Lint fixture: must NOT trigger the hero scroll-indicator parity selector.
// Importing and rendering <HeroScrollIndicator /> is the canonical pattern.

function HeroScrollIndicator(_props: { show: boolean; onMedia: boolean }) {
  return null;
}

export function HeroVariantAllowed() {
  return (
    <div>
      <HeroScrollIndicator show={true} onMedia={false} />
    </div>
  );
}
