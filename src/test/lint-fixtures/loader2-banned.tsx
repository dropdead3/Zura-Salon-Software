/* eslint-disable */
// LINT FIXTURE — DO NOT IMPORT.
// This file intentionally violates the no-restricted-syntax rule banning
// <Loader2 /> outside button contexts. Used by lint-rule-loader2.test.ts to
// assert the rule fires. The outer eslint-disable here is a no-op for our
// targeted programmatic lint run, which only enables the one rule we test.
import { Loader2 } from 'lucide-react';

export function BannedLoader() {
  return (
    <div>
      <Loader2 className="w-4 h-4 animate-spin" />
    </div>
  );
}
