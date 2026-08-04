import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VerdictHero } from "@/components/ui/VerdictHero";

describe("VerdictHero", () => {
  it("shows a neutral message when there is no verdict", () => {
    render(<VerdictHero verdict={null} rationale={null} />);
    expect(screen.getByText("Not yet verdicted")).toBeInTheDocument();
  });

  it("renders the verdict stamp and rationale when both are present", () => {
    render(
      <VerdictHero
        verdict="MISLEADING"
        rationale="The claim overstates results seen in the video."
      />
    );
    expect(screen.getByText("MISLEADING")).toBeInTheDocument();
    expect(
      screen.getByText("The claim overstates results seen in the video.")
    ).toBeInTheDocument();
  });

  it("renders the verdict stamp without a rationale paragraph when rationale is missing", () => {
    render(<VerdictHero verdict="LEGIT" rationale={null} />);
    expect(screen.getByText("LEGIT")).toBeInTheDocument();
    expect(screen.queryByText("Not yet verdicted")).not.toBeInTheDocument();
  });
});
