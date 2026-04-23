import { describe, it, expect, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import { ScrollArea } from "@/components/ui/scroll-area";
import { tokens } from "@/lib/design-tokens";
import { findCssRuleText } from "./scrollbar-tokens.fixtures";

// Load index.css into jsdom so we can inspect the utility rules
beforeAll(() => {
  const css = fs.readFileSync(path.resolve(__dirname, "../index.css"), "utf8");
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
});

describe("scrollbar token canon", () => {
  it("Radix ScrollArea thumb uses muted-foreground + primary tokens", () => {
    // The thumb classname is the single source of truth for Radix surfaces
    expect(tokens.scrollbar.thumb).toContain("bg-muted-foreground/25");
    expect(tokens.scrollbar.thumb).toContain("hover:bg-muted-foreground/45");
    expect(tokens.scrollbar.thumb).toContain("active:bg-primary/50");
    // Guard against regression to the pre-Step-2E foreground family
    expect(tokens.scrollbar.thumb).not.toMatch(/bg-foreground\/\d+/);

    // Smoke: component renders with the canonical classes applied
    const { container } = render(
      <ScrollArea className="h-32 w-32">
        <div style={{ height: 500 }}>tall</div>
      </ScrollArea>,
    );
    const thumb = container.querySelector('[data-radix-scroll-area-thumb], [class*="bg-muted-foreground"]');
    expect(thumb).toBeTruthy();
  });

  it(".scrollbar-thin hover rules resolve to --muted-foreground", () => {
    const hover = findCssRuleText(".scrollbar-thin:hover::-webkit-scrollbar-thumb");
    expect(hover).toBeTruthy();
    expect(hover).toContain("--muted-foreground");
    expect(hover).not.toMatch(/rgba\(0,\s*0,\s*0/);
  });

  it(".scrollbar-minimal hover rules resolve to --muted-foreground", () => {
    const hover = findCssRuleText(".scrollbar-minimal:hover::-webkit-scrollbar-thumb");
    expect(hover).toBeTruthy();
    expect(hover).toContain("--muted-foreground");
    expect(hover).not.toMatch(/rgba\(0,\s*0,\s*0/);
  });
});
