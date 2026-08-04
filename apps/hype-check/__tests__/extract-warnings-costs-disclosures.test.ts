import { describe, it, expect } from "vitest";
import { validateExtractionResponse } from "@/lib/ai/extract-warnings-costs-disclosures";

describe("validateExtractionResponse", () => {
  it("accepts a well-formed response with all three arrays populated", () => {
    const result = validateExtractionResponse({
      warningSigns: [
        { text: "Pressures viewers to buy before a countdown ends", severity: "HIGH" },
      ],
      costItems: [
        {
          label: "Monthly subscription",
          amount: "$49/mo",
          isHidden: true,
          notes: "Only mentioned in fine print",
        },
      ],
      disclosures: [
        { text: "Sponsored by the product's own manufacturer", detected: true },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.warningSigns).toHaveLength(1);
      expect(result.value.costItems[0]?.isHidden).toBe(true);
    }
  });

  it("accepts empty arrays for all three categories", () => {
    const result = validateExtractionResponse({
      warningSigns: [],
      costItems: [],
      disclosures: [],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a response with an invalid severity value", () => {
    const result = validateExtractionResponse({
      warningSigns: [{ text: "Something", severity: "EXTREME" }],
      costItems: [],
      disclosures: [],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a response missing a required field", () => {
    const result = validateExtractionResponse({
      warningSigns: [],
      costItems: [{ label: "Course fee", isHidden: false }],
      disclosures: [],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a non-object response", () => {
    const result = validateExtractionResponse("not an object");
    expect(result.ok).toBe(false);
  });
});
