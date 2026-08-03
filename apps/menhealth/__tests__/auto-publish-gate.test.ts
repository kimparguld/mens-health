import { describe, it, expect } from "vitest";
import { isEligibleForAutoPublish } from "@/lib/publishing/auto-publish-gate";

const CLEAN_CLAIM = {
  evidenceStatus: "SUPPORTED" as const,
  autoReviewed: true,
  humanConfirmedAt: null,
};

const UNCONFIRMED_MEDIUM_CLAIM = {
  evidenceStatus: "MIXED" as const,
  autoReviewed: false,
  humanConfirmedAt: null,
};

const CONFIRMED_CLAIM = {
  evidenceStatus: "MIXED" as const,
  autoReviewed: false,
  humanConfirmedAt: new Date(),
};

const UNSUPPORTED_CLAIM = {
  evidenceStatus: "UNSUPPORTED" as const,
  autoReviewed: true,
  humanConfirmedAt: null,
};

const NOT_CHECKED_CLAIM = {
  evidenceStatus: "NOT_CHECKED" as const,
  autoReviewed: false,
  humanConfirmedAt: null,
};

describe("isEligibleForAutoPublish", () => {
  it("never allows HIGH risk, regardless of claim state", () => {
    expect(isEligibleForAutoPublish({ riskLevel: "HIGH" }, [])).toBe(false);
    expect(
      isEligibleForAutoPublish({ riskLevel: "HIGH" }, [CLEAN_CLAIM]),
    ).toBe(false);
  });

  it("allows LOW risk with all-clean claims", () => {
    expect(
      isEligibleForAutoPublish({ riskLevel: "LOW" }, [CLEAN_CLAIM]),
    ).toBe(true);
  });

  it("allows LOW risk with zero claims (vacuous pass)", () => {
    expect(isEligibleForAutoPublish({ riskLevel: "LOW" }, [])).toBe(true);
  });

  it("blocks LOW risk if any claim is unsupported", () => {
    expect(
      isEligibleForAutoPublish({ riskLevel: "LOW" }, [
        CLEAN_CLAIM,
        UNSUPPORTED_CLAIM,
      ]),
    ).toBe(false);
  });

  it("blocks LOW risk if any claim is still not checked", () => {
    expect(
      isEligibleForAutoPublish({ riskLevel: "LOW" }, [NOT_CHECKED_CLAIM]),
    ).toBe(false);
  });

  it("blocks MEDIUM risk if a claim's AI verdict hasn't been confirmed", () => {
    expect(
      isEligibleForAutoPublish({ riskLevel: "MEDIUM" }, [
        UNCONFIRMED_MEDIUM_CLAIM,
      ]),
    ).toBe(false);
  });

  it("allows MEDIUM risk once every claim is confirmed", () => {
    expect(
      isEligibleForAutoPublish({ riskLevel: "MEDIUM" }, [CONFIRMED_CLAIM]),
    ).toBe(true);
  });
});
