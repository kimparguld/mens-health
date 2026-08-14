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
        postId="clh2p7x8k00001a8k8b4z5z0z"
        platform="X"
        status="FAILED"
        riskLevel="LOW"
        requiresReview={false}
        caption="Test caption"
      />,
    );

    expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
  });
});
