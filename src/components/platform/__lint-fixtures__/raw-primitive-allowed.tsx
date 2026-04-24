// LINT FIXTURE — DO NOT IMPORT.
// Mirrors raw-primitive-banned.tsx but uses Platform* wrappers. Used by
// lint-rule-platform-primitives.test.ts to assert the rule stays silent on
// the canonical happy-path import shape.
import { PlatformCheckbox } from '@/components/platform/ui/PlatformCheckbox';
import { PlatformSwitch } from '@/components/platform/ui/PlatformSwitch';

export function AllowedPlatformPrimitives() {
  return (
    <div>
      <PlatformCheckbox />
      <PlatformSwitch />
    </div>
  );
}
