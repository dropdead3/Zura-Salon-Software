/* eslint-disable */
// LINT FIXTURE — DO NOT IMPORT.
// All <Loader2 /> usages here are inside button contexts and should pass
// the no-restricted-syntax rule. Used by lint-rule-loader2.test.ts.
import { Loader2 } from 'lucide-react';

function Button({ children }: { children: React.ReactNode }) {
  return <button>{children}</button>;
}

function MyIconButton({ children }: { children: React.ReactNode }) {
  return <button>{children}</button>;
}

export function AllowedInsideButton() {
  return (
    <Button>
      <Loader2 className="w-4 h-4 animate-spin" />
    </Button>
  );
}

export function AllowedInsideNativeButton() {
  return (
    <button>
      <Loader2 className="w-4 h-4 animate-spin" />
    </button>
  );
}

export function AllowedInsideIconButton() {
  return (
    <MyIconButton>
      <Loader2 className="w-4 h-4 animate-spin" />
    </MyIconButton>
  );
}
