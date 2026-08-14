import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import DraftActions from "@/app/admin/(protected)/social/drafts/[id]/DraftActions";

describe("DraftActions — FAILED status recovery", () => {
  it("shows an Approve button for a FAILED post so a failed publish attempt isn't a dead end", () => {
    render(
      <DraftActions
        postId="post_1"
        platform="TIKTOK"
        status="FAILED"
        riskLevel="LOW"
        requiresReview={false}
        caption="Test caption"
      />,
    );

    expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
  });
});
