/**
 * OperatorProfileSentence — generates a single declarative sentence describing
 * the operator based on their wizard answers. Anchor moment for the summary
 * screen. Reflective, not celebratory.
 *
 * Wave 13G.E — silent until structural Steps 1–4 are populated. A half-formed
 * sentence on the summary screen reads as an indictment; the placeholder
 * honors silence-as-valid-output instead.
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
  "1-3": "solo or very small team",
  "4-10": "small team",
  "11-25": "mid-size team",
  "26+": "enterprise team",
};

const STRUCTURAL_KEYS = [
  "step_1_identity",
  "step_2_footprint",
  "step_3_team",
  "step_4_compensation",
] as const;

/** Mirror SetupSummary.isPopulated semantics: touched OR backfilled, not skipped. */
function isPopulated(val: unknown): boolean {
  if (!val || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  if (obj.__skipped__ === true) return false;
  if (obj.backfilled === true) return true;
  return obj.__touched === true;
}

export function OperatorProfileSentence({ draftData }: Props) {
  const allStructuralPopulated = STRUCTURAL_KEYS.every((k) => isPopulated(draftData[k]));

  if (!allStructuralPopulated) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 px-6 py-5">
        <div className="font-display text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-3">
          Operator profile
        </div>
        <p className="font-sans text-sm text-muted-foreground italic leading-relaxed">
          Your operator profile will appear here once you complete the structural steps.
        </p>
      </div>
    );
  }

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
