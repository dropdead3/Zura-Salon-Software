// LINT FIXTURE — DO NOT IMPORT.
// This file intentionally violates the no-restricted-imports rule banning
// raw shadcn primitives in `src/components/platform/**`. Used by
// lint-rule-platform-primitives.test.ts to assert the rule fires. Do NOT
// add eslint-disable here — that would hide the violation under test.
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';

export function BannedPlatformPrimitives() {
  return (
    <div>
      <Checkbox />
      <Switch />
    </div>
  );
}
