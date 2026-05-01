// Lint fixture: must NOT trigger the hero rotating-word parity selector.
// Importing and rendering <HeroRotatingWord /> is the canonical pattern.

function HeroRotatingWord(_props: { show: boolean; words: string[]; index: number }) {
  return null;
}

export function HeroVariantAllowed({ words, index }: { words: string[]; index: number }) {
  return (
    <div>
      <HeroRotatingWord show={true} words={words} index={index} />
    </div>
  );
}
