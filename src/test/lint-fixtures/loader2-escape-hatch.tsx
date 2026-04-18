// LINT FIXTURE — DO NOT IMPORT.
// Verifies the documented escape hatch (`// eslint-disable-next-line
// no-restricted-syntax`) actually silences the Loader2 ban as advertised.
// Uses ONLY the inline directive — no file-level disable — so the test
// asserts the inline form specifically. If this fixture starts producing
// no-restricted-syntax errors, the escape hatch is broken and the doctrine's
// stated override is a lie.
import { Loader2 } from 'lucide-react';

export function EscapeHatchLoader() {
  return (
    <div>
      {/* eslint-disable-next-line no-restricted-syntax -- TEST: verify inline override works */}
      <Loader2 className="w-4 h-4 animate-spin" />
    </div>
  );
}
