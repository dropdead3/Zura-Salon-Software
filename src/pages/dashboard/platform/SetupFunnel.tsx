import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { TrendingDown, CheckCircle2, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

const STEP_LABELS: Record<number, string> = {
  0: "Fit check",
  1: "Identity",
  2: "Footprint",
  3: "Team",
  4: "Compensation",
  5: "Catalog",
  6: "Standards",
  7: "Intent",
  8: "Apps",
};

interface FunnelRow {
  step_number: number;
  viewed: number;
  completed: number;
  skipped: number;
}

/**
 * Platform Setup Funnel — read-only operator funnel built from
 * org_setup_step_events + org_setup_commit_log. Exposes drop-off,
 * completion rate, and time-to-commit so platform ops can spot
 * which step is the bottleneck.
 */
export default function SetupFunnel() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform-setup-funnel"],
    queryFn: async () => {
      const [{ data: events }, { data: commits }] = await Promise.all([
        supabase
          .from("org_setup_step_events" as any)
          .select("step_number, event, organization_id, created_at")
          .order("created_at", { ascending: true })
          .limit(10000),
        supabase
          .from("org_setup_commit_log" as any)
          .select("org_id, status, attempted_at")
          .order("attempted_at", { ascending: true })
          .limit(10000),
      ]);
      return {
        events: ((events ?? []) as unknown) as Array<{
          step_number: number;
          event: string;
          organization_id: string;
          created_at: string;
        }>,
        commits: ((commits ?? []) as unknown) as Array<{
          org_id: string;
          status: string;
          attempted_at: string;
        }>,
      };
    },
    staleTime: 60_000,
  });

  const funnel: FunnelRow[] = useMemo(() => {
    if (!data?.events) return [];
    const map = new Map<number, FunnelRow>();
    for (const ev of data.events) {
      const row =
        map.get(ev.step_number) ?? {
          step_number: ev.step_number,
          viewed: 0,
          completed: 0,
          skipped: 0,
        };
      if (ev.event === "viewed") row.viewed += 1;
      if (ev.event === "completed") row.completed += 1;
      if (ev.event === "skipped") row.skipped += 1;
      map.set(ev.step_number, row);
    }
    return Array.from(map.values()).sort((a, b) => a.step_number - b.step_number);
  }, [data?.events]);

  const totals = useMemo(() => {
    const orgs = new Set(data?.events.map((e) => e.organization_id) ?? []);
    const committedOrgs = new Set(
      data?.commits.filter((c) => c.status === "completed").map((c) => c.org_id) ??
        [],
    );
    const firstView = new Map<string, number>();
    const lastCommit = new Map<string, number>();
    for (const e of data?.events ?? []) {
      if (e.event === "viewed" && !firstView.has(e.organization_id)) {
        firstView.set(e.organization_id, new Date(e.created_at).getTime());
      }
    }
    for (const c of data?.commits ?? []) {
      lastCommit.set(c.org_id, new Date(c.attempted_at).getTime());
    }
    const durations: number[] = [];
    for (const [orgId, start] of firstView) {
      const end = lastCommit.get(orgId);
      if (end && end > start) durations.push(end - start);
    }
    const avgMs =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

    return {
      startedOrgs: orgs.size,
      committedOrgs: committedOrgs.size,
      completionRate:
        orgs.size > 0 ? (committedOrgs.size / orgs.size) * 100 : 0,
      avgTimeMinutes: avgMs > 0 ? avgMs / 60_000 : 0,
    };
  }, [data]);

  const peakViewed = Math.max(1, ...funnel.map((f) => f.viewed));

  return (
    <>
      <Helmet>
        <title>Setup Funnel — Platform</title>
      </Helmet>
      <div className={cn(tokens.layout.pageContainer, "max-w-[1600px] mx-auto")}>
        <div className="mb-8">
          <div className="font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
            Platform analytics
          </div>
          <h1 className="font-display text-2xl sm:text-3xl tracking-wide font-medium mt-2">
            Setup funnel
          </h1>
          <p className="font-sans text-sm text-muted-foreground mt-2 max-w-2xl">
            Where operators drop off, how often they finish, and how long it
            takes. Sourced from setup telemetry and commit log.
          </p>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatTile
            icon={<Users className="w-5 h-5 text-primary" />}
            label="Orgs started"
            value={isLoading ? null : totals.startedOrgs.toString()}
          />
          <StatTile
            icon={<CheckCircle2 className="w-5 h-5 text-primary" />}
            label="Orgs committed"
            value={isLoading ? null : totals.committedOrgs.toString()}
          />
          <StatTile
            icon={<TrendingDown className="w-5 h-5 text-primary" />}
            label="Completion rate"
            value={
              isLoading ? null : `${totals.completionRate.toFixed(1)}%`
            }
          />
          <StatTile
            icon={<Clock className="w-5 h-5 text-primary" />}
            label="Avg time to commit"
            value={
              isLoading
                ? null
                : totals.avgTimeMinutes > 0
                  ? `${totals.avgTimeMinutes.toFixed(1)} min`
                  : "—"
            }
          />
        </div>

        {/* Funnel */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className={tokens.card.title}>
                    Step-by-step drop-off
                  </CardTitle>
                  <CardDescription>
                    Views, completions, and skips per step.
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : funnel.length === 0 ? (
              <div className={tokens.empty.container}>
                <TrendingDown className={tokens.empty.icon} />
                <h3 className={tokens.empty.heading}>No funnel data yet</h3>
                <p className={tokens.empty.description}>
                  Once orgs start the wizard, telemetry will populate here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {funnel.map((row) => {
                  const completionRate =
                    row.viewed > 0 ? (row.completed / row.viewed) * 100 : 0;
                  const widthPct = (row.viewed / peakViewed) * 100;
                  return (
                    <div
                      key={row.step_number}
                      className="rounded-lg border border-border/60 bg-background px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 w-12 shrink-0">
                            Step {row.step_number}
                          </div>
                          <div className="font-sans text-sm font-medium text-foreground">
                            {STEP_LABELS[row.step_number] ??
                              `Step ${row.step_number}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <div className="font-sans text-xs text-muted-foreground">
                              Views
                            </div>
                            <div className="font-display text-sm tracking-wide tabular-nums">
                              {row.viewed}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-sans text-xs text-muted-foreground">
                              Completed
                            </div>
                            <div className="font-display text-sm tracking-wide tabular-nums">
                              {row.completed}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-sans text-xs text-muted-foreground">
                              Skipped
                            </div>
                            <div className="font-display text-sm tracking-wide tabular-nums">
                              {row.skipped}
                            </div>
                          </div>
                          <div className="text-right w-16">
                            <div className="font-sans text-xs text-muted-foreground">
                              Rate
                            </div>
                            <div
                              className={cn(
                                "font-display text-sm tracking-wide tabular-nums",
                                completionRate < 60
                                  ? "text-foreground"
                                  : "text-foreground",
                              )}
                            >
                              {completionRate.toFixed(0)}%
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-foreground transition-all"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <Card className="relative">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className={tokens.kpi.label}>{label}</div>
            {value === null ? (
              <Skeleton className="h-7 w-20 mt-2" />
            ) : (
              <div className={cn(tokens.kpi.value, "mt-1")}>{value}</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
