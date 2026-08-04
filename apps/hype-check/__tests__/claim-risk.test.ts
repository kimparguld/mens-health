import { describe, it, expect } from "vitest";
import { classifyDeterministicRisk } from "@/lib/ai/claim-risk";

describe("classifyDeterministicRisk", () => {
  it("floors risk to HIGH for high-risk categories regardless of LLM suggestion", () => {
    expect(
      classifyDeterministicRisk(
        "SAFETY",
        "LOW",
        "This supplement is completely safe with no side effects",
      ),
    ).toBe("HIGH");
    expect(
      classifyDeterministicRisk("LEGITIMACY", "LOW", "This is a real, registered company"),
    ).toBe("HIGH");
    expect(classifyDeterministicRisk("REGULATION", "MEDIUM", "SEC-approved investment")).toBe(
      "HIGH",
    );
  });

  it("never de-escalates below the category floor", () => {
    expect(
      classifyDeterministicRisk("GUARANTEE", "LOW", "Guaranteed 40% monthly returns"),
    ).toBe("HIGH");
  });

  it("respects the LLM's own risk suggestion when it's above the category floor", () => {
    expect(
      classifyDeterministicRisk("PERFORMANCE", "MEDIUM", "This product is twice as fast"),
    ).toBe("MEDIUM");
  });

  it("keeps low-risk categories at LOW when nothing escalates them", () => {
    expect(
      classifyDeterministicRisk("POPULARITY", "LOW", "Thousands of happy customers"),
    ).toBe("LOW");
  });

  it("escalates via keyword safety net even when category is miscategorized", () => {
    expect(
      classifyDeterministicRisk(
        "OTHER",
        "LOW",
        "This crypto app offers guaranteed returns",
      ),
    ).toBe("HIGH");
    expect(
      classifyDeterministicRisk(
        "OTHER",
        "LOW",
        "Signs this side hustle is a pyramid scheme",
      ),
    ).toBe("HIGH");
  });
});
