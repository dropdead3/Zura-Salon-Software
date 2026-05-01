// ─────────────────────────────────────────────────────────────────────
// Canon completeness detector for the CustomEvent Ownership doctrine.
//
// The canon has 4 anchors per event:
//   1. defineEventOwnershipSelector(...) entry in CONSOLIDATED_RESTRICTED_SYNTAX
//      → already enforced by lint-helper-event-ownership-factory.test.ts
//   2. Sole-dispatcher owner module under src/lib/
//   3. Banned fixture under src/test/lint-fixtures/ that references the event
//   4. Resolution test assertion that the rule survives flat-config merging
//      → already enforced by lint-config-resolution.test.ts
//
// This file backfills mechanical enforcement for anchors (2) and (3) by
// walking every event-ownership entry and asserting the supporting files
// exist with the expected shape. Adding a new event via the factory now
// auto-extends this test — no second-place-to-edit hazard.
// ─────────────────────────────────────────────────────────────────────
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { CONSOLIDATED_RESTRICTED_SYNTAX } from "../../eslint.helpers.js";

const repoRoot = process.cwd();
const fixturesDir = path.resolve(repoRoot, "src/test/lint-fixtures");

interface OwnershipEntry {
  event: string;
  owner: string;
}

/**
 * Extract every event-ownership entry produced by
 * `defineEventOwnershipSelector(...)`. The factory's selector + message
 * shapes are stable (asserted in `lint-helper-event-ownership-factory.test.ts`),
 * so this regex-pair is safe.
 */
function extractOwnershipEntries(): OwnershipEntry[] {
  const out: OwnershipEntry[] = [];
  for (const entry of CONSOLIDATED_RESTRICTED_SYNTAX) {
    const sel = entry.selector;
    if (!sel.startsWith("NewExpression[callee.name='CustomEvent']")) continue;
    const eventMatch = sel.match(/Literal\[value='([^']+)'\]/);
    const ownerMatch = entry.message.match(
      /owned exclusively by (src\/[^\s.]+(?:\.ts|\.tsx))/,
    );
    if (!eventMatch || !ownerMatch) continue;
    out.push({ event: eventMatch[1], owner: ownerMatch[1] });
  }
  return out;
}

const ownershipEntries = extractOwnershipEntries();
const fixtureFiles = existsSync(fixturesDir)
  ? readdirSync(fixturesDir).map((f) => ({
      name: f,
      contents: readFileSync(path.join(fixturesDir, f), "utf8"),
    }))
  : [];

describe("CustomEvent Ownership canon — completeness detector", () => {
  it("discovers at least the two seeded ownership entries", () => {
    // Sanity — guards against the factory-extraction regex silently
    // matching nothing if `defineEventOwnershipSelector` ever changes
    // its message envelope.
    expect(ownershipEntries.length).toBeGreaterThanOrEqual(3);
    const events = ownershipEntries.map((e) => e.event);
    expect(events).toContain("site-settings-draft-write");
    expect(events).toContain("promo-popup-preview-reset");
    expect(events).toContain("promo-popup-preview-state");
  });

  describe.each(ownershipEntries)("event: $event", ({ event, owner }) => {
    const ownerPath = path.resolve(repoRoot, owner);
    const ownerExists = existsSync(ownerPath);
    const ownerSource = ownerExists ? readFileSync(ownerPath, "utf8") : "";

    it(`owner module exists at ${owner}`, () => {
      expect(
        ownerExists,
        `Canon violation: owner module declared in lint message does not exist on disk.\n` +
          `Event: ${event}\nDeclared owner: ${owner}\nResolved path: ${ownerPath}`,
      ).toBe(true);
    });

    it(`owner module references the event constant '${event}'`, () => {
      expect(
        ownerSource.includes(event),
        `Canon violation: owner ${owner} does not reference '${event}' as a string literal.\n` +
          `Either the owner is wrong (update defineEventOwnershipSelector message) or the event constant moved.`,
      ).toBe(true);
    });

    it(`owner module routes dispatches through dispatchOwnedEvent (no raw new CustomEvent)`, () => {
      // The typed helper centralizes the eslint-disable. If an owner ever
      // re-introduces `new CustomEvent('this-event', ...)` directly, the
      // canon's "one inline disable" guarantee is broken.
      const rawDispatchPattern = new RegExp(
        `new\\s+CustomEvent[\\s\\S]{0,200}?['"\`]${event.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}['"\`]`,
      );
      expect(
        rawDispatchPattern.test(ownerSource),
        `Canon violation: owner ${owner} dispatches '${event}' via raw \`new CustomEvent(...)\`.\n` +
          `Use \`dispatchOwnedEvent('${event}', detail)\` from @/lib/eventOwnership instead — it carries the single canonical eslint-disable.`,
      ).toBe(false);

      expect(
        ownerSource.includes("dispatchOwnedEvent"),
        `Canon violation: owner ${owner} declares ownership of '${event}' but never imports/calls dispatchOwnedEvent.\n` +
          `Replace inline window.dispatchEvent(new CustomEvent(...)) with dispatchOwnedEvent('${event}', detail).`,
      ).toBe(true);
    });

    it(`at least one banned fixture references '${event}'`, () => {
      const matchingFixtures = fixtureFiles.filter(
        (f) => f.name.endsWith("-banned.tsx") && f.contents.includes(event),
      );
      expect(
        matchingFixtures.length,
        `Canon violation: no banned fixture under src/test/lint-fixtures/ references '${event}'.\n` +
          `Add a fixture (e.g. ${event}-banned.tsx) that constructs \`new CustomEvent('${event}', ...)\` so the lint rule has something to flag.\n` +
          `Pair with a smoke test that runs ESLint on the fixture and asserts the violation count.`,
      ).toBeGreaterThan(0);
    });
  });
});
