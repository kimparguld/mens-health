import { describe, it, expect } from "vitest";
import { decideAutoPublishStatus } from "@/lib/videos/decide-auto-publish-status";

describe("decideAutoPublishStatus", () => {
  it("holds for review when claim extraction failed, even if the gate says eligible", () => {
    expect(decideAutoPublishStatus(true, true)).toBe("PROCESSED");
  });

  it("publishes when claim extraction succeeded and the gate says eligible", () => {
    expect(decideAutoPublishStatus(false, true)).toBe("PUBLISHED");
  });

  it("holds for review when claim extraction succeeded but the gate says ineligible", () => {
    expect(decideAutoPublishStatus(false, false)).toBe("PROCESSED");
  });
});
