import { describe, it, expect } from "vitest";
import { parseParagraphCitations } from "@/lib/seo/topic-content";

describe("parseParagraphCitations", () => {
  it("returns a single text token for prose with no citation markers", () => {
    expect(parseParagraphCitations("No markers here.")).toEqual([
      { type: "text", value: "No markers here." },
    ]);
  });

  it("splits text around a single citation marker", () => {
    expect(parseParagraphCitations("Levels decline [1] with age.")).toEqual([
      { type: "text", value: "Levels decline " },
      { type: "citation", index: 0 },
      { type: "text", value: " with age." },
    ]);
  });

  it("handles multiple citation markers with correct 0-based indices", () => {
    expect(parseParagraphCitations("First [1] then [2] then [3].")).toEqual([
      { type: "text", value: "First " },
      { type: "citation", index: 0 },
      { type: "text", value: " then " },
      { type: "citation", index: 1 },
      { type: "text", value: " then " },
      { type: "citation", index: 2 },
      { type: "text", value: "." },
    ]);
  });

  it("handles a marker at the very start or end of the string", () => {
    expect(parseParagraphCitations("[1] Leads the sentence.")).toEqual([
      { type: "citation", index: 0 },
      { type: "text", value: " Leads the sentence." },
    ]);
    expect(parseParagraphCitations("Ends the sentence [2]")).toEqual([
      { type: "text", value: "Ends the sentence " },
      { type: "citation", index: 1 },
    ]);
  });
});
