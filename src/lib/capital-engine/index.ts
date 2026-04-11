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
  isFinancingEligible,
  computePostFinancingCashFlow,
  computeRepaymentSchedule,
  computeVariance,
  type FinancingCandidate,
  type EligibilityResult,
  type PostFinancingCashFlow,
  type RepaymentScheduleEntry,
} from './financing-engine';

export {
  computeStylistSPI,
  computeORS,
  determineCareerStage,
  isMicroFinancingEligible,
  type StylistSPIInput,
  type StylistSPIResult,
  type ORSInput,
  type ORSResult,
} from './stylist-spi-engine';

export {
  isZuraEligible,
  computeCoverageRatio,
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
