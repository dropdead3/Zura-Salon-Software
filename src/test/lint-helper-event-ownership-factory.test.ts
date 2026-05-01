// ─────────────────────────────────────────────────────────────────────
// Locks the CustomEvent Ownership canon factory:
//   1. Every event-ownership entry in CONSOLIDATED_RESTRICTED_SYNTAX must
//      be produced by `defineEventOwnershipSelector(...)`. Raw
//      `NewExpression[callee.name='CustomEvent']` selector literals in
//      eslint.helpers.js are banned — the factory standardizes the message
//      shape and prevents copy-paste drift across event doctrines.
//   2. The factory itself produces the same selector + message envelope
//      that the existing site-settings-draft-write / promo-popup-preview-*
//      lint rules already assert against. Catches accidental rewording.
//
// Pairs with: src/lib/siteSettingsDraft.ts, src/lib/promoPopupPreviewReset.ts,
//             src/test/lint-rule-site-settings-event.test.ts,
//             src/test/lint-rule-promo-popup-events.test.ts.
// ─────────────────────────────────────────────────────────────────────
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  CONSOLIDATED_RESTRICTED_SYNTAX,
  defineEventOwnershipSelector,
} from "../../eslint.helpers.js";

const helpersSource = readFileSync(
  path.resolve(process.cwd(), "eslint.helpers.js"),
  "utf8",
);

describe("CustomEvent Ownership canon — factory enforcement", () => {
  it("factory produces the canonical selector + message envelope", () => {
    const entry = defineEventOwnershipSelector({
      event: "test-event",
      owner: "src/lib/testOwner.ts",
      dispatcher: "dispatchTest()",
      rationale: "centralizes payload shape",
    });
    expect(entry.selector).toBe(
      "NewExpression[callee.name='CustomEvent']:has(Literal[value='test-event'])",
    );
    expect(entry.message).toContain("`test-event`");
    expect(entry.message).toContain("src/lib/testOwner.ts");
    expect(entry.message).toContain("dispatchTest()");
    expect(entry.message).toContain("centralizes payload shape");
  });

  it("requires { event, owner }", () => {
    expect(() => defineEventOwnershipSelector({ event: "x" } as never)).toThrow();
    expect(() => defineEventOwnershipSelector({ owner: "y" } as never)).toThrow();
  });

  it("every event-ownership selector in CONSOLIDATED_RESTRICTED_SYNTAX matches the factory shape", () => {
    const eventEntries = CONSOLIDATED_RESTRICTED_SYNTAX.filter((e) =>
      e.selector.startsWith("NewExpression[callee.name='CustomEvent']"),
    );
    expect(eventEntries.length).toBeGreaterThanOrEqual(3);
    for (const entry of eventEntries) {
      // Selector must use the exact factory shape (single Literal[value='...']).
      expect(entry.selector).toMatch(
        /^NewExpression\[callee\.name='CustomEvent'\]:has\(Literal\[value='[^']+'\]\)$/,
      );
      // Message must follow the factory envelope.
      expect(entry.message).toMatch(/event is owned exclusively by/);
    }
  });

  it("eslint.helpers.js does not inline raw CustomEvent ownership selectors as object literals", () => {
    // The factory is the sole producer of NewExpression[callee.name='CustomEvent']
    // selector strings inside CONSOLIDATED_RESTRICTED_SYNTAX. The only allowed
    // occurrences in helpers source are: (a) the factory body, (b) this rule's
    // own docstring. Any object literal of the form `{ selector: "NewExpression
    // [callee.name='CustomEvent']..." }` would mean the factory was bypassed.
    const objectLiteralPattern =
      /\{\s*selector:\s*["']NewExpression\[callee\.name='CustomEvent'\]/g;
    const matches = helpersSource.match(objectLiteralPattern) ?? [];
    expect(
      matches.length,
      `Found ${matches.length} raw event-ownership object literal(s) in eslint.helpers.js. Use defineEventOwnershipSelector({ event, owner, ... }) instead.`,
    ).toBe(0);
  });
});
