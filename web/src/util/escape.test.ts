import { describe, expect, it } from "vitest";
import { escapeAttr, escapeHtml } from "./escape";

describe("escapeHtml", () => {
  it("escapes special characters", () => {
    expect(escapeHtml(`a & b < c > d "e"`)).toBe(
      "a &amp; b &lt; c &gt; d &quot;e&quot;",
    );
  });
});

describe("escapeAttr", () => {
  it("escapes attribute-sensitive characters", () => {
    expect(escapeAttr(`x & y "z"`)).toBe("x &amp; y &quot;z&quot;");
  });
});
