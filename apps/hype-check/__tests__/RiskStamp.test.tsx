import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RiskStamp } from "@/components/ui/RiskStamp";

describe("RiskStamp", () => {
  it("renders every known risk level without throwing", () => {
    for (const level of ["LOW", "MEDIUM", "HIGH"]) {
      const { unmount } = render(<RiskStamp level={level} />);
      unmount();
    }
  });

  it("falls back to LOW styling for an unknown level", () => {
    render(<RiskStamp level="something-unexpected" />);
    expect(screen.getByText("Low risk")).toBeInTheDocument();
  });

  it("uses the verdict-risky token for HIGH", () => {
    render(<RiskStamp level="HIGH" />);
    expect(screen.getByText("High risk")).toHaveClass("border-verdict-risky");
  });

  it("uses the verdict-misleading token for MEDIUM", () => {
    render(<RiskStamp level="MEDIUM" />);
    expect(screen.getByText("Medium risk")).toHaveClass(
      "border-verdict-misleading"
    );
  });
});
