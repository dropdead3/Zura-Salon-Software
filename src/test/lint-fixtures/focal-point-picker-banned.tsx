// Lint fixture — intentionally violates the FocalPointPicker Isolation
// canon so `lint-config-resolution.test.ts` can assert the selector
// survives flat-config resolution on a website-editor file outside the
// canonical owner / consumer.
//
// Excluded from `npm run lint` via the top-level `ignores` block in
// eslint.config.js; the meta-test passes `ignore: false` to ESLint so
// this file IS evaluated against the resolved config there.
import { FocalPointPicker } from '@/components/dashboard/website-editor/inputs/FocalPointPicker';

export function BannedFocalPicker() {
  return (
    <FocalPointPicker
      imageUrl="https://example.com/x.jpg"
      x={50}
      y={50}
      onChange={() => {}}
      onReset={() => {}}
    />
  );
}
