import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import {
  TrendingDown,
  CheckCircle2,
  Clock,
  Users,
  ChevronDown,
  ChevronRight,
  PieChart as PieChartIcon,
  CheckCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { buildCsvString } from "@/utils/csvExport";

const OUTREACH_COOLDOWN_DAYS = 7;
const OUTREACH_COOLDOWN_MS = OUTREACH_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
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

type RangeKey = "7d" | "30d" | "90d" | "all";
type SourceKey =
  | "all"
  | "organic"
  | "invited"
  | "migrated"
  | "backfilled"
  | "imported"
  | "legacy";

const RANGE_OPTIONS: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
  { key: "all", label: "All time", days: null },
];

const SOURCE_OPTIONS: { key: SourceKey; label: string }[] = [
  { key: "all", label: "All sources" },
  { key: "organic", label: "Organic" },
  { key: "invited", label: "Invited" },
  { key: "migrated", label: "Migrated" },
  { key: "backfilled", label: "Backfilled" },
  { key: "imported", label: "Imported" },
  { key: "legacy", label: "Legacy (pre-source)" },
];

interface DroppedOrg {
  id: string;
  lastActivityMs: number;
  contacted: boolean;
  lastContactedMs: number | null;
}

interface FunnelRow {
  step_number: number;
  viewed: number;
  completed: number;
  skipped: number;
  /** Orgs that viewed this step but never completed it (drop-offs), sorted hottest-first */
  droppedOrgs: DroppedOrg[];
  /** Weekly drop-off counts (oldest → newest) for sparkline */
  weeklyDrops: number[];
}

/**
 * Platform Setup Funnel — read-only operator funnel built from
 * org_setup_step_events + org_setup_commit_log. Exposes drop-off,
 * completion rate, and time-to-commit so platform ops can spot
 * which step is the bottleneck.
 *
 * Wave 7: cohort-by-acquisition-source axis. `legacy` = orgs created
 * before signup_source was tracked (NULL).
 */
