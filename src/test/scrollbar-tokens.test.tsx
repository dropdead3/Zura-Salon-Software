import { describe, it, expect } from "vitest";
import { tokens } from "@/lib/design-tokens";
import { extractRuleBody, readIndexCss } from "@/test/css-rule";

describe("scrollbar token canon", () => {
  it("Radix ScrollArea thumb className uses muted-foreground + primary tokens", () => {
    // Single source of truth for every Radix scrollable surface
    expect(tokens.scrollbar.thumb).toContain("bg-muted-foreground/25");
    expect(tokens.scrollbar.thumb).toContain("hover:bg-muted-foreground/45");
    expect(tokens.scrollbar.thumb).toContain("active:bg-primary/50");
    // Guard against regression to the pre-Step-2E foreground family
    expect(tokens.scrollbar.thumb).not.toMatch(/\bbg-foreground\/\d+/);
    expect(tokens.scrollbar.thumb).not.toMatch(/hover:bg-foreground\/\d+/);
  });

  it(".scrollbar-thin hover rule resolves to --muted-foreground, not rgba literal", () => {
    const body = extractRuleBody(readIndexCss(), ".scrollbar-thin:hover::-webkit-scrollbar-thumb");
    expect(body).toBeTruthy();
    expect(body).toContain("--muted-foreground");
    expect(body).not.toMatch(/rgba\(\s*0,\s*0,\s*0/);
    expect(body).not.toMatch(/rgba\(\s*255,\s*255,\s*255/);
  });

  it(".scrollbar-minimal hover rule resolves to --muted-foreground, not rgba literal", () => {
    const body = extractRuleBody(readIndexCss(), ".scrollbar-minimal:hover::-webkit-scrollbar-thumb");
    expect(body).toBeTruthy();
    expect(body).toContain("--muted-foreground");
    expect(body).not.toMatch(/rgba\(\s*0,\s*0,\s*0/);
    expect(body).not.toMatch(/rgba\(\s*255,\s*255,\s*255/);
  });

  it(".scrollbar-minimal active state uses --primary token", () => {
    const body = extractRuleBody(readIndexCss(), ".scrollbar-minimal:hover::-webkit-scrollbar-thumb:active");
    expect(body).toBeTruthy();
    expect(body).toContain("--primary");
  });
});
