import { describe, expect, it } from "vitest";
import { formatInr, stripMarkdown } from "./text";

describe("text helpers", () => {
  it("removes markdown before speaking", () => {
    expect(stripMarkdown("**Day 1:** see [Munnar](http://x.y)")).toBe("Day 1: see Munnar");
  });
  it("formats rupees with Indian grouping", () => {
    expect(formatInr(125000)).toBe("₹1,25,000");
  });
});
