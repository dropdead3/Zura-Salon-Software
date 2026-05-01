// Allowed-pattern fixture for the dirty-state lint rule smoke test.
// These shapes must NOT trigger the rule.
import { useState } from 'react';
import { isStructurallyEqual } from '@/lib/stableStringify';

export function AllowedDirtyCheck() {
  const [local] = useState({ a: 1 });
  const server = { a: 1 };

  // Canonical structural compare — allowed.
  const isDirty1 = !isStructurallyEqual(local, server);

  // Single-side stringify (e.g. for logging or cache key generation) — allowed.
  const cacheKey = JSON.stringify(local);

  // Stringify compared against a non-stringify expression — allowed
  // (the rule targets the symmetric stringify-vs-stringify shape only).
  const isEmpty = JSON.stringify(local) !== '{}';

  return <div>{isDirty1 && cacheKey && isEmpty ? 'x' : 'y'}</div>;
}
