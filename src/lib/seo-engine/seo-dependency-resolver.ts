/**
 * SEO Dependency Resolver.
 * Checks hard/soft deps before allowing state transitions.
 */

export interface DependencyInfo {
  taskId: string;
  dependsOnTaskId: string;
  dependencyType: 'hard' | 'soft';
  dependsOnStatus: string;
}

export interface DependencyCheckResult {
  canProceed: boolean;
  blockedBy: DependencyInfo[];
  softWarnings: DependencyInfo[];
}

const COMPLETED_STATES = ['completed'];
const BLOCKING_STATES_FOR_SOFT = ['detected', 'queued', 'assigned']; // soft deps only block if not started

/**
 * Check whether a task's dependencies allow it to proceed.
 */
export function checkDependencies(
  dependencies: DependencyInfo[],
): DependencyCheckResult {
  const blockedBy: DependencyInfo[] = [];
  const softWarnings: DependencyInfo[] = [];

  for (const dep of dependencies) {
    if (dep.dependencyType === 'hard') {
      if (!COMPLETED_STATES.includes(dep.dependsOnStatus)) {
        blockedBy.push(dep);
      }
    } else {
      // Soft: warn but only block if the dependency hasn't started
      if (BLOCKING_STATES_FOR_SOFT.includes(dep.dependsOnStatus)) {
        softWarnings.push(dep);
      }
    }
  }

  return {
    canProceed: blockedBy.length === 0,
    blockedBy,
    softWarnings,
  };
}
