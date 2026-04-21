import { Activity } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { tokens } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { FunnelHealthRow } from "@/hooks/onboarding/useOrgSetupFunnelHealth";

interface StepHealthCardProps {
  rows: FunnelHealthRow[] | undefined;
  isLoading: boolean;
  stepLabels: Record<number, string>;
}

/**
 * Wave 13F.E — Step Health card
 *
 * Read-only governance signal. Surfaces which onboarding step is failing
 * *right now* using materiality-graded thresholds from
 * `useOrgSetupFunnelHealth`. Honors silence-is-valid-output: rows below
 * MIN_SAMPLE render dimmed; cold-start funnels render an empty state
 * rather than zeros pretending to be insights.
 */
export function StepHealthCard({ rows, isLoading, stepLabels }: StepHealthCardProps) {
  const sorted = (rows ?? []).slice().sort((a, b) => a.step_number - b.step_number);

  const materialRows = sorted.filter((r) => r.material);
  const allColdStart = sorted.length > 0 && materialRows.length === 0;

  const counts = sorted.reduce(
    (acc, r) => {
      if (!r.material) {
        acc.dim += 1;
        return acc;
      }
      if (r.drop_off_severity === "alert" || r.blocked_severity === "alert") {
        acc.alert += 1;
      } else if (r.drop_off_severity === "watch" || r.blocked_severity === "watch") {
        acc.watch += 1;
      } else {
        acc.ok += 1;
      }
      return acc;
    },
    { alert: 0, watch: 0, ok: 0, dim: 0 },
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Step health</CardTitle>
              <CardDescription>
                Governance signal. Materiality-graded — silent until thresholds clear.
              </CardDescription>
            </div>
          </div>
          {!isLoading && sorted.length > 0 && (
            <div className="font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 pt-2">
              {allColdStart
                ? "Funnel data warming up"
                : `${counts.alert} alert · ${counts.watch} watch · ${counts.ok} ok${
                    counts.dim > 0 ? ` · ${counts.dim} dim` : ""
                  }`}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className={tokens.empty.container}>
            <Activity className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No funnel telemetry yet</h3>
            <p className={tokens.empty.description}>
              Step health appears once operators begin the setup wizard.
            </p>
          </div>
        ) : allColdStart ? (
          <div className={tokens.empty.container}>
            <Activity className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>Funnel data warming up</h3>
            <p className={tokens.empty.description}>
              Need ≥5 viewers per step before grading. Suppressing severity to avoid false positives.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className={cn(tokens.table.columnHeader, "text-left py-2 pr-4 w-12")}>Step</th>
                  <th className={cn(tokens.table.columnHeader, "text-left py-2 pr-4")}>Name</th>
                  <th className={cn(tokens.table.columnHeader, "text-right py-2 pr-4 w-20")}>Sample</th>
                  <th className={cn(tokens.table.columnHeader, "text-right py-2 pr-4 w-28")}>Drop-off</th>
                  <th className={cn(tokens.table.columnHeader, "text-right py-2 pr-4 w-32")}>
                    Blocked
                  </th>
                  <th className={cn(tokens.table.columnHeader, "text-right py-2 w-28")}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <StepHealthRow key={r.step_key} row={r} stepLabels={stepLabels} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StepHealthRow({
  row,
  stepLabels,
}: {
  row: FunnelHealthRow;
  stepLabels: Record<number, string>;
}) {
  const dim = !row.material;
  const rowAlert =
    row.material &&
    (row.drop_off_severity === "alert" || row.blocked_severity === "alert");
  const rowWatch =
    row.material &&
    !rowAlert &&
    (row.drop_off_severity === "watch" || row.blocked_severity === "watch");

  return (
    <tr
      className={cn(
        "border-b border-border/30 last:border-0 transition-colors",
        dim && "opacity-50",
      )}
    >
      <td className="py-3 pr-4 font-display text-xs tracking-wider text-muted-foreground">
        {row.step_number}
      </td>
      <td className="py-3 pr-4 font-sans text-sm text-foreground">
        {stepLabels[row.step_number] ?? row.step_key}
      </td>
      <td className="py-3 pr-4 text-right font-sans text-sm tabular-nums text-muted-foreground">
        {row.viewed_count}
      </td>
      <td className="py-3 pr-4 text-right font-sans text-sm tabular-nums">
        <MetricCell
          value={dim ? null : row.drop_off_rate}
          severity={dim ? "ok" : row.drop_off_severity}
        />
      </td>
      <td className="py-3 pr-4 text-right font-sans text-sm tabular-nums">
        <MetricCell
          value={dim ? null : row.blocked_rate}
          severity={dim ? "ok" : row.blocked_severity}
        />
      </td>
      <td className="py-3 text-right">
        <StatusPill dim={dim} alert={rowAlert} watch={rowWatch} />
      </td>
    </tr>
  );
}

function MetricCell({
  value,
  severity,
}: {
  value: number | null;
  severity: "alert" | "watch" | "ok";
}) {
  if (value === null) {
    return <span className="text-muted-foreground/60">—</span>;
  }
  const pct = `${Math.round(value * 100)}%`;
  return (
    <span className="inline-flex items-center justify-end gap-1.5">
      {severity === "alert" && (
        <span className="h-1.5 w-1.5 rounded-full bg-destructive" aria-hidden />
      )}
      {severity === "watch" && (
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
      )}
      <span
        className={cn(
          severity === "alert" && "text-destructive",
          severity === "watch" && "text-amber-600 dark:text-amber-500",
          severity === "ok" && "text-foreground",
        )}
      >
        {pct}
      </span>
    </span>
  );
}

function StatusPill({
  dim,
  alert,
  watch,
}: {
  dim: boolean;
  alert: boolean;
  watch: boolean;
}) {
  if (dim) {
    return (
      <span className="inline-flex items-center rounded-full border border-border/50 bg-muted/40 px-2.5 py-1 font-display text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
        n &lt; 5
      </span>
    );
  }
  if (alert) {
    return (
      <span className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 font-display text-[10px] tracking-[0.14em] uppercase text-destructive">
        Alert
      </span>
    );
  }
  if (watch) {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-display text-[10px] tracking-[0.14em] uppercase text-amber-600 dark:text-amber-500">
        Watch
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-border/50 bg-muted/30 px-2.5 py-1 font-display text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
      OK
    </span>
  );
}
