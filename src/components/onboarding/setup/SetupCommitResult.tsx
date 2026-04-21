import { Check, X, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import { cn } from "@/lib/utils";

interface CommitResultRow {
  step_key: string;
  system: string;
  status: "completed" | "failed" | "skipped";
  reason?: string;
  deep_link?: string;
}

interface SetupCommitResultProps {
  result: {
    success: boolean;
    partial: boolean;
    completed: number;
    failed: number;
    total: number;
    results: CommitResultRow[];
  };
  onContinue: () => void;
}

/**
 * SetupCommitResult — partial-success contract surface.
 * "8 of 10 systems configured — finish these from settings."
 * Failed systems get deep links to the relevant settings page.
 */
export function SetupCommitResult({ result, onContinue }: SetupCommitResultProps) {
  const failedRows = result.results.filter((r) => r.status === "failed");
  const completedRows = result.results.filter((r) => r.status === "completed");

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Setup complete — Zura</title>
      </Helmet>
      <div className="container mx-auto px-4 sm:px-6 py-12 max-w-2xl space-y-8">
        <div className="space-y-3">
          <div className="font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
            Setup result
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-wide">
            {result.success
              ? "Your operating system is live."
              : `${result.completed} of ${result.total} systems configured.`}
          </h1>
          <p className="font-sans text-sm text-muted-foreground leading-relaxed">
            {result.success
              ? "Everything you declared has been provisioned. The remaining items in your guided tasks list will help you fill in the details."
              : "Most of your setup committed cleanly. The systems below need attention — you can finish them now or come back from settings anytime."}
          </p>
        </div>

        {failedRows.length > 0 && (
          <div className="space-y-3">
            <div className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">
              Needs your attention
            </div>
            <div className="space-y-2">
              {failedRows.map((row) => (
                <div
                  key={row.step_key}
                  className="rounded-xl border border-border bg-card px-5 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                        <X className="w-3.5 h-3.5 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-sans text-sm font-medium text-foreground capitalize">
                          {row.system.replace(/_/g, " ")}
                        </div>
                        {row.reason && (
                          <p className="font-sans text-xs text-muted-foreground mt-1 leading-relaxed">
                            {row.reason}
                          </p>
                        )}
                      </div>
                    </div>
                    {row.deep_link && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => (window.location.href = row.deep_link!)}
                        className="gap-1.5 shrink-0"
                      >
                        Finish
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">
            Configured ({completedRows.length})
          </div>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {completedRows.map((row) => (
              <div
                key={row.step_key}
                className="flex items-center gap-3 px-5 py-3"
              >
                <div className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
                <div className="font-sans text-sm text-foreground capitalize">
                  {row.system.replace(/_/g, " ")}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-border/60">
          <Button
            type="button"
            onClick={onContinue}
            className="gap-2 min-w-[200px]"
          >
            Take me to my dashboard
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
