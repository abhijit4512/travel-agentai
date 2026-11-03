import { describe, expect, it } from "vitest";
import { parseBlocks } from "../components/Markdown";

describe("markdown blocks", () => {
  it("groups list items and keeps paragraphs", () => {
    const b = parseBlocks("Intro\n\n- one\n- two\n\n1. first\n2. second");
    expect(b.map((x) => x.type)).toEqual(["p", "ul", "ol"]);
    expect(b[1].lines).toEqual(["one", "two"]);
  });
  it("treats headings as their own block", () => {
    expect(parseBlocks("## Day 1\ntext")[0]).toEqual({ type: "h", lines: ["Day 1"] });
  });
});
