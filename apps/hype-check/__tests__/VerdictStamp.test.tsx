import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VerdictStamp } from "@/components/ui/VerdictStamp";

describe("VerdictStamp", () => {
  it("renders nothing when there is no verdict", () => {
    const { container } = render(<VerdictStamp verdict={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when verdict is undefined", () => {
    const { container } = render(<VerdictStamp verdict={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the verdict label when a verdict is present", () => {
    render(<VerdictStamp verdict="LEGIT" />);
    expect(screen.getByText("LEGIT")).toBeInTheDocument();
  });

  it("renders every verdict type without throwing", () => {
    const verdicts = [
      "LEGIT",
      "MISLEADING",
      "OVERPRICED",
      "RISKY",
      "SCAM",
    ] as const;
    for (const verdict of verdicts) {
      const { unmount } = render(<VerdictStamp verdict={verdict} />);
      expect(screen.getByText(verdict)).toBeInTheDocument();
      unmount();
    }
  });

  it("applies larger text size when size='lg' is passed", () => {
    render(<VerdictStamp verdict="LEGIT" size="lg" />);
    expect(screen.getByText("LEGIT")).toHaveClass("text-base");
  });

  it("defaults to the small text size when size is omitted", () => {
    render(<VerdictStamp verdict="LEGIT" />);
    expect(screen.getByText("LEGIT")).toHaveClass("text-xs");
  });
});
