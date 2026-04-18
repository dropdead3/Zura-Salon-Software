export {
  computeSPI,
  computeRisk,
  computeROE,
  simulateScenario,
  rankOpportunities,
  type SPIInput,
  type SPIResult,
  type RiskInput,
  type RiskResult,
  type ROEInput,
  type ROEResult,
  type ScenarioInput,
  type ScenarioResult,
  type QueuedOpportunity,
} from './capital-engine';

export {
  computeZOS,
  evaluateHardFilters,
  determineEligibility,
  computeCapitalRecycling,
  computePipelineSummary,
  consistencyFromCV,
  type ZOSInput,
  type ZOSResult,
  type HardFilterInput,
  type LedgerEntry,
  type CapitalRecyclingMetrics,
  type PipelineSummary,
} from './ownership-engine';


export {
  computeStylistSPI,
  computeORS,
  determineCareerStage,
  
  type StylistSPIInput,
  type StylistSPIResult,
  type ORSInput,
  type ORSResult,
} from './stylist-spi-engine';

export {
  isZuraEligible,
  type ZuraOpportunity,
  type ZuraOrgContext,
  type ZuraEligibilityResult,
} from './zura-eligibility-engine';

export {
  getProvider,
  StripeCapitalProvider,
  type CapitalProvider,
  type ProviderOffer,
  type ProviderEligibilityResult,
  type ProviderInitiationResult,
  type FundingStatusResult,
  type RepaymentStatusResult,
} from './capital-provider';

export {
  computeSurfacePriority,
  selectForSurface,
  type PriorityOpportunity,
  type SurfaceState,
  type PriorityContext,
} from './surface-priority-engine';

export {
  clamp,
  normalizeRatioTo100,
  normalizeInverseTo100,
  safeDivide,
  freshnessMultiplier,
  calculateRoeRatio,
  calculateRoeScore,
  calculateBreakEvenScore,
  calculateFreshnessScore,
  calculateOpportunityFreshnessDays,
  calculateConfidenceScore,
  calculateRiskScore,
  mapRiskLevel,
  calculateBusinessValueScore,
  calculateNetMonthlyGainCents,
  calculateMonthlyLiftCents,
  calculateNetImpactScore,
  calculateCoverageRatio,
  calculateInternalEligibility,
  
  calculateSurfacePriority as calculateCanonicalSurfacePriority,
  calculateVariancePercent as calculateCanonicalVariancePercent,
  calculateRoiToDate,
  calculateRepaymentProgress,
  calculateBreakEvenProgress,
  calculateForecastStatus,
  calculateUnderperformance,
  calculatePredictedRevenueToDateCents,
  calculateCooldownUntil,
  type ConfidenceScoreInputs,
  type RiskScoreInputs,
  type BusinessValueInputs,
  type CoverageResult,
  type EligibilityInputs,
  type EligibilityResult as CanonicalEligibilityResult,
  type SurfacePriorityInputs,
  type SurfacePriorityPenalties,
} from './capital-formulas';
