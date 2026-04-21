/**
 * OperatorProfileSentence — generates a single declarative sentence describing
 * the operator based on their wizard answers. Anchor moment for the summary
 * screen. Reflective, not celebratory.
 */
interface Props {
  draftData: Record<string, any>;
}

const STATE_HINT: Record<string, string> = {
  CA: "California",
  NY: "New York",
  TX: "Texas",
  FL: "Florida",
  IL: "Illinois",
  WA: "Washington",
  AZ: "Arizona",
  CO: "Colorado",
  GA: "Georgia",
  MA: "Massachusetts",
};

const COMP_LABEL: Record<string, string> = {
  commission_flat: "flat-commission",
  level_based: "level-based",
  hourly: "hourly",
  hourly_plus_commission: "hourly-plus-commission",
  hourly_vs_commission: "guaranteed-base",
  salary: "salaried",
  booth_rental: "booth-rental",
  team_based: "team-based",
  service_pricing_split: "service-tiered",
  mixed: "mixed-model",
};

const TEAM_LABEL: Record<string, string> = {
  solo: "solo operator",
  small: "small team",
  medium: "growing team",
  large: "large team",
  enterprise: "enterprise team",
};

export function OperatorProfileSentence({ draftData }: Props) {
  const identity = draftData.step_1_identity ?? {};
  const footprint = draftData.step_2_footprint ?? {};
  const team = draftData.step_3_team ?? {};
  const comp = draftData.step_4_compensation ?? {};

  const locationCount = footprint.location_count ?? footprint.locations?.length ?? 1;
  const teamLabel = TEAM_LABEL[team.team_size_band] ?? "team";
  const models: string[] = comp.models ?? [];
  const compLabel =
    models.length === 0
      ? "to-be-defined compensation"
      : models.length === 1
        ? `${COMP_LABEL[models[0]] ?? "custom"} compensation`
        : "mixed compensation";

  const states: string[] = footprint.operating_states ?? [];
  const stateLabel =
    states.length === 0
      ? null
      : states.length === 1
        ? STATE_HINT[states[0]] ?? states[0]
        : `${states.length} states`;

  const businessName = identity.business_name?.trim() || "your business";

  return (
    <div className="rounded-xl border border-border bg-muted/20 px-6 py-5">
      <div className="font-display text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-3">
        Operator profile
      </div>
      <p className="font-sans text-base text-foreground leading-relaxed">
        You run{" "}
        <span className="font-medium">
          {businessName}
        </span>
        , a{" "}
        <span className="font-medium">
          {locationCount}-location, {teamLabel.replace(/^a /, "")}, {compLabel}
        </span>{" "}
        operation
        {stateLabel && (
          <>
            {" "}in <span className="font-medium">{stateLabel}</span>
          </>
        )}
        .
      </p>
    </div>
  );
}
