// LINT FIXTURE — DO NOT IMPORT.
// Lives OUTSIDE `src/components/platform/**` and `src/pages/dashboard/
// platform/**`, so the platform-scoped no-restricted-imports rule must
// NOT fire here. Used by lint-rule-platform-primitives.test.ts to prove
// the path-scoping works (a leaky glob would silently ban these imports
// across the whole dashboard).
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';

export function OutsideScopePrimitives() {
  return (
    <div>
      <Checkbox />
      <Switch />
    </div>
  );
}
