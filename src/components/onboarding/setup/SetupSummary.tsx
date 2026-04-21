import { useMemo } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OperatorProfileSentence } from "./OperatorProfileSentence";
import { ConflictBanner } from "./ConflictBanner";
import { detectConflicts, useConflictRules } from "@/hooks/onboarding/useConflictRules";
import type { StepRegistryEntry } from "./types";

interface SetupSummaryProps {
  orgId: string;
  draftData: Record<string, any>;
  steps: StepRegistryEntry[];
  onEditStep: (stepKey: string) => void;
  onCommit: () => void;
  committing: boolean;
}

const CHECKLIST_PREVIEW = [
  "Invite your first staff member",
  "Connect your payment processor",
  "Import or build your service menu",
  "Set commission rates per stylist",
  "Review and publish your operating standards",
];

/**
 * SetupSummary — final review before commit.
 * Surfaces the operator profile sentence, full-sweep conflict scan,
 * edit-jump-back per step, and a checklist preview.
 */
export function SetupSummary({
  draftData,
  steps,
  onEditStep,
  onCommit,
  committing,
}: SetupSummaryProps) {
  const { data: rules = [] } = useConflictRules();
  const allConflicts = useMemo(
    () => (rules.length ? detectConflicts(rules, draftData) : []),
    [rules, draftData],
  );
  const blocking = allConflicts.some((c) => c.severity === "block");

  // Wave 13A.B6 / 13G.C — a step is "completed" only if the user actually
  // touched it (or it was backfilled from existing data). Default-on-mount
  // payloads no longer count, so the operator can't blow past Steps 2–6
  // with mount defaults and commit an empty configuration.
  const isPopulated = (val: unknown) => {
    if (!val || typeof val !== "object") return false;
    const obj = val as Record<string, unknown>;
    if (obj.__skipped__ === true) return false;
    // Backfilled steps stay populated (legacy-org flow).
    if (obj.backfilled === true) return true;
    // Otherwise require explicit touch.
    if (obj.__touched !== true) return false;
    return Object.keys(obj).filter(
      (k) => k !== "backfilled" && k !== "__skipped__" && k !== "__touched",
    ).length > 0;
  };
  const completedSteps = steps.filter((s) => isPopulated(draftData[s.key]));
  const requiredSteps = steps.filter((s) => s.required);
  const completedRequired = requiredSteps.filter((s) => isPopulated(draftData[s.key]));
  const missingRequired = requiredSteps.length - completedRequired.length;
  const canCommit = missingRequired === 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-3xl space-y-8">
        <div className="space-y-3">
          <div className="font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
            Final review
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-wide">
            This is what we're about to build for you.
          </h1>
          <p className="font-sans text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Review your answers below. Edit anything that doesn't match how you
            actually operate. When you're ready, we'll provision your operating
            system.
          </p>
        </div>

        <OperatorProfileSentence draftData={draftData} />

        {allConflicts.length > 0 && (
          <div className="space-y-3">
            <div className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">
              Things to know
            </div>
            {allConflicts.map((c) => (
              <ConflictBanner
                key={c.rule_key}
                conflict={c}
                onJumpToStep={onEditStep}
              />
            ))}
          </div>
        )}

        <div className="space-y-3">
          <div className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">
            Your answers
          </div>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {completedSteps.map((step) => (
              <button
                key={step.key}
                type="button"
                onClick={() => onEditStep(step.key)}
                className="w-full flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                  <div className="font-sans text-sm text-foreground truncate">
                    {step.title.replace("{{PLATFORM_NAME}}", "Zura")}
                  </div>
                </div>
                <span className="font-sans text-xs text-muted-foreground shrink-0">
                  Edit
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">
            What happens next
          </div>
          <div className="rounded-xl border border-border bg-muted/20 px-5 py-4 space-y-2">
            <p className="font-sans text-sm text-foreground">
              Once you commit, we'll configure your operating system and queue
              these as your first guided tasks:
            </p>
            <ul className="space-y-1.5 pt-2">
              {CHECKLIST_PREVIEW.map((task, i) => (
                <li
                  key={i}
                  className="font-sans text-sm text-muted-foreground flex items-start gap-2.5"
                >
                  <span className="font-display text-[10px] text-muted-foreground/60 mt-1 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{task}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          <p className="font-sans text-xs text-muted-foreground max-w-sm">
            {canCommit
              ? "Everything is editable from settings. This commits your initial architecture — nothing is locked."
              : `Finish ${missingRequired} required ${missingRequired === 1 ? "step" : "steps"} before committing. Click any step above to complete it.`}
          </p>
          <Button
            type="button"
            onClick={onCommit}
            disabled={committing || blocking || !canCommit}
            className={cn("min-w-[180px] gap-2", (blocking || !canCommit) && "opacity-50")}
          >
            {committing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Provisioning
              </>
            ) : (
              <>Build my operating system</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
