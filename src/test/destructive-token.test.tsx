import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { readIndexCss } from "@/test/css-rule";

/**
 * Destructive-token canon. `--destructive` is cross-cutting: every one of the
 * 13 themes redefines it. A single raw hex (`color: #dc2626`) in a rule that
 * mentions "destructive" would make destructive surfaces theme-blind — red in
 * one palette, invisible in another. These assertions lock that down.
 */
describe("destructive token canon", () => {
  it("no raw hex or rgba literal on a line mentioning 'destructive' in index.css", () => {
    const css = readIndexCss();
    // Same-line guard: catches `/* destructive */ color: #dc2626;` style bypasses.
    const hexOnDestructiveLine = /destructive[^\n;]*#[0-9a-fA-F]{3,8}\b/;
    const rgbaOnDestructiveLine = /destructive[^\n;]*\brgba?\(\s*\d/;
    expect(css).not.toMatch(hexOnDestructiveLine);
    expect(css).not.toMatch(rgbaOnDestructiveLine);
  });

  it("every --destructive declaration sits in a token-definition selector", () => {
    const css = readIndexCss();
    // Walk each line containing `--destructive:` and check the nearest preceding
    // rule selector. Allowed: :root, .dark, or [data-theme=...] variants.
    const lines = css.split("\n");
    const allowedSelectorRe = /(:root|\.dark|\[data-theme|\.theme-)/;
    const selectorRe = /^(\s*)([^\n{}]+)\{\s*$/;

    const violations: { line: number; selector: string }[] = [];
    let currentSelector = "";
    lines.forEach((line, idx) => {
      const m = line.match(selectorRe);
      if (m) currentSelector = m[2].trim();
      if (/--destructive(-foreground)?\s*:/.test(line)) {
        if (!allowedSelectorRe.test(currentSelector)) {
          violations.push({ line: idx + 1, selector: currentSelector });
        }
      }
    });
    expect(violations, `--destructive declared outside token block:\n${JSON.stringify(violations, null, 2)}`).toEqual([]);
  });

  it("tailwind.config.ts routes destructive through hsl(var(--destructive*))", () => {
    const configPath = path.resolve(__dirname, "..", "..", "tailwind.config.ts");
    const config = fs.readFileSync(configPath, "utf8");
    // Find the destructive block and assert both DEFAULT + foreground resolve via HSL tokens.
    const destructiveBlockRe = /destructive\s*:\s*\{[^}]*\}/;
    const block = config.match(destructiveBlockRe)?.[0];
    expect(block, "destructive block missing from tailwind.config.ts").toBeTruthy();
    expect(block!).toContain("hsl(var(--destructive))");
    expect(block!).toContain("hsl(var(--destructive-foreground))");
    // Guard against regression to raw literals inside the block.
    expect(block!).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(block!).not.toMatch(/\brgba?\(\s*\d/);
  });
});
