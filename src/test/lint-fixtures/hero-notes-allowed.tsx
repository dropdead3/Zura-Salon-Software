// Lint fixture: must NOT trigger the hero shared-component selector.
// Importing and rendering <HeroNotes /> is the canonical pattern.
//
// We don't actually need the real component to compile — the lint rule
// only inspects the JSX tree for inline `<p>{config.consultation_note_lineN}</p>`
// patterns. As long as we route through a component (no inline <p> here),
// the rule stays silent.

interface FakeConfig {
  consultation_note_line1: string;
  consultation_note_line2: string;
}

function HeroNotes(_props: { config: FakeConfig; contentAlignment: string }) {
  return null;
}

export function HeroVariantAllowed({ config }: { config: FakeConfig }) {
  return (
    <div>
      <HeroNotes config={config} contentAlignment="left" />
    </div>
  );
}
