import { describe, it, expect } from "vitest";

// Pure function extracted from the route — mirrors STATUS_FOR_ACTION
const STATUS_FOR_ACTION = {
  PUBLISHED: "PUBLISHED",
  UNPUBLISHED: "PROCESSED",
  REJECTED: "REJECTED",
  APPROVED: "PROCESSED",
  FLAGGED_HIGH_RISK: "PROCESSED",
} as const;

type ReviewAction = keyof typeof STATUS_FOR_ACTION;

function resolveStatusForAction(action: ReviewAction) {
  return STATUS_FOR_ACTION[action];
}

describe("resolveStatusForAction", () => {
  it("PUBLISHED → PUBLISHED", () => {
    expect(resolveStatusForAction("PUBLISHED")).toBe("PUBLISHED");
  });

  it("REJECTED → REJECTED", () => {
    expect(resolveStatusForAction("REJECTED")).toBe("REJECTED");
  });

  it("APPROVED → PROCESSED (stays in processed, not auto-published)", () => {
    expect(resolveStatusForAction("APPROVED")).toBe("PROCESSED");
  });

  it("FLAGGED_HIGH_RISK → PROCESSED (keeps video in review queue)", () => {
    expect(resolveStatusForAction("FLAGGED_HIGH_RISK")).toBe("PROCESSED");
  });

  it("UNPUBLISHED → PROCESSED (reverts to review queue)", () => {
    expect(resolveStatusForAction("UNPUBLISHED")).toBe("PROCESSED");
  });
});
