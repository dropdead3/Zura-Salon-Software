/**
 * Multi-Location Growth Orchestrator.
 * Portfolio-level optimization: OES scoring, location priority states,
 * capacity allocation, cross-location pattern detection.
 * All computation is deterministic — no AI involvement.
 */

import type { MomentumDirection } from './seo-momentum-calculator';
import type { LiftRange } from './seo-revenue-predictor';

// ── Effort Unit Weights ───────────────────────────────────────────

export const EFFORT_UNIT_WEIGHTS: Record<string, number> = {
  review_request: 1,
  review_response: 1,
  photo_upload: 2,
  gbp_post: 2,
  metadata_fix: 1,
  internal_linking: 2,
  faq_expansion: 3,
  service_description_rewrite: 3,
  booking_cta_optimization: 2,
  before_after_publish: 3,
  page_completion: 5,
  local_landing_page_creation: 8,
  content_refresh: 4,
  service_page_update: 3,
  competitor_gap_response: 5,
  stylist_spotlight_publish: 4,
};

const DEFAULT_EFFORT_UNITS = 2;

export function getEffortUnits(templateKey: string): number {
  return EFFORT_UNIT_WEIGHTS[templateKey] ?? DEFAULT_EFFORT_UNITS;
}

// ── Location Priority States ──────────────────────────────────────

export type LocationPriorityState = 'attack' | 'maintain' | 'recover' | 'deprioritized';

export interface LocationPriorityConfig {
  label: string;
  description: string;
  color: string;
  icon: 'zap' | 'shield' | 'alert-triangle' | 'pause';
}

export const LOCATION_PRIORITY_CONFIG: Record<LocationPriorityState, LocationPriorityConfig> = {
  attack: {
    label: 'Attack',
    description: 'High opportunity, aggressive execution',
    color: 'text-green-500',
    icon: 'zap',
  },
  maintain: {
    label: 'Maintain',
    description: 'Stable performance, minimal tasks',
    color: 'text-blue-500',
    icon: 'shield',
  },
  recover: {
    label: 'Recover',
    description: 'Losing momentum, targeted intervention',
    color: 'text-amber-500',
    icon: 'alert-triangle',
  },
  deprioritized: {
    label: 'Deprioritized',
    description: 'Low ROI, minimal effort allocated',
    color: 'text-muted-foreground',
    icon: 'pause',
  },
};

// ── Input Types ───────────────────────────────────────────────────

export interface OrchestrationObjectInput {
  seoObjectId: string;
  objectLabel: string;
  locationId: string;
  locationLabel: string;
  /** Predicted revenue lift (expected band) */
  predictedLift: LiftRange;
  /** Confidence level from predictor */
  confidence: 'high' | 'medium' | 'low';
  /** Pending task template keys */
  pendingTemplateKeys: string[];
  /** Momentum score (-100 to +100) */
  momentumScore?: number;
  /** Momentum direction */
  momentumDirection?: MomentumDirection;
  /** Current 30d revenue */
  currentRevenue: number;
}

export interface OrchestrationMemberInput {
  userId: string;
  roles: string[];
  /** Location IDs this member is bound to (empty = centralized/org-wide) */
  locationIds: string[];
  /** Max pending tasks this member should have */
  taskCap: number;
  /** Current pending task count */
  currentTaskCount: number;
}

// ── Output Types ──────────────────────────────────────────────────

export interface OpportunityScore {
  seoObjectId: string;
  objectLabel: string;
  locationId: string;
  locationLabel: string;
  predictedLift: LiftRange;
  totalEffortUnits: number;
  /** Opportunity Efficiency Score */
  oes: number;
  confidence: 'high' | 'medium' | 'low';
  momentumScore?: number;
  momentumDirection?: MomentumDirection;
  currentRevenue: number;
}

export interface LocationState {
  locationId: string;
  locationLabel: string;
  priorityState: LocationPriorityState;
  aggregateOES: number;
  aggregateLift: number;
  totalEffortUnits: number;
  objectCount: number;
  topOpportunity: OpportunityScore | null;
  momentumDirection?: MomentumDirection;
  reason: string;
}

export interface AllocationAssignment {
  seoObjectId: string;
  templateKey: string;
  assignedToUserId: string;
  oes: number;
}

export interface WinningPattern {
  templateKey: string;
  sourceLocationId: string;
  sourceLocationLabel: string;
  avgEffectiveness: number;
  targetLocationIds: string[];
  targetLocationLabels: string[];
}

export interface OrchestrationResult {
  /** All opportunities ranked by OES descending */
  rankedOpportunities: OpportunityScore[];
  /** Location states with priority assignment */
  locationStates: LocationState[];
  /** Global capacity allocation plan */
  allocationPlan: AllocationAssignment[];
  /** Cross-location winning patterns */
  winningPatterns: WinningPattern[];
  /** Network-level summary */
  networkSummary: NetworkSummary;
}

export interface NetworkSummary {
  totalNetworkRevenue: number;
  totalPredictedLift: number;
  topGrowthDriver: { label: string; lift: number } | null;
  biggestOpportunity: { label: string; lift: number } | null;
  atRisk: { label: string; direction: MomentumDirection } | null;
  focusRecommendation: string;
}