export default function SetupFunnel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [range, setRange] = useState<RangeKey>("30d");
  const [source, setSource] = useState<SourceKey>("all");
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const sinceIso = useMemo(() => {
    const opt = RANGE_OPTIONS.find((r) => r.key === range);
    if (!opt?.days) return null;
    return new Date(Date.now() - opt.days * 24 * 60 * 60 * 1000).toISOString();
  }, [range]);

  const { data, isLoading } = useQuery({
    queryKey: ["platform-setup-funnel", range, source],
    queryFn: async () => {
      // Step 1: resolve the org cohort by signup_source
      let orgCohort: Set<string> | null = null;
      if (source !== "all") {
        const orgsQuery = supabase.from("organizations").select("id");
        if (source === "legacy") {
          orgsQuery.is("signup_source", null);
        } else {
          orgsQuery.eq("signup_source", source);
        }
        const { data: cohortOrgs } = await orgsQuery.limit(5000);
        orgCohort = new Set(
          ((cohortOrgs ?? []) as { id: string }[]).map((o) => o.id),
        );
      }

      const eventsQuery = supabase
        .from("org_setup_step_events")
        .select("step_number, step_key, event, organization_id, occurred_at")
        .order("occurred_at", { ascending: true })
        .limit(10000);
      const commitsQuery = supabase
        .from("org_setup_commit_log")
        .select("organization_id, status, attempted_at, system")
        .order("attempted_at", { ascending: true })
        .limit(10000);

      if (sinceIso) {
        eventsQuery.gte("occurred_at", sinceIso);
        commitsQuery.gte("attempted_at", sinceIso);
      }
      if (orgCohort && orgCohort.size > 0) {
        const ids = Array.from(orgCohort);
        eventsQuery.in("organization_id", ids);
        commitsQuery.in("organization_id", ids);
      } else if (orgCohort) {
        // Cohort selected but empty → return empty result
        return {
          events: [],
          commits: [],
          orgNames: new Map<string, string>(),
          orgSources: new Map<string, string>(),
        };
      }

      const [{ data: events }, { data: commits }] = await Promise.all([
        eventsQuery,
        commitsQuery,
      ]);

      // Fetch org names + sources for the affected set in one shot
      const orgIds = new Set<string>();
      for (const e of (events ?? []) as any[]) orgIds.add(e.organization_id);
      for (const c of (commits ?? []) as any[]) orgIds.add(c.organization_id);

      const { data: orgs } = orgIds.size
        ? await supabase
            .from("organizations")
            .select("id, name, signup_source")
            .in("id", Array.from(orgIds))
        : { data: [] as { id: string; name: string; signup_source: string | null }[] };

      const orgsArr = (orgs ?? []) as {
        id: string;
        name: string;
        signup_source: string | null;
      }[];

      return {
        events: ((events ?? []) as unknown) as Array<{
          step_number: number | null;
          step_key: string;
          event: string;
          organization_id: string;
          occurred_at: string;
        }>,
        commits: ((commits ?? []) as unknown) as Array<{
          organization_id: string;
          status: string;
          attempted_at: string;
          system: string;
        }>,
        orgNames: new Map(orgsArr.map((o) => [o.id, o.name])),
        orgSources: new Map(
          orgsArr.map((o) => [o.id, o.signup_source ?? "legacy"]),
        ),
      };
    },
    staleTime: 60_000,
  });

  // Per-org last activity (max of any event timestamp). Used to weight
  // dropped orgs hottest-first so platform ops triage warm leads.
  const lastActivityByOrg = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of data?.events ?? []) {
      const t = new Date(e.occurred_at).getTime();
      const prev = m.get(e.organization_id) ?? 0;
      if (t > prev) m.set(e.organization_id, t);
    }
    for (const c of data?.commits ?? []) {
      const t = new Date(c.attempted_at).getTime();
      const prev = m.get(c.organization_id) ?? 0;
      if (t > prev) m.set(c.organization_id, t);
    }
    return m;
  }, [data?.events, data?.commits]);

  const funnel: FunnelRow[] = useMemo(() => {
    if (!data?.events) return [];
    const map = new Map<
      number,
      Omit<FunnelRow, "droppedOrgs"> & {
        viewedOrgs: Set<string>;
        completedOrgs: Set<string>;
      }
    >();
    for (const ev of data.events) {
      const stepNum = ev.step_number ?? -1;
      if (stepNum < 0) continue;
      const row =
        map.get(stepNum) ?? {
          step_number: stepNum,
          viewed: 0,
          completed: 0,
          skipped: 0,
          viewedOrgs: new Set<string>(),
          completedOrgs: new Set<string>(),
        };
      if (ev.event === "viewed") {
        row.viewed += 1;
        row.viewedOrgs.add(ev.organization_id);
      }
      if (ev.event === "completed") {
        row.completed += 1;
        row.completedOrgs.add(ev.organization_id);
      }
      if (ev.event === "skipped") row.skipped += 1;
      map.set(stepNum, row);
    }
    return Array.from(map.values())
      .sort((a, b) => a.step_number - b.step_number)
      .map((r) => ({
        step_number: r.step_number,
        viewed: r.viewed,
        completed: r.completed,
        skipped: r.skipped,
        droppedOrgs: Array.from(r.viewedOrgs)
          .filter((id) => !r.completedOrgs.has(id))
          .map((id) => ({
            id,
            lastActivityMs: lastActivityByOrg.get(id) ?? 0,
          }))
          // Hottest (most recent activity) first — ops triage warm leads
          .sort((a, b) => b.lastActivityMs - a.lastActivityMs),
      }));
  }, [data?.events, lastActivityByOrg]);

  const totals = useMemo(() => {
    const orgs = new Set(data?.events.map((e) => e.organization_id) ?? []);
    const committedOrgs = new Set(
      data?.commits
        .filter((c) => c.status === "completed")
        .map((c) => c.organization_id) ?? [],
    );
    const firstView = new Map<string, number>();
    const lastCommit = new Map<string, number>();
    for (const e of data?.events ?? []) {
      if (e.event === "viewed" && !firstView.has(e.organization_id)) {
        firstView.set(e.organization_id, new Date(e.occurred_at).getTime());
      }
    }
    for (const c of data?.commits ?? []) {
      lastCommit.set(c.organization_id, new Date(c.attempted_at).getTime());
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
        <div className="mb-8 flex items-start justify-between gap-6 flex-wrap">
          <div>
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

          <div className="flex flex-col sm:flex-row items-end gap-2">
            {/* Cohort range filter */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setRange(opt.key);
                    setExpandedStep(null);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-md font-sans text-xs transition-colors",
                    range === opt.key
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Acquisition source filter */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 flex-wrap">
              {SOURCE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setSource(opt.key);
                    setExpandedStep(null);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-md font-sans text-xs transition-colors",
                    source === opt.key
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
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
                    Click a step to see which orgs dropped off there.
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
                  No telemetry for this cohort and window yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {funnel.map((row) => {
                  const completionRate =
                    row.viewed > 0 ? (row.completed / row.viewed) * 100 : 0;
                  const widthPct = (row.viewed / peakViewed) * 100;
                  const isExpanded = expandedStep === row.step_number;
                  const hasDrops = row.droppedOrgs.length > 0;
                  return (
                    <div
                      key={row.step_number}
                      className="rounded-lg border border-border/60 bg-background"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedStep(isExpanded ? null : row.step_number)
                        }
                        className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors rounded-lg"
                      >
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <div className="flex items-center gap-3 min-w-0">
                            {hasDrops ? (
                              isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              )
                            ) : (
                              <span className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <div className="font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 w-12 shrink-0">
                              Step {row.step_number}
                            </div>
                            <div className="font-sans text-sm font-medium text-foreground">
                              {STEP_LABELS[row.step_number] ??
                                `Step ${row.step_number}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <Stat label="Views" value={row.viewed} />
                            <Stat label="Completed" value={row.completed} />
                            <Stat label="Skipped" value={row.skipped} />
                            <Stat
                              label="Dropped"
                              value={row.droppedOrgs.length}
                            />
                            <div className="text-right w-16">
                              <div className="font-sans text-xs text-muted-foreground">
                                Rate
                              </div>
                              <div className="font-display text-sm tracking-wide tabular-nums">
                                {completionRate.toFixed(0)}%
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden ml-7">
                          <div
                            className="h-full bg-foreground transition-all"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </button>

                      {/* Drill-down: orgs that dropped off here */}
                      {isExpanded && hasDrops && (
                        <div className="px-4 pb-4 pt-2 border-t border-border/60 mt-2">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                              Dropped at this step ({row.droppedOrgs.length}) — hottest first
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadDroppedCsv(
                                  row.step_number,
                                  STEP_LABELS[row.step_number] ?? `step_${row.step_number}`,
                                  row.droppedOrgs,
                                  data?.orgNames ?? new Map(),
                                  data?.orgSources ?? new Map(),
                                );
                              }}
                              className="font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border/60 hover:border-border"
                            >
                              Export CSV
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                            {row.droppedOrgs.slice(0, 60).map((d) => {
                              const src = data?.orgSources.get(d.id) ?? "legacy";
                              const recency = formatRecency(d.lastActivityMs);
                              return (
                                <div
                                  key={d.id}
                                  className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5"
                                  title={`${d.id}\nLast activity: ${recency}`}
                                >
                                  <span className="font-sans text-xs text-foreground truncate flex-1">
                                    {data?.orgNames.get(d.id) ?? d.id.slice(0, 8)}
                                  </span>
                                  <span className="font-sans text-[10px] text-muted-foreground tabular-nums shrink-0">
                                    {recency}
                                  </span>
                                  <SourceBadge source={src} />
                                </div>
                              );
                            })}
                          </div>
                          {row.droppedOrgs.length > 60 && (
                            <p className="font-sans text-xs text-muted-foreground mt-2">
                              + {row.droppedOrgs.length - 60} more (full list in CSV)
                            </p>
                          )}
                        </div>
                      )}
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right">
      <div className="font-sans text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-sm tracking-wide tabular-nums">
        {value}
      </div>
    </div>
  );
}

const SOURCE_BADGE_STYLES: Record<string, string> = {
  organic: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  invited: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  migrated: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  backfilled: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  imported: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  legacy: "bg-muted text-muted-foreground border-border",
};

function SourceBadge({ source }: { source: string }) {
  const style = SOURCE_BADGE_STYLES[source] ?? SOURCE_BADGE_STYLES.legacy;
  return (
    <span
      className={cn(
        "shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 font-display text-[9px] uppercase tracking-[0.15em]",
        style,
      )}
    >
      {source}
    </span>
  );
}

function formatRecency(ms: number): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

function downloadDroppedCsv(
  stepNumber: number,
  stepLabel: string,
  rows: DroppedOrg[],
  names: Map<string, string>,
  sources: Map<string, string>,
) {
  const header = [
    "organization_id",
    "organization_name",
    "signup_source",
    "last_activity_iso",
    "days_since_activity",
  ];
  const csv = [header.join(",")]
    .concat(
      rows.map((r) => {
        const name = (names.get(r.id) ?? "").replace(/"/g, '""');
        const src = sources.get(r.id) ?? "legacy";
        const iso = r.lastActivityMs
          ? new Date(r.lastActivityMs).toISOString()
          : "";
        const days = r.lastActivityMs
          ? Math.floor((Date.now() - r.lastActivityMs) / 86_400_000).toString()
          : "";
        return [r.id, `"${name}"`, src, iso, days].join(",");
      }),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `setup-funnel-step${stepNumber}-${stepLabel.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
