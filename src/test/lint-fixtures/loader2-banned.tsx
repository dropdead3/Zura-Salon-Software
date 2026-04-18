// LINT FIXTURE — DO NOT IMPORT.
// This file intentionally violates the no-restricted-syntax rule banning
// <Loader2 /> outside button contexts. Used by lint-rule-loader2.test.ts to
// assert the rule fires. Do NOT add eslint-disable here — that would hide
// the very violation we're asserting.
import { Loader2 } from 'lucide-react';

export function BannedLoader() {
  return (
    <div>
      <Loader2 className="w-4 h-4 animate-spin" />
    </div>
  );
}
