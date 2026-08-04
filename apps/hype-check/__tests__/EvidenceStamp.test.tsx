import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EvidenceStamp } from "@/components/ui/EvidenceStamp";

describe("EvidenceStamp", () => {
  it("renders nothing for NOT_CHECKED by default", () => {
    const { container } = render(<EvidenceStamp status="NOT_CHECKED" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders NOT_CHECKED when showNotChecked is true", () => {
    render(<EvidenceStamp status="NOT_CHECKED" showNotChecked />);
    expect(
      screen.getByText("Claim extracted — not yet reviewed")
    ).toBeInTheDocument();
  });

  it("renders every known evidence status without throwing", () => {
    const statuses = [
      "SUPPORTED",
      "MODERATE",
      "MIXED",
      "WEAK",
      "UNSUPPORTED",
    ];
    for (const status of statuses) {
      const { unmount } = render(<EvidenceStamp status={status} />);
      unmount();
    }
  });

  it("falls back to NOT_CHECKED styling for an unknown status", () => {
    render(<EvidenceStamp status="something-unexpected" showNotChecked />);
    expect(
      screen.getByText("Claim extracted — not yet reviewed")
    ).toBeInTheDocument();
  });

  it("uses the verdict-legit token for SUPPORTED", () => {
    render(<EvidenceStamp status="SUPPORTED" />);
    expect(screen.getByText(/strong evidence/)).toHaveClass(
      "border-verdict-legit"
    );
  });
});
