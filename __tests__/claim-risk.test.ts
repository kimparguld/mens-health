import { describe, it, expect } from "vitest";
import { classifyDeterministicRisk } from "@/lib/ai/claim-risk";

describe("classifyDeterministicRisk", () => {
  it("floors risk to HIGH for high-risk categories regardless of LLM suggestion", () => {
    expect(
      classifyDeterministicRisk("HORMONES", "LOW", "TRT can help you feel better"),
    ).toBe("HIGH");
    expect(
      classifyDeterministicRisk("MEDICATIONS", "LOW", "Take this daily"),
    ).toBe("HIGH");
    expect(classifyDeterministicRisk("CANCER", "MEDIUM", "May help")).toBe(
      "HIGH",
    );
  });

  it("never de-escalates below the category floor", () => {
    expect(
      classifyDeterministicRisk("SUPPLEMENTS", "LOW", "Vitamin D helps sleep"),
    ).toBe("HIGH");
  });

  it("respects the LLM's own risk suggestion when it's above the category floor", () => {
    expect(
      classifyDeterministicRisk("NUTRITION", "MEDIUM", "Eat more protein"),
    ).toBe("MEDIUM");
  });

  it("keeps low-risk categories at LOW when nothing escalates them", () => {
    expect(
      classifyDeterministicRisk("EXERCISE", "LOW", "Walk 30 minutes a day"),
    ).toBe("LOW");
  });

  it("escalates via keyword safety net even when category is miscategorized", () => {
    expect(
      classifyDeterministicRisk(
        "OTHER",
        "LOW",
        "Boost your testosterone naturally",
      ),
    ).toBe("HIGH");
    expect(
      classifyDeterministicRisk(
        "OTHER",
        "LOW",
        "Signs of prostate cancer to watch for",
      ),
    ).toBe("HIGH");
  });
});
