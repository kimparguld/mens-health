import { describe, it, expect } from "vitest";

// Pure function extracted from the route — mirrors STATUS_FOR_ACTION
const STATUS_FOR_ACTION = {
  PUBLISHED: "PUBLISHED",
  UNPUBLISHED: "REVIEW",
  REJECTED: "ARCHIVED",
  APPROVED: "REVIEW",
  FLAGGED_HIGH_RISK: "REVIEW",
} as const;

type ReviewAction = keyof typeof STATUS_FOR_ACTION;

function resolveStatusForAction(action: ReviewAction) {
  return STATUS_FOR_ACTION[action];
}

describe("resolveStatusForAction", () => {
  it("PUBLISHED → PUBLISHED", () => {
    expect(resolveStatusForAction("PUBLISHED")).toBe("PUBLISHED");
  });

  it("REJECTED → ARCHIVED", () => {
    expect(resolveStatusForAction("REJECTED")).toBe("ARCHIVED");
  });

  it("APPROVED → REVIEW (stays in review, not auto-published)", () => {
    expect(resolveStatusForAction("APPROVED")).toBe("REVIEW");
  });

  it("FLAGGED_HIGH_RISK → REVIEW (keeps video in review queue)", () => {
    expect(resolveStatusForAction("FLAGGED_HIGH_RISK")).toBe("REVIEW");
  });

  it("UNPUBLISHED → REVIEW (reverts to review queue)", () => {
    expect(resolveStatusForAction("UNPUBLISHED")).toBe("REVIEW");
  });
});
