// Intentional violation fixture for the dirty-state lint rule smoke test.
// DO NOT "fix" this file — the test asserts that the lint rule fires here.
import { useState } from 'react';

export function BannedDirtyCheck() {
  const [local] = useState({ a: 1 });
  const server = { a: 1 };
  // This is the exact pattern the rule must flag.
  const isDirty = JSON.stringify(local) !== JSON.stringify(server);
  return <div>{isDirty ? 'dirty' : 'clean'}</div>;
}