// ── OES Computation ───────────────────────────────────────────────

export function computeOES(objects: OrchestrationObjectInput[]): OpportunityScore[] {
  return objects.map((obj) => {
    const totalEffort = obj.pendingTemplateKeys.reduce(
      (sum, key) => sum + getEffortUnits(key),
      0,
    );

    const oes = totalEffort > 0
      ? obj.predictedLift.expected / totalEffort
      : 0;

    return {
      seoObjectId: obj.seoObjectId,
      objectLabel: obj.objectLabel,
      locationId: obj.locationId,
      locationLabel: obj.locationLabel,
      predictedLift: obj.predictedLift,
      totalEffortUnits: totalEffort,
      oes,
      confidence: obj.confidence,
      momentumScore: obj.momentumScore,
      momentumDirection: obj.momentumDirection,
      currentRevenue: obj.currentRevenue,
    };
  }).sort((a, b) => b.oes - a.oes);
}

// ── Location Priority State Assignment ────────────────────────────

export function assignLocationStates(
  opportunities: OpportunityScore[],
): LocationState[] {
  // Group by location
  const byLocation = new Map<string, OpportunityScore[]>();
  for (const op of opportunities) {
    if (!byLocation.has(op.locationId)) byLocation.set(op.locationId, []);
    byLocation.get(op.locationId)!.push(op);
  }

  const locationAggregates: LocationState[] = [];
  for (const [locationId, ops] of byLocation) {
    const aggregateOES = ops.reduce((s, o) => s + o.oes, 0) / ops.length;
    const aggregateLift = ops.reduce((s, o) => s + o.predictedLift.expected, 0);
    const totalEffort = ops.reduce((s, o) => s + o.totalEffortUnits, 0);
    const topOp = ops[0] ?? null; // already sorted by OES

    // Determine dominant momentum
    const momentumScores = ops.filter((o) => o.momentumScore !== undefined);
    const avgMomentum = momentumScores.length > 0
      ? momentumScores.reduce((s, o) => s + (o.momentumScore ?? 0), 0) / momentumScores.length
      : 0;
    const direction: MomentumDirection | undefined = momentumScores.length > 0
      ? (avgMomentum >= 10 ? 'gaining' : avgMomentum <= -10 ? 'losing' : 'holding')
      : undefined;

    locationAggregates.push({
      locationId,
      locationLabel: ops[0]?.locationLabel ?? locationId,
      priorityState: 'maintain', // placeholder
      aggregateOES,
      aggregateLift,
      totalEffortUnits: totalEffort,
      objectCount: ops.length,
      topOpportunity: topOp,
      momentumDirection: direction,
      reason: '',
    });
  }

  if (locationAggregates.length === 0) return [];

  // Sort by OES to determine percentile thresholds
  const sorted = [...locationAggregates].sort((a, b) => b.aggregateOES - a.aggregateOES);
  const top25Idx = Math.max(1, Math.ceil(sorted.length * 0.25));
  const bottom25Idx = Math.max(0, sorted.length - Math.ceil(sorted.length * 0.25));

  const top25Threshold = sorted[top25Idx - 1]?.aggregateOES ?? 0;
  const bottom25Threshold = sorted[bottom25Idx]?.aggregateOES ?? 0;

  for (const loc of locationAggregates) {
    if (loc.momentumDirection === 'losing' && loc.aggregateOES >= bottom25Threshold) {
      loc.priorityState = 'recover';
      loc.reason = 'Losing momentum with moderate opportunity — targeted intervention needed';
    } else if (loc.aggregateOES >= top25Threshold && loc.momentumDirection !== 'losing') {
      loc.priorityState = 'attack';
      loc.reason = 'High opportunity efficiency — aggressive execution recommended';
    } else if (loc.aggregateOES <= bottom25Threshold && loc.momentumDirection !== 'losing') {
      loc.priorityState = 'deprioritized';
      loc.reason = 'Low ROI relative to other locations — shift resources elsewhere';
    } else {
      loc.priorityState = 'maintain';
      loc.reason = 'Stable performance — hold position with minimal tasks';
    }
  }

  return locationAggregates.sort((a, b) => b.aggregateOES - a.aggregateOES);
}

// ── Capacity Allocation ───────────────────────────────────────────

export function allocateCapacity(
  opportunities: OpportunityScore[],
  members: OrchestrationMemberInput[],
): AllocationAssignment[] {
  const assignments: AllocationAssignment[] = [];
  const memberLoad = new Map<string, number>(
    members.map((m) => [m.userId, m.currentTaskCount]),
  );

  // Walk opportunities in OES order (already sorted)
  for (const op of opportunities) {
    if (op.totalEffortUnits === 0) continue;

    // Find eligible members for this location
    const eligible = members.filter((m) => {
      const currentLoad = memberLoad.get(m.userId) ?? 0;
      if (currentLoad >= m.taskCap) return false;
      // Centralized roles (empty locationIds) can work anywhere
      if (m.locationIds.length === 0) return true;
      // Location-bound roles only work on their location
      return m.locationIds.includes(op.locationId);
    });

    if (eligible.length === 0) continue;

    // Pick member with lowest current load
    const best = eligible.reduce((a, b) =>
      (memberLoad.get(a.userId) ?? 0) <= (memberLoad.get(b.userId) ?? 0) ? a : b,
    );

    assignments.push({
      seoObjectId: op.seoObjectId,
      templateKey: 'global_allocation',
      assignedToUserId: best.userId,
      oes: op.oes,
    });

    memberLoad.set(best.userId, (memberLoad.get(best.userId) ?? 0) + 1);
  }

  return assignments;
}

