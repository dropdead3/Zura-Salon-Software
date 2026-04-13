import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { getLevelColor } from '@/lib/level-colors';
import {
  GraduationCap,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  Plus,
  ExternalLink,
  Search,
  Send,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Crown,
  Loader2,
  Settings,
  Calendar,
  FileText,
  History,
} from 'lucide-react';
import {
  useAllAssistantProgress,
  useAllGraduationRequirements,
  useUpdateSubmissionStatus,
  useAddFeedback,
  useCreateRequirement,
  useUpdateRequirement,
  useSubmissionFeedback,
  type AssistantProgress,
  type GraduationSubmission,
  type GraduationFeedback,
} from '@/hooks/useGraduationTracker';
import { useTeamLevelProgress, type TeamMemberProgress, type GraduationStatus } from '@/hooks/useTeamLevelProgress';
import { useStylistLevels, type StylistLevel } from '@/hooks/useStylistLevels';
import { usePromoteLevel } from '@/hooks/usePromoteLevel';
import { useDemoteLevel } from '@/hooks/useDemoteLevel';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useOrgPromotionHistory, type PromotionRecord } from '@/hooks/usePromotionHistory';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import type { CriterionProgress } from '@/hooks/useLevelProgress';

/* ─── KPI Strip ─────────────────────────────────────────── */

