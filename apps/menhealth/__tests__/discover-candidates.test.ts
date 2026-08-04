import { describe, it, expect } from "vitest";
import { validateCandidatesResponse } from "@/lib/topics/discover-candidates";

describe("validateCandidatesResponse", () => {
  it("accepts a well-formed candidate array", () => {
    const raw = [
      {
        slug: "grip-strength",
        name: "Grip Strength",
        query: "grip strength training",
        description: "Grip strength training and testing.",
      },
    ];
    const result = validateCandidatesResponse(raw);
    expect(result.ok).toBe(true);
  });

  it("rejects a non-kebab-case slug", () => {
    const raw = [
      {
        slug: "Grip Strength",
        name: "Grip Strength",
        query: "grip strength training",
        description: "Grip strength training and testing.",
      },
    ];
    const result = validateCandidatesResponse(raw);
    expect(result.ok).toBe(false);
  });

  it("rejects more than 5 candidates", () => {
    const raw = Array.from({ length: 6 }, (_, i) => ({
      slug: `topic-${i}`,
      name: `Topic ${i}`,
      query: `topic ${i} query`,
      description: `Description ${i}`,
    }));
    const result = validateCandidatesResponse(raw);
    expect(result.ok).toBe(false);
  });

  it("rejects non-array input", () => {
    const result = validateCandidatesResponse({ not: "an array" });
    expect(result.ok).toBe(false);
  });
});