// ── Cross-Location Pattern Detection ──────────────────────────────

export interface EffectivenessInput {
  templateKey: string;
  locationId: string;
  locationLabel: string;
  avgEffectiveness: number;
  sampleSize: number;
}

export function detectWinningPatterns(
  effectiveness: EffectivenessInput[],
  allLocationIds: string[],
  allLocationLabels: Record<string, string>,
  minEffectiveness = 0.6,
  minSampleSize = 3,
): WinningPattern[] {
  // Group by template
  const byTemplate = new Map<string, EffectivenessInput[]>();
  for (const e of effectiveness) {
    if (!byTemplate.has(e.templateKey)) byTemplate.set(e.templateKey, []);
    byTemplate.get(e.templateKey)!.push(e);
  }

  const patterns: WinningPattern[] = [];

  for (const [templateKey, entries] of byTemplate) {
    // Find locations where this template is a winner
    const winners = entries.filter(
      (e) => e.avgEffectiveness >= minEffectiveness && e.sampleSize >= minSampleSize,
    );

    if (winners.length === 0) continue;

    const deployedLocationIds = new Set(entries.map((e) => e.locationId));
    const targetIds = allLocationIds.filter((id) => !deployedLocationIds.has(id));

    if (targetIds.length === 0) continue;

    const bestWinner = winners.reduce((a, b) =>
      a.avgEffectiveness >= b.avgEffectiveness ? a : b,
    );

    patterns.push({
      templateKey,
      sourceLocationId: bestWinner.locationId,
      sourceLocationLabel: bestWinner.locationLabel,
      avgEffectiveness: bestWinner.avgEffectiveness,
      targetLocationIds: targetIds,
      targetLocationLabels: targetIds.map((id) => allLocationLabels[id] ?? id),
    });
  }

  return patterns.sort((a, b) => b.avgEffectiveness - a.avgEffectiveness);
}

// ── Network Summary ───────────────────────────────────────────────

function buildNetworkSummary(
  opportunities: OpportunityScore[],
  locationStates: LocationState[],
): NetworkSummary {
  const totalRevenue = opportunities.reduce((s, o) => s + o.currentRevenue, 0);
  const totalLift = opportunities.reduce((s, o) => s + o.predictedLift.expected, 0);

  // Top growth driver = highest current revenue object
  const topByRevenue = [...opportunities].sort((a, b) => b.currentRevenue - a.currentRevenue)[0];

  // Biggest opportunity = highest predicted lift
  const topByLift = [...opportunities].sort(
    (a, b) => b.predictedLift.expected - a.predictedLift.expected,
  )[0];

  // At risk = location with losing momentum + highest OES (most to lose)
  const atRiskLocation = locationStates.find((l) => l.momentumDirection === 'losing');

  // Focus recommendation = highest OES object
  const topOES = opportunities[0];

  return {
    totalNetworkRevenue: totalRevenue,
    totalPredictedLift: totalLift,
    topGrowthDriver: topByRevenue
      ? { label: `${topByRevenue.objectLabel} (${topByRevenue.locationLabel})`, lift: topByRevenue.currentRevenue }
      : null,
    biggestOpportunity: topByLift
      ? { label: `${topByLift.objectLabel} (${topByLift.locationLabel})`, lift: topByLift.predictedLift.expected }
      : null,
    atRisk: atRiskLocation
      ? { label: `${atRiskLocation.locationLabel}`, direction: 'losing' as MomentumDirection }
      : null,
    focusRecommendation: topOES
      ? `${topOES.objectLabel} (${topOES.locationLabel}) — highest ROI this week`
      : 'No opportunities detected yet',
  };
}

// ── Main Orchestration Function ───────────────────────────────────

export function orchestrateGrowth(
  objects: OrchestrationObjectInput[],
  members: OrchestrationMemberInput[],
  effectiveness: EffectivenessInput[],
  allLocationIds: string[],
  allLocationLabels: Record<string, string>,
): OrchestrationResult {
  const rankedOpportunities = computeOES(objects);
  const locationStates = assignLocationStates(rankedOpportunities);
  const allocationPlan = allocateCapacity(rankedOpportunities, members);
  const winningPatterns = detectWinningPatterns(
    effectiveness, allLocationIds, allLocationLabels,
  );
  const networkSummary = buildNetworkSummary(rankedOpportunities, locationStates);

  return {
    rankedOpportunities,
    locationStates,
    allocationPlan,
    winningPatterns,
    networkSummary,
  };
}