function KpiStrip({ counts }: { counts: ReturnType<typeof useTeamLevelProgress>['counts'] }) {
  const kpis = [
    { label: 'Ready to Promote', value: counts.ready, icon: CheckCircle2, color: 'text-emerald-600' },
    { label: 'In Progress', value: counts.inProgress, icon: TrendingUp, color: 'text-primary' },
    { label: 'At Risk', value: counts.atRisk, icon: AlertTriangle, color: 'text-rose-600' },
    { label: 'Below Standard', value: counts.belowStandard, icon: AlertCircle, color: 'text-red-700' },
    { label: 'Needs Attention', value: counts.needsAttention, icon: AlertCircle, color: 'text-amber-600' },
    { label: 'At Top Level', value: counts.atTopLevel, icon: Crown, color: 'text-muted-foreground' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map(kpi => (
        <div key={kpi.label} className={tokens.kpi.tile}>
          <div className="flex items-center gap-2">
            <kpi.icon className={cn('w-4 h-4', kpi.color)} />
            <span className={tokens.kpi.label}>{kpi.label}</span>
          </div>
          <span className={tokens.kpi.value}>{kpi.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Empty State: No Criteria Configured ──────────────── */

function NoCriteriaEmptyState() {
  const { dashPath } = useOrgDashboardPath();

  return (
    <div className={tokens.empty.container}>
      <Settings className={tokens.empty.icon} />
      <h3 className={tokens.empty.heading}>No graduation criteria configured</h3>
      <p className={tokens.empty.description}>
        Set up level promotion criteria in Stylist Levels settings to start tracking team progression.
      </p>
      <div className="mt-5 flex justify-center">
        <Button asChild variant="outline">
          <Link to={dashPath('/admin/stylist-levels')}>
            <Settings className="h-4 w-4 mr-2" />
            Configure Stylist Levels
          </Link>
        </Button>
      </div>
    </div>
  );
}

/* ─── Criterion Row (reused from LevelProgressCard) ───── */

function CriterionRow({ cp }: { cp: CriterionProgress }) {
  const formatValue = (val: number) => {
    if (cp.unit === '/mo' || cp.unit === '$') return `$${val.toLocaleString()}`;
    if (cp.unit === '%') return `${val.toFixed(1)}%`;
    if (cp.unit === 'd') return `${val}d`;
    return String(val);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{cp.label}</span>
        <span className="tabular-nums">
          <span className={cn("text-foreground", cp.percent > 100 && "text-emerald-600 dark:text-emerald-400")}>{formatValue(cp.current)}</span>
          <span className="text-muted-foreground"> / {formatValue(cp.target)}</span>
        </span>
      </div>
      <Progress
        value={Math.min(100, cp.percent)}
        className="h-1.5"
        indicatorClassName={cn(
          cp.percent >= 100 ? 'bg-emerald-500' : cp.percent >= 75 ? 'bg-primary' : 'bg-amber-500'
        )}
      />
      {cp.percent > 100 && (
        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 tabular-nums">
          {Math.round(cp.percent)}% — exceeds target
        </p>
      )}
    </div>
  );
}

/* ─── Status Badge ──────────────────────────────────────── */

function StatusBadge({ status }: { status: GraduationStatus }) {
  const config: Record<GraduationStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
    ready: {
      label: 'Qualified',
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
      icon: CheckCircle2,
    },
    in_progress: {
      label: 'In Progress',
      className: 'bg-primary/10 text-primary border-primary/20',
      icon: TrendingUp,
    },
    needs_attention: {
      label: 'Needs Attention',
      className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
      icon: AlertTriangle,
    },
    at_risk: {
      label: 'At Risk',
      className: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800',
      icon: AlertTriangle,
    },
    below_standard: {
      label: 'Below Standard',
      className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
      icon: AlertCircle,
    },
    at_top_level: {
      label: 'Top Level',
      className: 'bg-muted text-muted-foreground border-border',
      icon: Crown,
    },
    no_criteria: {
      label: 'No Criteria',
      className: 'bg-muted text-muted-foreground border-border',
      icon: AlertCircle,
    },
  };

  const c = config[status];
  const Icon = c.icon;

  return (
    <Badge variant="outline" className={cn('text-xs gap-1', c.className)}>
      <Icon className="w-3 h-3" />
      {c.label}
    </Badge>
  );
}

/* ─── Approve Promotion Dialog ──────────────────────────── */

function ApprovePromotionButton({ member }: { member: TeamMemberProgress }) {
  const promoteLevel = usePromoteLevel();
  const [promoNotes, setPromoNotes] = useState('');

  if (!member.isFullyQualified || !member.currentLevel || !member.nextLevel) return null;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Approve Promotion
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Approve Promotion</AlertDialogTitle>
          <AlertDialogDescription>
            Promote <span className="font-medium text-foreground">{member.fullName}</span> from{' '}
            <span className="font-medium text-foreground">{member.currentLevel.label}</span> to{' '}
            <span className="font-medium text-foreground">{member.nextLevel.label}</span>?
            This will immediately update their level.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <Textarea
            value={promoNotes}
            onChange={(e) => setPromoNotes(e.target.value)}
            placeholder="Promotion notes (optional)..."
            className="text-sm min-h-[60px]"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => {
              promoteLevel.mutate({
                userId: member.userId,
                fromLevelSlug: member.currentLevel!.slug,
                toLevelSlug: member.nextLevel!.slug,
                notes: promoNotes.trim() || undefined,
              });
            }}
            disabled={promoteLevel.isPending}
          >
            {promoteLevel.isPending ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Promoting...</>
            ) : (
              'Confirm Promotion'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ─── Demote Level Dialog ───────────────────────────────── */

function DemoteLevelButton({ member, allLevels }: { member: TeamMemberProgress; allLevels: StylistLevel[] }) {
  const demoteLevel = useDemoteLevel();
  const [demoteNotes, setDemoteNotes] = useState('');

  // Sort levels by display_order to match the index used in useTeamLevelProgress
  const sortedLevels = useMemo(() => [...allLevels].sort((a, b) => a.display_order - b.display_order), [allLevels]);

  // Show for below_standard OR at_risk with demotion_eligible action type
  const showDemote = (member.status === 'below_standard' || (member.status === 'at_risk' && member.retentionActionType === 'demotion_eligible'))
    && member.currentLevel && member.currentLevelIndex > 0;

  if (!showDemote) return null;

  const previousLevel = sortedLevels[member.currentLevelIndex - 1];
  if (!previousLevel) return null;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="destructive" className="text-xs">
          <AlertCircle className="h-3.5 w-3.5 mr-1" />
          Demote
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Demotion</AlertDialogTitle>
          <AlertDialogDescription>
            Demote <span className="font-medium text-foreground">{member.fullName}</span> from{' '}
            <span className="font-medium text-foreground">{member.currentLevel!.label}</span> to{' '}
            <span className="font-medium text-foreground">{previousLevel.label}</span>?
            This will immediately update their level and is recorded in the audit trail.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <Textarea
            value={demoteNotes}
            onChange={(e) => setDemoteNotes(e.target.value)}
            placeholder="Reason for demotion (optional)..."
            className="min-h-[60px] resize-none"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setDemoteNotes('')}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            onClick={() => {
              demoteLevel.mutate({
                userId: member.userId,
                fromLevelSlug: member.currentLevel!.slug,
                toLevelSlug: previousLevel.slug,
                notes: demoteNotes.trim() || undefined,
              });
              setDemoteNotes('');
            }}
            disabled={demoteLevel.isPending}
          >
            {demoteLevel.isPending ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Demoting...</>
            ) : (
              'Confirm Demotion'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PromotionHistorySection({ userId, promotions, allLevels }: { userId: string; promotions: PromotionRecord[]; allLevels: StylistLevel[] }) {
  const { formatDate } = useFormatDate();
  const userPromotions = promotions.filter(p => p.user_id === userId);

  const slugToLabel = (slug: string) => {
    const level = allLevels.find(l => l.slug === slug);
    return level?.label || slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  if (userPromotions.length === 0) return null;

  return (
    <div className="p-3 rounded-lg border bg-card/30 space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <History className="w-3.5 h-3.5" />
        <span className="font-medium">Level History</span>
      </div>
      {userPromotions.map(p => {
        const isDemotion = p.direction === 'demotion';
        return (
          <div key={p.id} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1">
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isDemotion ? 'bg-rose-500' : 'bg-emerald-500')} />
              <span className="text-muted-foreground">{slugToLabel(p.from_level)}</span>
              <ArrowRight className={cn('w-3 h-3 inline mx-0.5', isDemotion ? 'rotate-90 text-rose-500' : '')} />
              <span className="text-foreground">{slugToLabel(p.to_level)}</span>
              {isDemotion && <span className="text-rose-500 ml-1">(Demotion)</span>}
            </span>
            <span className="text-muted-foreground">
              {formatDate(new Date(p.promoted_at), 'MMM d, yyyy')} — by {p.promoter_name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StylistProgressRow({ member, totalLevels, promotions, allLevels }: { member: TeamMemberProgress; totalLevels: number; promotions: PromotionRecord[]; allLevels: StylistLevel[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { dashPath } = useOrgDashboardPath();
  const levelColor = member.currentLevel
    ? getLevelColor(member.currentLevelIndex, totalLevels)
    : null;

  const isAtRisk = member.status === 'at_risk' || member.status === 'below_standard';
  const hasExpandableContent = member.criteriaProgress.length > 0 || member.retentionFailures.length > 0;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="flex items-center gap-4 p-4 rounded-xl border bg-card/50 hover:bg-muted/30 transition-colors">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.photoUrl || undefined} />
          <AvatarFallback>{member.fullName?.[0] || '?'}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={dashPath('/admin/analytics/reports')}
              className="font-medium text-sm hover:text-primary transition-colors hover:underline"
            >
              {member.fullName}
            </Link>
            {levelColor && member.currentLevel && (
              <Badge variant="secondary" className={cn('text-[10px]', levelColor.bg, levelColor.text)}>
                {member.currentLevel.label}
              </Badge>
            )}
            {member.nextLevel && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <ArrowRight className="w-3 h-3" />
                {member.nextLevel.label}
              </span>
            )}
            {member.timeAtLevelDays > 0 && (
              <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                {member.timeAtLevelDays}d at level
              </span>
            )}
          </div>

          {member.status !== 'at_top_level' && member.status !== 'no_criteria' && !isAtRisk && (
            <div className="flex items-center gap-3 mt-1.5">
              <Progress
                value={Math.min(100, member.compositeScore)}
                className="h-2 flex-1 max-w-[200px]"
                indicatorClassName={cn(
                  member.compositeScore >= 100 ? 'bg-emerald-500' : 'bg-primary'
                )}
              />
              <span className={cn("text-xs tabular-nums", member.compositeScore >= 100 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>{member.compositeScore}%</span>
            </div>
          )}
          {/* Retention failure indicators */}
          {member.retentionFailures.length > 0 && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {member.retentionFailures.map(f => (
                <span key={f.key} className="text-[10px] text-rose-600 dark:text-rose-400">
                  {f.label}: {f.unit === '/mo' || f.unit === '$' ? `$${f.current.toLocaleString()}` : `${f.current}${f.unit}`} (min {f.unit === '/mo' || f.unit === '$' ? `$${f.minimum.toLocaleString()}` : `${f.minimum}${f.unit}`})
                </span>
              ))}
            </div>
          )}
          {/* Informational context badges */}
          {member.noShowRate !== null && member.noShowRate > 0 && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                {Math.round(member.noShowRate)}% no-show
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Action links for at-risk members */}
          {isAtRisk && (
            <>
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" asChild>
                <Link to={dashPath('/admin/analytics/reports')}>
                  <FileText className="w-3 h-3" />
                  Report
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" asChild>
                <Link to={dashPath('/coaching/meetings')}>
                  <Calendar className="w-3 h-3" />
                  Schedule 1:1
                </Link>
              </Button>
            </>
          )}
          {member.isFullyQualified && <ApprovePromotionButton member={member} />}
          <DemoteLevelButton member={member} allLevels={allLevels} />
          <StatusBadge status={member.status} />
          {hasExpandableContent && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
          )}
        </div>
      </div>

      <CollapsibleContent className="mt-2 ml-14 space-y-4 pb-2">
        {/* Retention warning */}
        {member.retentionFailures.length > 0 && (
          <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/20 space-y-2">
            <div className="flex items-center gap-2 text-xs text-rose-700 dark:text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="font-medium">
                {member.retentionActionType === 'demotion_eligible' ? 'Demotion Eligible' : 'Coaching Recommended'}
              </span>
              {member.retentionGracePeriodDays > 0 && (
                <span className="text-rose-500 dark:text-rose-500">• {member.retentionGracePeriodDays}d grace period</span>
              )}
            </div>
            {member.retentionFailures.map(f => (
              <div key={f.key} className="flex items-center justify-between text-xs">
                <span className="text-rose-600 dark:text-rose-400">{f.label}</span>
                <span className="tabular-nums text-rose-700 dark:text-rose-300">
                  {f.unit === '/mo' || f.unit === '$' ? `$${f.current.toLocaleString()}` : `${f.current}${f.unit}`}
                  <span className="text-rose-400"> / min {f.unit === '/mo' || f.unit === '$' ? `$${f.minimum.toLocaleString()}` : `${f.minimum}${f.unit}`}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Promotion progress */}
        {member.criteriaProgress.length > 0 && (
          <div className="p-4 rounded-lg border bg-card/30 space-y-3">
            {member.criteriaProgress.map(cp => (
              <CriterionRow key={cp.key} cp={cp} />
            ))}

            <div className="flex items-center justify-between pt-2 border-t text-[10px] text-muted-foreground">
              <span>{member.evaluationWindowDays}-day rolling window</span>
              {member.requiresApproval && (
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Requires approval
                </span>
              )}
            </div>
          </div>
        )}

        {/* Promotion history */}
        <PromotionHistorySection userId={member.userId} promotions={promotions} allLevels={allLevels} />
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ─── Stylist List (shared between tabs) ───────────────── */

function StylistList({
  members,
  totalLevels,
  emptyMessage,
  promotions,
  allLevels,
}: {
  members: TeamMemberProgress[];
  totalLevels: number;
  emptyMessage: string;
  promotions: PromotionRecord[];
  allLevels: StylistLevel[];
}) {
  if (members.length === 0) {
    return (
      <div className={tokens.empty.container}>
        <GraduationCap className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>{emptyMessage}</h3>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {members.map(m => (
        <StylistProgressRow key={m.userId} member={m} totalLevels={totalLevels} promotions={promotions} allLevels={allLevels} />
      ))}
    </div>
  );
}

/* ─── Assistant Checklist Tab (preserved) ──────────────── */

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  needs_revision: 'bg-orange-100 text-orange-800',
  rejected: 'bg-red-100 text-red-800',
};

function SubmissionReviewPanel({ submission, requirementTitle }: { submission: GraduationSubmission; requirementTitle: string }) {
  const { formatDate } = useFormatDate();
  const updateStatus = useUpdateSubmissionStatus();
  const addFeedback = useAddFeedback();
  const { data: feedback = [] } = useSubmissionFeedback(submission.id);
  const [feedbackText, setFeedbackText] = useState('');

  const handleAddFeedback = () => {
    if (!feedbackText.trim()) return;
    addFeedback.mutate({ submissionId: submission.id, feedback: feedbackText });
    setFeedbackText('');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className={tokens.heading.subsection}>Requirement</h3>
        <p className="text-lg font-medium">{requirementTitle}</p>
      </div>

      <div className="space-y-2">
        <h3 className={tokens.heading.subsection}>Submission</h3>
        <div className="p-4 rounded-lg bg-muted/30 space-y-3">
          {submission.assistant_notes && <p className="text-sm">{submission.assistant_notes}</p>}
          {submission.proof_url && (
            <a href={submission.proof_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline text-sm">
              <ExternalLink className="h-4 w-4" /> View Attachment
            </a>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
            <Clock className="h-3 w-3" />
            Submitted {formatDate(new Date(submission.submitted_at), 'MMM d, h:mm a')}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className={tokens.heading.subsection}>Status</h3>
        <div className="flex gap-2">
          <Button
            variant={submission.status === 'approved' ? 'default' : 'outline'}
            className={submission.status === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            onClick={() => updateStatus.mutate({ submissionId: submission.id, status: 'approved' })}
            disabled={updateStatus.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
          </Button>
          <Button
            variant={submission.status === 'rejected' ? 'default' : 'outline'}
            className={submission.status === 'rejected' ? 'bg-destructive hover:bg-destructive/90' : ''}
            onClick={() => updateStatus.mutate({ submissionId: submission.id, status: 'rejected' })}
            disabled={updateStatus.isPending}
          >
            <AlertCircle className="h-4 w-4 mr-2" /> Request Changes
          </Button>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-border">
        <h3 className={tokens.heading.subsection}>Feedback History</h3>
        <ScrollArea className="h-[200px] pr-4">
          <div className="space-y-4">
            {feedback.map((item: GraduationFeedback) => (
              <div key={item.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={item.coach?.photo_url || undefined} />
                  <AvatarFallback>{item.coach?.full_name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.coach?.full_name}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(new Date(item.created_at), 'MMM d')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.feedback}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex gap-2">
          <Textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="Add feedback..." className="min-h-[60px] resize-none" />
          <Button size="icon" onClick={handleAddFeedback} disabled={!feedbackText.trim() || addFeedback.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function AssistantRow({ assistant, requirements }: { assistant: AssistantProgress; requirements: any[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<GraduationSubmission | null>(null);
  const progress = assistant.total_requirements > 0
    ? (assistant.completed_requirements / assistant.total_requirements) * 100
    : 0;

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center gap-4 p-4 rounded-xl border bg-card/50">
          <Avatar className="h-10 w-10">
            <AvatarImage src={assistant.photo_url || undefined} />
            <AvatarFallback>{assistant.full_name?.[0] || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{assistant.full_name}</span>
              {assistant.pending_submissions > 0 && (
                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                  {assistant.pending_submissions} pending
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {assistant.completed_requirements}/{assistant.total_requirements} complete
              </span>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon">
              <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="mt-2 ml-14 space-y-2">
          {requirements.map((req) => {
            const submission = assistant.submissions.find(s => s.requirement_id === req.id);
            return (
              <div
                key={req.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card/30 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => submission && setSelectedSubmission(submission)}
              >
                <div className="flex items-center gap-3">
                  {submission?.status === 'approved' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : submission?.status === 'pending' ? (
                    <Clock className="h-4 w-4 text-amber-600" />
                  ) : submission?.status === 'needs_revision' ? (
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  <span className="text-sm">{req.title}</span>
                </div>
                {submission && (
                  <Badge variant="secondary" className={cn('text-xs', STATUS_COLORS[submission.status as keyof typeof STATUS_COLORS])}>
                    {submission.status.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            );
          })}
        </CollapsibleContent>
      </Collapsible>

      <PremiumFloatingPanel open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)} maxWidth="560px">
        {selectedSubmission && (
          <div className="p-5">
            <SubmissionReviewPanel
              submission={selectedSubmission}
              requirementTitle={requirements.find(r => r.id === selectedSubmission.requirement_id)?.title || 'Unknown'}
            />
          </div>
        )}
      </PremiumFloatingPanel>
    </>
  );
}

function RequirementsManager() {
  const { data: requirements = [], isLoading } = useAllGraduationRequirements();
  const { data: allLevels = [] } = useStylistLevels();
  const createRequirement = useCreateRequirement();
  const updateRequirement = useUpdateRequirement();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedLevelIds, setSelectedLevelIds] = useState<string[]>([]);
  const [allLevelsMode, setAllLevelsMode] = useState(true);

  const toggleLevel = (levelId: string) => {
    setSelectedLevelIds(prev =>
      prev.includes(levelId) ? prev.filter(id => id !== levelId) : [...prev, levelId]
    );
  };

  const handleCreate = () => {
    if (!title.trim()) return;
    createRequirement.mutate(
      {
        title: title.trim(),
        description: description.trim() || null,
        category: 'general',
        applies_to_level_ids: allLevelsMode ? null : selectedLevelIds,
      },
      {
        onSuccess: () => {
          setTitle(''); setDescription(''); setShowCreate(false);
          setSelectedLevelIds([]); setAllLevelsMode(true);
        },
      }
    );
  };

  const handleToggleLevelForReq = (reqId: string, levelId: string, currentIds: string[] | null) => {
    const current = currentIds || [];
    const updated = current.includes(levelId)
      ? current.filter(id => id !== levelId)
      : [...current, levelId];
    updateRequirement.mutate({
      id: reqId,
      applies_to_level_ids: updated.length > 0 ? updated : null,
    });
  };

  const handleSetAllLevelsForReq = (reqId: string) => {
    updateRequirement.mutate({ id: reqId, applies_to_level_ids: null });
  };

  const levelMap = useMemo(
    () => new Map(allLevels.map(l => [l.id, l])),
    [allLevels]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={tokens.heading.subsection}>Requirements</h3>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add
        </Button>
      </div>
      {showCreate && (
        <Card className="p-4 space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Requirement title" />
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Applies to levels:</p>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={allLevelsMode ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => { setAllLevelsMode(true); setSelectedLevelIds([]); }}
              >
                All Levels
              </Badge>
              {allLevels.map(level => (
                <Badge
                  key={level.id}
                  variant={!allLevelsMode && selectedLevelIds.includes(level.id) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => { setAllLevelsMode(false); toggleLevel(level.id); }}
                >
                  {level.label}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={!title.trim() || createRequirement.isPending}>Save</Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </Card>
      )}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        requirements.map((req) => {
          const appliesTo = (req as any).applies_to_level_ids as string[] | null;
          const isAllLevels = !appliesTo || appliesTo.length === 0;
          return (
            <div key={req.id} className="p-3 rounded-lg border space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{req.title}</p>
                  {req.description && <p className="text-xs text-muted-foreground mt-0.5">{req.description}</p>}
                </div>
                <Badge variant="secondary" className="text-xs">{req.category}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-muted-foreground mr-1">Applies to:</span>
                <Badge
                  variant={isAllLevels ? 'default' : 'outline'}
                  className="text-[10px] cursor-pointer h-5"
                  onClick={() => handleSetAllLevelsForReq(req.id)}
                >
                  All
                </Badge>
                {allLevels.map(level => {
                  const isSelected = appliesTo?.includes(level.id) ?? false;
                  return (
                    <Badge
                      key={level.id}
                      variant={isSelected ? 'default' : 'outline'}
                      className="text-[10px] cursor-pointer h-5"
                      onClick={() => handleToggleLevelForReq(req.id, level.id, appliesTo)}
                    >
                      {level.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ─── Org-Wide Promotion History Tab ────────────────────── */

function OrgPromotionHistoryTab({ promotions, allLevels }: { promotions: PromotionRecord[]; allLevels: StylistLevel[] }) {
  const { formatDate } = useFormatDate();
  const [visibleCount, setVisibleCount] = useState(25);

  const slugToLabel = (slug: string) => {
    const level = allLevels.find(l => l.slug === slug);
    return level?.label || slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  if (promotions.length === 0) {
    return (
      <div className={tokens.empty.container}>
        <History className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>No promotion or demotion history</h3>
        <p className={tokens.empty.description}>Level changes will appear here once recorded.</p>
      </div>
    );
  }

  const visible = promotions.slice(0, visibleCount);
  const hasMore = visibleCount < promotions.length;

  return (
    <div className="space-y-3">
      {visible.map(p => {
        const isDemotion = p.direction === 'demotion';
        return (
          <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl border bg-card/50">
            <div className={cn('w-2 h-2 rounded-full shrink-0', isDemotion ? 'bg-rose-500' : 'bg-emerald-500')} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{p.user_name || 'Unknown'}</span>
                <span className="text-xs text-muted-foreground">{slugToLabel(p.from_level)}</span>
                <ArrowRight className={cn('w-3 h-3', isDemotion ? 'text-rose-500' : 'text-emerald-500')} />
                <span className="text-xs text-foreground">{slugToLabel(p.to_level)}</span>
                {isDemotion && (
                  <Badge variant="outline" className="text-[10px] border-rose-200 text-rose-600 dark:border-rose-800 dark:text-rose-400">
                    Demotion
                  </Badge>
                )}
              </div>
              {p.notes && (
                <p className="text-xs text-muted-foreground mt-1 italic">{p.notes}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-muted-foreground">
                {formatDate(new Date(p.promoted_at), 'MMM d, yyyy')}
              </div>
              <div className="text-[10px] text-muted-foreground">
                by {p.promoter_name}
              </div>
            </div>
          </div>
        );
      })}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount(prev => prev + 25)}
          >
            Show More ({promotions.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────── */

export default function GraduationTracker() {
  const { dashPath } = useOrgDashboardPath();
  const { teamProgress, counts, isLoading } = useTeamLevelProgress();
  const { data: allLevels = [] } = useStylistLevels();
  const { data: assistants, isLoading: loadingAssistants } = useAllAssistantProgress();
  const { data: requirements, isLoading: loadingReqs } = useAllGraduationRequirements();
  const { data: promotions = [] } = useOrgPromotionHistory();

  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = teamProgress.filter(m => {
    if (searchQuery && !m.fullName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (levelFilter !== 'all' && m.currentLevel?.slug !== levelFilter) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    return true;
  });

  const readyMembers = filtered.filter(m => m.status === 'ready');
  const atRiskMembers = filtered.filter(m => m.status === 'at_risk' || m.status === 'below_standard');

  const filteredAssistants = assistants?.filter(a =>
    a.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasCriteriaConfigured = counts.total > 0 && counts.noCriteria < counts.total;

  return (
    <DashboardLayout>
      <DashboardPageHeader
        title="Team Level Progress"
        description="Track team progression, retention standards, and promotion readiness"
        backTo={dashPath('/admin/team-hub')}
        backLabel="Back to Operations Hub"
        actions={
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="at_risk">At Risk</SelectItem>
                <SelectItem value="below_standard">Below Standard</SelectItem>
                <SelectItem value="needs_attention">Needs Attention</SelectItem>
                <SelectItem value="at_top_level">Top Level</SelectItem>
                <SelectItem value="no_criteria">No Criteria</SelectItem>
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {allLevels.map(l => (
                  <SelectItem key={l.slug} value={l.slug}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        }
      />

      <div className="container max-w-[1600px] px-8 py-8 space-y-6">
        <PageExplainer pageId="graduation-tracker" />

        {/* KPI Strip — only show when criteria are configured */}
        {!isLoading && hasCriteriaConfigured && <KpiStrip counts={counts} />}

        {/* Empty state when no criteria configured */}
        {!isLoading && !hasCriteriaConfigured && counts.total > 0 && (
          <NoCriteriaEmptyState />
        )}

        <Tabs defaultValue="all-stylists">
          <TabsList>
            <TabsTrigger value="all-stylists">
              <Users className="h-4 w-4 mr-2" />
              All Stylists
              {counts.total > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{counts.total}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ready">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Ready to Promote
              {counts.ready > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs bg-emerald-100 text-emerald-700">{counts.ready}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="at-risk">
              <AlertTriangle className="h-4 w-4 mr-2" />
              At Risk
              {(counts.atRisk + counts.belowStandard) > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs bg-rose-100 text-rose-700">{counts.atRisk + counts.belowStandard}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="assistants">
              <GraduationCap className="h-4 w-4 mr-2" />
              Assistants
            </TabsTrigger>
            <TabsTrigger value="requirements">
              <Sparkles className="h-4 w-4 mr-2" />
              Requirements
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              History
              {promotions.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{promotions.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab: All Stylists */}
          <TabsContent value="all-stylists" className="mt-6">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}
              </div>
            ) : (
              <StylistList
                members={filtered}
                totalLevels={allLevels.length}
                emptyMessage="No team members with levels assigned"
                promotions={promotions}
                allLevels={allLevels}
              />
            )}
          </TabsContent>

          {/* Tab: Ready to Promote */}
          <TabsContent value="ready" className="mt-6">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}
              </div>
            ) : (
              <StylistList
                members={readyMembers}
                totalLevels={allLevels.length}
                emptyMessage="No team members currently qualified for promotion"
                promotions={promotions}
                allLevels={allLevels}
              />
            )}
          </TabsContent>

          {/* Tab: At Risk */}
          <TabsContent value="at-risk" className="mt-6">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}
              </div>
            ) : (
              <StylistList
                members={atRiskMembers}
                totalLevels={allLevels.length}
                emptyMessage="No team members currently at risk — all meeting retention standards"
                promotions={promotions}
                allLevels={allLevels}
              />
            )}
          </TabsContent>

          {/* Tab: Assistants */}
          <TabsContent value="assistants" className="mt-6 space-y-3">
            {loadingAssistants || loadingReqs ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-md" />)}
              </div>
            ) : filteredAssistants?.length === 0 ? (
              <div className={tokens.empty.container}>
                <Users className={tokens.empty.icon} />
                <h3 className={tokens.empty.heading}>No assistants found</h3>
              </div>
            ) : (
              filteredAssistants?.map(assistant => (
                <AssistantRow
                  key={assistant.assistant_id}
                  assistant={assistant}
                  requirements={requirements || []}
                />
              ))
            )}
          </TabsContent>

          {/* Tab: Requirements */}
          <TabsContent value="requirements" className="mt-6">
            <RequirementsManager />
          </TabsContent>
          {/* Tab: History */}
          <TabsContent value="history" className="mt-6">
            <OrgPromotionHistoryTab promotions={promotions} allLevels={allLevels} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
